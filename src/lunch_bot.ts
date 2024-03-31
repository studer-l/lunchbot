import { readConfigFromEnv } from './config';
import { mkDatabase } from './database/database';
import { mkZulip } from './zulip/zulip_impl';
import { Database } from './database/database';
import logger from './logger';
import { ReactionQueue, Zulip } from './zulip/zulip';
import {
  ControlMessage,
  Reaction,
  SetCreditCardMessage,
} from './control_message';
import { handleAnnounceRequest } from './handlers/announce';
import { handleOrganizeRequest } from './handlers/organize';
import { handleHistoryInsert } from './handlers/history';
import { handleFixup } from './handlers/fixup';
import { mkAnnounceTopic } from './chatting';
import { getNextDayAfterLunchDate, getNextLunchDate } from './date_utils';
import { handleReaction } from './handlers/reaction';
import { delay, Poller, PollItem } from './poller';
import { differenceInMilliseconds, isEqual } from 'date-fns';

export class LunchBot {
  private readonly announceStream: string;
  private readonly zulip: Zulip;
  private readonly database: Database;
  private reactionQueue: ReactionQueue | null;
  private poller: Poller<ControlMessage>;

  constructor(
    announceStream: string,
    zulip: Zulip,
    database: Database,
    reactionQueue: ReactionQueue | null,
  ) {
    this.announceStream = announceStream;
    this.zulip = zulip;
    this.database = database;
    this.reactionQueue = reactionQueue;
    this.poller = new Poller<ControlMessage>();
  }

  private async handleSetCC(msg: SetCreditCardMessage): Promise<void> {
    const { email, hasCreditCard } = msg;
    // ensure this user exists
    try {
      await this.zulip.getUserNameByEmail(email);
    } catch (err) {
      if (err instanceof Error) {
        await this.zulip.error(err);
      } else {
        await this.zulip.failed(`unknown error ${err}`);
      }
      return;
    }
    return await this.database
      .withTransaction(async (db) => {
        await db.ensureUser(email);
        await db.setUserCC(email, hasCreditCard);
        await this.zulip.success(
          `set ${email} has_credit_card to ${hasCreditCard}`,
        );
      })
      .catch(async (err) => await this.zulip.error(err));
  }

  private async handleAnnounceRequest(): Promise<void> {
    await this.database
      .withTransaction(async (db) => {
        return await handleAnnounceRequest(db, this.zulip, this.announceStream);
      })
      .then(
        async (date) => {
          await this.reactionQueue?.close();
          const topic = mkAnnounceTopic(date);
          this.reactionQueue = await this.zulip.mkReactionQueue(topic);
        },
        async (err) => await this.zulip.error(err),
      );
  }

  private async handleOrganizeRequest(): Promise<void> {
    logger.info('handleOrganizeRequest; opening transaction...');
    await this.database
      .withTransaction(async (db) => {
        await handleOrganizeRequest(db, this.zulip, this.announceStream);
      })
      .catch(async (err) => await this.zulip.error(err));
  }

  private async handleHistoryInsert(
    date: Date,
    groups: readonly (readonly string[])[],
  ): Promise<void> {
    await this.database.withTransaction(async (db) =>
      handleHistoryInsert(db, this.zulip, date, groups),
    );
  }

  private async handleFixup(announcementMessageId: number) {
    await this.database.withTransaction(async (db) =>
      handleFixup(db, this.zulip, announcementMessageId),
    );
  }

  private async handleReaction(reaction: Reaction) {
    await this.database.withTransaction(async (db) =>
      handleReaction(db, this.zulip, reaction),
    );
  }

  private async updateMrlpWithLatestLunch() {
    await this.database.withTransaction(async (db) => {
      const mrlp = await db.readMostRecentLunchPairing();
      const lunchDate = await db.getLatestLunchDate();
      if (lunchDate === null) {
        // no prior lunch
        return;
      }
      const mrlpDate = mrlp.maxDate();
      if (mrlpDate == null || !isEqual(mrlpDate, lunchDate)) {
        logger.info('updating most recent lunch pairing cache', {
          lunchDate,
          mrlpDate,
        });
        const organizedLunch = await db.getAttendance(lunchDate);
        mrlp.updateAssignment(organizedLunch, lunchDate);
        await db.writeMostRecentLunchPairing(mrlp);
        await this.zulip.success('updated most recent lunch pairing cache');
      }
    });
  }

  private async handleLunchExpired() {
    if (this.reactionQueue === null) {
      throw new Error('handleLunchExpired: reactionQueue is null');
    }
    await this.reactionQueue.close();
    this.reactionQueue = null;
    this.poller.pop();
    if (this.poller.length() != 1) {
      throw new Error(
        `bad poller state after lunch expired, length = ${this.poller.length()}`,
      );
    }
    await this.updateMrlpWithLatestLunch();
  }

  async handleControlMessage(msg: ControlMessage): Promise<void> {
    logger.debug('handling ControlMessage', msg);
    switch (msg.messageType) {
      case 'SetCreditCardMessage':
        return await this.handleSetCC(msg);
      case 'AnnounceRequestMessage':
        return await this.handleAnnounceRequest();
      case 'OrganizeRequestMessage':
        return await this.handleOrganizeRequest();
      case 'ReactionMessage':
        return await this.handleReaction(msg.reaction);
      case 'HistoryInsertMessage':
        return await this.handleHistoryInsert(msg.date, msg.groups);
      case 'FixupMessage':
        return await this.handleFixup(msg.messageId);
      case 'LunchExpiredMessage':
        return await this.handleLunchExpired();
      case 'BadMessage':
        return await this.zulip.failed(msg.errorMessage);
    }
  }

  controlPollItem(
    gen: AsyncGenerator<ControlMessage>,
  ): PollItem<ControlMessage> {
    return new PollItem(async () => {
      return gen.next().then(async (controlMessage) => {
        logger.debug('new direct message', controlMessage);
        if (controlMessage.done) {
          logger.error('control messages exhausted, but how?');
          await this.zulip.failed('control message loop exhausted');
          throw new Error('control message loop exhausted');
        }
        return controlMessage.value;
      });
    });
  }

  async run(): Promise<void> {
    // handle case where lunch bot crashed before updating cache
    if (this.reactionQueue === null) {
      logger.debug('house-keeping: possibly update cache');
      await this.updateMrlpWithLatestLunch();
    }

    logger.debug('starting control loop');
    const controlMessageGen = this.zulip.controlMessage();
    this.poller.push(this.controlPollItem(controlMessageGen));
    for (;;) {
      // if no reaction loop, poller is just waiting for a control message
      if (this.poller.length() === 1 && this.reactionQueue) {
        logger.debug('adding reaction queue to poller');
        const queuePollItem = new PollItem(() => {
          return this.reactionQueue!.next();
        });
        this.poller.push(queuePollItem);

        // also register action to remove this queue again
        const deadline = getNextDayAfterLunchDate();
        const now = new Date();
        const diffMs = differenceInMilliseconds(deadline, now);
        const deregisterTask = delay<ControlMessage>(diffMs, {
          messageType: 'LunchExpiredMessage',
        });
        this.poller.push(deregisterTask);
      }
      const msg = await this.poller.poll();
      await this.handleControlMessage(msg);
      logger.debug('message handled, recur');
    }
  }
}

/** Create a reaction queue if there exists an active lunch topic */
export async function mkInitialReactionQueue(
  database: Database,
  zulip: Zulip,
): Promise<ReactionQueue | null> {
  logger.info('checking whether lunch is already scheduled');
  const wednesday = getNextLunchDate();
  const hasLunch = await database.hasLunch(wednesday);
  logger.info('hasLunch: ', { wednesday, hasLunch });
  if (hasLunch) {
    // if the above doesn't throw, there is a topic
    logger.info('lunch topic is already active, creating queue');
    const topic = mkAnnounceTopic(wednesday);
    return await zulip.mkReactionQueue(topic);
  }
  return null;
}

export async function mkLunchBot(): Promise<LunchBot> {
  logger.info('creating lunch bot');
  logger.debug('reading env config');
  const config = readConfigFromEnv();
  logger.debug('creating zulip client');
  const zulip = await mkZulip(config);

  logger.debug('connecting to database');
  const database = await mkDatabase(config.dbUrl);
  const reactionQueue = await mkInitialReactionQueue(database, zulip);
  logger.debug('assembling lunch bot');
  return new LunchBot(config.announceStream, zulip, database, reactionQueue);
}

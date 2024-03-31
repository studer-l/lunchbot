/* eslint @typescript-eslint/no-explicit-any: off */

import logger from '../logger';
import { ZulipResources } from 'zulip-js';
import { ReactionQueue } from './zulip';
import { checkZulipResult, ZulipResponse } from './zulip_impl';
import { ControlMessage, Reaction } from '../control_message';

function addTimeout<A>(
  promise: Promise<A>,
  millisecs: number,
  message: string,
): Promise<A> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      logger.error(message);
      reject(new Error(message));
    }, millisecs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason: Error) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}

export class ReactionQueueImpl extends ReactionQueue {
  private readonly zulip: ZulipResources;
  private readonly botEmail: string;
  private readonly queueId: string;
  private lastEventId: number;
  private pendingReactions: Reaction[];
  private pendingEvent: Promise<any> | null;

  constructor(
    zulip: ZulipResources,
    botEmail: string,
    queueId: string,
    lastEventId: number,
  ) {
    super();
    this.zulip = zulip;
    this.botEmail = botEmail;
    this.queueId = queueId;
    this.lastEventId = lastEventId;
    this.pendingReactions = [];
    this.pendingEvent = this.getEvent();
  }

  /* eslint @typescript-eslint/require-await: off */
  private async getEvent(): Promise<any> {
    logger.info('ReactionQueueImpl.getEvent', {
      queuId: this.queueId,
      lastEventId: this.lastEventId,
    });
    const twoMinutes = 120 * 1000;
    logger.info('reaction queue: blocking on new events');
    const response = await addTimeout<ZulipResponse>(
      this.zulip.events.retrieve({
        queue_id: this.queueId,
        last_event_id: this.lastEventId,
      }),
      twoMinutes,
      'timeout while waiting on event queue',
    );
    checkZulipResult(response, 'failed to retrieve event from queue');
    return response;
  }

  private pushEvent(zulipEvent: any): void {
    if (zulipEvent.type === 'heartbeat') {
      logger.debug('received heartbeat event');
      return;
    }
    logger.debug('received non-heartbeat event', zulipEvent);
    if (zulipEvent.user.email === this.botEmail) {
      // prevent action to own message;
      return;
    }
    const reaction = {
      user: zulipEvent.user.email,
      emoji: zulipEvent.emoji_name,
      op: zulipEvent.op,
    };
    this.pendingReactions.push(reaction);
  }

  async next(): Promise<ControlMessage> {
    while (this.pendingReactions.length == 0) {
      logger.debug('waiting for pending queue event', {
        queueId: this.queueId,
        lastEventId: this.lastEventId,
      });
      const response = await this.pendingEvent;
      logger.debug('got response from queue', {
        queueId: this.queueId,
        lastEventId: this.lastEventId,
        response,
      });
      for (const event of response.events) {
        this.lastEventId = Math.max(event.id, this.lastEventId);
        this.pushEvent(event);
      }
      // queue up next
      this.pendingEvent = this.getEvent();
    }
    const reactionMessage: ControlMessage = {
      reaction: this.pendingReactions[0],
      messageType: 'ReactionMessage',
    };
    this.pendingReactions.pop();
    return reactionMessage;
  }

  async close(): Promise<void> {
    logger.info('closing queue', {
      queueId: this.queueId,
      lastEventId: this.lastEventId,
    });
    const response = await this.zulip.queues.deregister({
      queue_id: this.queueId,
    });
    checkZulipResult(response, 'failed to close queue');
  }
}

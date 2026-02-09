import { Database } from '../database/database';
import logger from '../logger';
import { Zulip } from '../zulip/zulip';
import { getNextLunchDate } from '../date_utils';
import {
  mkAnnounceTopic,
  mkOrganizedMessage,
  mkOrganizeSuccessContent,
} from '../chatting';
import { mkSolverFromDb } from '../utils';
import { deterministicPrng, deterministicSeed } from '../solver/random';
import { minBy } from '../solver/ordering';
import { handleFixup } from './fixup';

export async function handleOrganizeRequest(
  database: Database,
  zulip: Zulip,
  announceStream: string,
): Promise<void> {
  const wednesday = getNextLunchDate();
  const hasLunch = await database.hasLunch(wednesday);
  if (!hasLunch) {
    throw new Error(`no lunch announced for date ${wednesday}`);
  }
  const alreadyOrganized = await database.isLunchActuallyOrganized(wednesday);
  if (alreadyOrganized) {
    throw new Error(
      `lunch ${wednesday} already organized; cannot organize again`,
    );
  }

  const attendees = await database.getAttendance(wednesday);

  // HACK: run fixup
  const lunchTopic = mkAnnounceTopic(wednesday);
  const msgId = await zulip.getFirstMessage(lunchTopic);
  if (msgId === null) {
    logger.error(
      'failed to find initial announce message',
      lunchTopic,
      attendees,
    );
  } else {
    await handleFixup(database, zulip, msgId);
  }

  logger.info('organizing lunch, reading lookup table...', {
    wednesday,
    attendees,
  });
  const seed = deterministicSeed(wednesday);
  const solver = await mkSolverFromDb(database, seed);
  const { assignment, score } = solver.greedy(
    attendees.get(0)!,
    wednesday,
    100,
  );
  logger.info('got greedy solution, assigning captains...');
  const lastCaptainDates = await database.getLastCaptainAssignment(wednesday);
  for (const group of assignment.values()) {
    const lastDates = group.map(({ email }, idx) => {
      const lastDate = lastCaptainDates.get(email);
      if (lastDate) {
        return { idx, lastDate };
      }
      logger.error('invariant violation, email does not exist?!', { email });
      return { idx, lastDate: wednesday };
    });
    // pick person who has no organized lunch for longest time
    const { idx } = minBy(lastDates, ({ lastDate }) => lastDate.getTime());
    group[idx].isCaptain = true;
  }

  logger.info('finalized solution for lunch; writing back to db...', {
    score,
    nAttendees: attendees.get(0)!.length,
  });
  await database.setAllAttendance(wednesday, assignment);

  // create deterministic prng
  const prng = deterministicPrng(wednesday);
  const zulipAttendees = await zulip.addFullNames(assignment);
  const msg = mkOrganizedMessage(prng, wednesday, zulipAttendees);
  const groupMsgId = await zulip.sendPublicMessage(msg);
  await database.updateLunch(wednesday, groupMsgId);
  const successContent = mkOrganizeSuccessContent(
    msg.topic,
    announceStream,
    score,
  );
  await zulip.success(successContent);
}

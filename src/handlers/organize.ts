import { Database } from '../database/database';
import logger from '../logger';
import { Zulip } from '../zulip/zulip';
import { getNextLunchDate } from '../date_utils';
import { mkOrganizedMessage, mkOrganizeSuccessContent } from '../chatting';
import { isActuallyOrganized } from '../types';
import { mkSolverFromDb } from '../utils';
import { deterministicPrng, deterministicSeed } from '../solver/random';

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
  const attendees = await database.getAttendance(wednesday);
  if (isActuallyOrganized(attendees)) {
    throw new Error(
      `lunch ${wednesday} already organized; cannot organize again`,
    );
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
  logger.info('got solution for lunch; writing back to db...', {
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

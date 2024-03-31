import { Database } from './database/database';
import logger from './logger';
import { Zulip } from './zulip/zulip';
import { mkIncrementalSuccessMsg, mkOrganizedMessage } from './chatting';
import { OrganizedLunch, User } from './types';
import { mkSolverFromDb } from './utils';
import { deterministicPrng, deterministicSeed } from './solver/random';

export async function incrementalSolve(
  db: Database,
  zulip: Zulip,
  organizedLunch: OrganizedLunch,
  attendee: User,
  wednesday: Date,
) {
  const seed = deterministicSeed(wednesday);
  const solver = await mkSolverFromDb(db, seed);
  const groupIdx = solver.greedyAddOne(organizedLunch, wednesday, attendee);
  // store result
  organizedLunch.get(groupIdx)?.push({ isCaptain: false, ...attendee });
  await db.setAllAttendance(wednesday, organizedLunch);
  logger.info('solved for late signup', { attendee, wednesday, groupIdx });

  const score = solver.score(wednesday, organizedLunch);
  const msg = mkIncrementalSuccessMsg(attendee, score);
  await zulip.success(msg);

  await updatePosting(db, zulip, wednesday, organizedLunch);
}

export async function updatePosting(
  db: Database,
  zulip: Zulip,
  wednesday: Date,
  organizedLunch: OrganizedLunch,
) {
  const { zulipGroupMessageId } = await db.getLunch(wednesday);
  if (zulipGroupMessageId === null) {
    // how can it be organized then?!
    throw new Error('inconsistent db state');
  }
  const prng = deterministicPrng(wednesday);
  const zulipAttendees = await zulip.addFullNames(organizedLunch);
  const msg = mkOrganizedMessage(prng, wednesday, zulipAttendees);
  await zulip.updatePublicMessage(msg, zulipGroupMessageId);
}

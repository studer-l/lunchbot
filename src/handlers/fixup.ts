import { Database } from '../database/database';
import logger from '../logger';
import { Zulip } from '../zulip/zulip';
import { getNextLunchDate } from '../date_utils';
import { incrementalSolve, updatePosting } from '../incremental_solve';

/** read reactions from current message and try to fix organization */
export async function handleFixup(
  database: Database,
  zulip: Zulip,
  announcementMessageId: number,
) {
  logger.info('obtaining current lunch');
  const date = getNextLunchDate();
  const { zulipGroupMessageId } = await database.getLunch(date);
  const reactions = await zulip.getReactions(announcementMessageId);
  logger.info('fixing lunch', { date, zulipGroupMessageId, reactions });
  if (zulipGroupMessageId === null) {
    logger.info('fixing up not yet organized lunch');
    // simply re-add all participants to cleared lunch
    await database.clearAllAttendance(date);
    for (const email of reactions) {
      await database.setAttendance(date, email, 0, false);
    }
  } else {
    logger.info('fixing already organized lunch');
    const organizedLunch = await database.getAttendance(date);
    const alreadyAdded = new Set<string>();
    organizedLunch.forEach((group) =>
      group.forEach(({ email }) => alreadyAdded.add(email)),
    );

    for (const email of reactions) {
      if (alreadyAdded.has(email)) {
        alreadyAdded.delete(email);
        continue;
      }
      const updatedLunch = await database.getAttendance(date);
      const attendee = await database.ensureUser(email);
      logger.info('incremental solve', { attendee, date });
      await incrementalSolve(database, zulip, updatedLunch, attendee, date);
    }
    // @FIXME: remove all emails remaining in `alreadyAdded` as those are no
    // longer valid reactions
    const updatedLunch = await database.getAttendance(date);
    await updatePosting(database, zulip, date, updatedLunch);
  }
  logger.info('fixup done');
  await zulip.success('fixup complete');
}

import { Database } from '../database/database';
import logger from '../logger';
import { Zulip } from '../zulip/zulip';
import { isActuallyOrganized } from '../types';
import { incrementalSolve } from '../incremental_solve';
import { Reaction } from '../control_message';
import { getNextLunchDate } from '../date_utils';

export async function handleReaction(
  database: Database,
  zulip: Zulip,
  reaction: Reaction,
): Promise<void> {
  logger.debug('got reaction', reaction);
  const wednesday = getNextLunchDate();
  const { user: email, emoji, op } = reaction;
  if (emoji !== 'hungry') {
    logger.debug('user is trolling with unrelated emoji');
    return;
  }

  const attendee = await database.ensureUser(email);
  const organizedLunch = await database.getAttendance(wednesday);
  const lateChange = isActuallyOrganized(organizedLunch);
  switch (op) {
    case 'add': {
      if (!lateChange) {
        // just add to not-yet-organized group
        logger.info('adding user to pending group', { email, wednesday });
        await database.setAttendance(wednesday, email, 0, false);
        return;
      }
      // otherwise need to perform an incremental solve
      await incrementalSolve(
        database,
        zulip,
        organizedLunch,
        attendee,
        wednesday,
      );
      return;
    }
    case 'remove': {
      if (!lateChange) {
        // remove from not-yet-organized group
        logger.info('removing user from pending group', {
          email,
          wednesday,
        });
        await database.clearAttendance(wednesday, email);
        return;
      } else {
        await zulip.failed(`cannot remove ${email} from organized lunch`);
      }
    }
  }
}

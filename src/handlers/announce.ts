import { Database } from '../database/database';
import logger from '../logger';
import { Zulip } from '../zulip/zulip';
import { getNextLunchDate } from '../date_utils';
import { mkAnnounceMessage, mkAnnounceSuccessContent } from '../chatting';

/** handles request to announce new lunch, returns Date of new lunch if any */
export async function handleAnnounceRequest(
  database: Database,
  zulip: Zulip,
  announceStream: string,
): Promise<Date> {
  const wednesday = getNextLunchDate();
  const exists = await database.hasLunch(wednesday);
  const dateStr = wednesday.toLocaleDateString('en-GB');
  logger.debug('LunchBot.handleAnnounceRequest', {
    exists,
    date: dateStr,
  });
  if (exists) {
    throw new Error(`next lunch @ ${dateStr} already scheduled`);
  }
  const announceMessage = mkAnnounceMessage(wednesday);
  await zulip.announce(announceMessage);
  const ok = await database.createLunch(wednesday);
  logger.debug('success announcing lunch', { dbOk: ok });
  await zulip.success(mkAnnounceSuccessContent(wednesday, announceStream));
  return wednesday;
}

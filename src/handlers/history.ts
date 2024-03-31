import { Database } from '../database/database';
import logger from '../logger';
import { Zulip } from '../zulip/zulip';

export async function handleHistoryInsert(
  database: Database,
  zulip: Zulip,
  date: Date,
  groups: readonly (readonly string[])[],
): Promise<void> {
  logger.info('handleHistoryInsert', { date });
  logger.debug('validating all emails');
  const zulipEmails = await zulip.getAllUsersEmail();
  logger.debug('got valid emails', { zulipEmails });
  const validEmails = new Set(zulipEmails);

  for (const group of groups) {
    for (const email of group) {
      if (!validEmails.has(email)) {
        await zulip.failed(`unknown email ${email}, action aborted`);
        return;
      }
    }
  }
  logger.debug('all emails validating, begin transaction');

  const mrlp = await database.readMostRecentLunchPairing();
  for (const group of groups) {
    logger.debug('writing group', { group });
    mrlp.updateGroupMax(group, date);
  }
  logger.debug('updating cache');
  await database.writeMostRecentLunchPairing(mrlp);
  await zulip.success(`updated group for ${date}`);
}

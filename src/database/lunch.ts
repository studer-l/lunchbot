import logger from '../logger';
import { Client, DatabaseError } from 'pg';
import { LunchBotDatabaseError } from './error';
import { Lunch } from '../types';

export async function hasLunch(client: Client, date: Date): Promise<boolean> {
  const result = await client.query(
    'SELECT EXISTS(SELECT 1 FROM lunch WHERE day = $1)',
    [date],
  );
  logger.debug('hasLunch', { result, date });
  return result.rows[0].exists;
}

export async function getLunch(client: Client, date: Date): Promise<Lunch> {
  const result = await client.query('SELECT * FROM lunch WHERE day = $1', [
    date,
  ]);
  const rowCount: number | null = result.rowCount;
  logger.silly('getLunch', {
    rowCount: rowCount,
    date,
    rows: result.rows,
  });
  if (rowCount == 0) {
    throw new LunchBotDatabaseError(`no lunch found on ${date}`);
  }
  const row = result.rows[0];
  return new Lunch(row.day, row.zulip_group_message_id);
}

export async function createLunch(client: Client, date: Date): Promise<void> {
  const args = [date];
  try {
    const result = await client.query('INSERT INTO lunch VALUES ($1)', args);
    logger.silly('createLunch', { result, args });
    if (result.rowCount !== 1) {
      logger.error('?!?!', { result });
      throw new LunchBotDatabaseError(`failed to create lunch on ${date}`);
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new LunchBotDatabaseError(`lunch on ${date} already exists`);
    }
    throw error;
  }
}

export async function updateLunch(
  client: Client,
  date: Date,
  zulipGroupMessageId: number,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any[] = [date, zulipGroupMessageId];
  const result = await client.query(
    'UPDATE lunch SET zulip_group_message_id = $2 WHERE day = $1',
    args,
  );
  if (result.rowCount !== 1) {
    throw new LunchBotDatabaseError(`no lunch on ${date} to update`);
  }
}

export async function getLatestLunchDate(client: Client): Promise<Date | null> {
  const result = await client.query('SELECT MAX(day) FROM lunch LIMIT 1');
  logger.debug('got result', result);
  return result.rows[0].max;
}

import { Client } from 'pg';
import { LunchBotDatabaseError } from './error';
import { User } from '../types';

export async function ensureUser(client: Client, email: string): Promise<User> {
  const selectResult = await client.query(
    'SELECT has_credit_card FROM zulip_user WHERE email = $1',
    [email],
  );
  if (selectResult.rowCount == 1) {
    const hasCreditCard = selectResult.rows[0].has_credit_card;
    return { email, hasCreditCard };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any[] = [false, email];
  const insertResult = await client.query(
    `INSERT INTO zulip_user (has_credit_card, email) VALUES ($1, $2)`,
    args,
  );
  if (insertResult.rowCount == 1) {
    return { email, hasCreditCard: false };
  }
  throw new LunchBotDatabaseError(`failed to create user ${email}`);
}

export async function setUserCC(
  client: Client,
  email: string,
  value: boolean,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any[] = [value, email];
  const result = await client.query(
    'UPDATE zulip_user SET has_credit_card = $1 WHERE email = $2',
    args,
  );
  if (result.rowCount !== 1) {
    throw new LunchBotDatabaseError(`user ${email} does not exist`);
  }
}

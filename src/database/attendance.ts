import { Client } from 'pg';
import logger from '../logger';
import { Attendee, OrganizedLunch } from '../types';

export async function setAttendance(
  client: Client,
  date: Date,
  email: string,
  groupId: number,
  isCaptain: boolean,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any[] = [date, email, groupId, isCaptain];
  try {
    await client.query(
      `INSERT INTO
        attendance
      VALUES
        ($1, (SELECT id FROM zulip_user WHERE email = $2), $3, $4)
      ON CONFLICT (lunch_day, zulip_user_id) DO UPDATE SET
        group_id = $3, is_captain = $4
    `,
      args,
    );
    return true;
  } catch (err) {
    logger.error('failed to set attendance', err);
    return false;
  }
}

export async function setAllAttendance(
  client: Client,
  date: Date,
  organizedLunch: OrganizedLunch,
): Promise<void> {
  for (const [groupId, group] of organizedLunch) {
    for (const { email, isCaptain } of group) {
      await setAttendance(client, date, email, groupId, isCaptain);
    }
  }
}

export async function getAttendance(
  client: Client,
  date: Date,
): Promise<OrganizedLunch> {
  const queryResult = await client.query(
    `SELECT
        email, has_credit_card, group_id, is_captain
      FROM
        zulip_user, attendance
      WHERE
        zulip_user.id = attendance.zulip_user_id AND lunch_day = $1
    `,
    [date],
  );
  const result = new Map<number, Attendee[]>();
  queryResult.rows.forEach(
    ({ email, has_credit_card, group_id, is_captain }) => {
      if (!result.has(group_id)) {
        result.set(group_id, new Array<Attendee>());
      }
      result.get(group_id)!.push({
        email,
        hasCreditCard: has_credit_card,
        isCaptain: is_captain,
      });
    },
  );
  return result;
}

export async function clearAttendance(
  client: Client,
  date: Date,
  email: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any[] = [date, email];
  try {
    await client.query(
      `
DELETE FROM
  attendance
WHERE
  lunch_day = $1 AND
  zulip_user_id = (SELECT id FROM zulip_user WHERE email = $2)
`,
      args,
    );
    return true;
  } catch (error) {
    logger.error('failed to clear attendance', { date, email, error });
    return false;
  }
}

export async function clearAllAttendance(
  client: Client,
  date: Date,
): Promise<boolean> {
  try {
    await client.query('DELETE FROM attendance WHERE lunch_day = $1;', [date]);
    return true;
  } catch (error) {
    logger.error('failed to clear all attendance', { date, error });
    return false;
  }
}

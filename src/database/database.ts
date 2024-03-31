import logger from '../logger';
import { Client } from 'pg';
import { initialize } from './initialize';
import {
  clearAllAttendance,
  clearAttendance,
  getAttendance,
  setAllAttendance,
  setAttendance,
} from './attendance';
import {
  createLunch,
  getLatestLunchDate,
  getLunch,
  hasLunch,
  updateLunch,
} from './lunch';
import { ensureUser, setUserCC } from './user';
import {
  readMostRecentLunchPairing,
  writeMostRecentLunchPairing,
} from './most_recent_lunch_pairing';
import { OrganizedLunch, Lunch, User } from '../types';
import { MostRecentLunchPairing } from '../solver/most_recent_lunch_pairing';

async function connect(dbUrl: string): Promise<Client> {
  logger.debug('creating db connection');
  const client = new Client(dbUrl);
  await client.connect();
  return client;
}

export class Database {
  private readonly client: Client;

  /** Sets attendance of given user. Returns true on success */
  async setAttendance(
    date: Date,
    email: string,
    groupId: number,
    isCaptain: boolean,
  ): Promise<boolean> {
    const result = await setAttendance(
      this.client,
      date,
      email,
      groupId,
      isCaptain,
    );
    logger.debug('db.setAttendance', {
      date,
      email,
      groupId,
      isCaptain,
      result,
    });
    return result;
  }

  async setAllAttendance(
    date: Date,
    organizedLunch: OrganizedLunch,
  ): Promise<void> {
    return await setAllAttendance(this.client, date, organizedLunch);
  }

  async clearAllAttendance(date: Date): Promise<boolean> {
    return await clearAllAttendance(this.client, date);
  }

  async getAttendance(date: Date): Promise<OrganizedLunch> {
    return await getAttendance(this.client, date);
  }

  async clearAttendance(date: Date, email: string): Promise<boolean> {
    return await clearAttendance(this.client, date, email);
  }

  async ensureUser(email: string): Promise<User> {
    logger.debug('ensuring user', { email });
    return await ensureUser(this.client, email);
  }

  async setUserCC(email: string, value: boolean): Promise<void> {
    return await setUserCC(this.client, email, value);
  }

  async hasLunch(date: Date): Promise<boolean> {
    return await hasLunch(this.client, date);
  }

  async getLunch(date: Date): Promise<Lunch> {
    const result = await getLunch(this.client, date);
    logger.debug('db.getLunch', { date, result });
    return result;
  }

  async getLatestLunchDate(): Promise<Date | null> {
    return await getLatestLunchDate(this.client);
  }

  async createLunch(date: Date): Promise<void> {
    return await createLunch(this.client, date);
  }

  async updateLunch(date: Date, zulipGroupMessageId: number): Promise<void> {
    return await updateLunch(this.client, date, zulipGroupMessageId);
  }

  async readMostRecentLunchPairing(): Promise<MostRecentLunchPairing> {
    return await readMostRecentLunchPairing(this.client);
  }

  async writeMostRecentLunchPairing(
    mrlp: MostRecentLunchPairing,
  ): Promise<void> {
    return await writeMostRecentLunchPairing(this.client, mrlp);
  }

  async withTransaction<T>(
    func: (database: Database) => Promise<T>,
  ): Promise<T> {
    try {
      await this.begin();
      const result = await func(this);
      await this.commit();
      return result;
    } catch (error) {
      logger.error('caught exception during transaction, rolling back', error);
      await this.rollback();
      throw error;
    }
  }

  /* manual transaction control */
  async begin() {
    await this.client.query('BEGIN');
  }

  async commit() {
    await this.client.query('COMMIT');
  }

  async rollback() {
    await this.client.query('ROLLBACK');
  }

  /** recreate all tables, dropping all data; meant for integration tests */
  async recreateAll() {
    logger.silly('truncating tables');
    await this.client.query('DROP TABLE IF EXISTS migration');
    await this.client.query(
      'DROP TABLE IF EXISTS most_recent_lunch_pairing_cache',
    );
    await this.client.query('DROP TABLE IF EXISTS attendance');
    await this.client.query('DROP TABLE IF EXISTS lunch');
    await this.client.query('DROP TABLE IF EXISTS zulip_usre');
    await initialize(this.client);
  }

  /* lifecycle */

  constructor(client: Client) {
    this.client = client;
  }

  async end() {
    await this.client.end();
  }
}

export async function mkDatabase(dbUrl: string): Promise<Database> {
  const client = await connect(dbUrl);
  await client.query('BEGIN');
  await initialize(client);
  await client.query('COMMIT');
  return new Database(client);
}

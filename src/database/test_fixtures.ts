import { readConfigFromEnv } from '../config';
import logger from '../logger';
import { Database, mkDatabase } from './database';

/** common test fixtures among database tests */
export let db: Database;

// create a shared database for all tests
export async function fBeforeAll() {
  logger.silly('creating test db');
  const config = readConfigFromEnv();
  db = await mkDatabase(config.dbUrl);
}

export async function fAfterAll() {
  logger.silly('closing test db connection');
  await db.end();
}

// rollback transaction for each test
export async function fBeforeEach() {
  logger.silly('begin test transaction');
  await db.begin();
}

export async function fAfterEach() {
  logger.silly('rollback test transaction');
  await db.rollback();
}

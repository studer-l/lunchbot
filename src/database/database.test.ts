import { readConfigFromEnv } from '../config';
import * as sut from './database';

describe('mkDatabase', () => {
  test('creates a database from config', async () => {
    const config = readConfigFromEnv();
    const db = await sut.mkDatabase(config.dbUrl);
    expect(db).toBeDefined();
    await db.end();
  });
});

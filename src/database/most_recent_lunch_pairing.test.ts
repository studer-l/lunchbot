import { subWeeks } from 'date-fns';
import {
  fAfterAll,
  fAfterEach,
  fBeforeAll,
  fBeforeEach,
  db,
} from './test_fixtures';
import { MostRecentLunchPairing } from '../solver/most_recent_lunch_pairing';

describe('Most RecentLunch Pairing Cache Database', () => {
  beforeAll(fBeforeAll);
  afterAll(fAfterAll);
  beforeEach(fBeforeEach);
  afterEach(fAfterEach);

  test('initial db contains an empty cache', async () => {
    const result = await db.readMostRecentLunchPairing();
    expect(result.serialize().lut).toStrictEqual({});
  });

  test('can readback write', async () => {
    const date0 = new Date();
    const date1 = subWeeks(date0, 2);
    const lut = { a: { b: date0, c: date1 }, d: {} };
    const mrlp = new MostRecentLunchPairing(lut, date1);
    await db.writeMostRecentLunchPairing(mrlp);
    const readback = await db.readMostRecentLunchPairing();
    expect(readback).toStrictEqual(mrlp);
  });
});

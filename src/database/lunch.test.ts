import { addWeeks } from 'date-fns';
import { getNextLunchDate } from '../date_utils';
import { Lunch } from '../types';
import { LunchBotDatabaseError } from './error';
import {
  fAfterAll,
  fAfterEach,
  fBeforeAll,
  fBeforeEach,
  db,
} from './test_fixtures';

describe('Lunch Database', () => {
  const date = getNextLunchDate(new Date());

  beforeAll(fBeforeAll);
  afterAll(fAfterAll);
  beforeEach(fBeforeEach);
  afterEach(fAfterEach);

  test('when empty, no lunch is set for today', async () => {
    await expect(db.getLunch(date)).rejects.toThrow(LunchBotDatabaseError);
  });

  test('can insert a lunch', async () => {
    await db.createLunch(date);

    const lookupResult = await db.getLunch(date);
    expect(lookupResult).toStrictEqual(new Lunch(date, null));
  });

  test('cannot create same lunch twice', async () => {
    // given lunch already exists
    await db.createLunch(date);

    // then it cannot be created again
    await expect(db.createLunch(date)).rejects.toThrow(LunchBotDatabaseError);
  });

  test('can update lunch group message id', async () => {
    // given lunch already exists
    await db.createLunch(date);

    // then it can be updated
    await db.updateLunch(date, 42);

    const result = await db.getLunch(date);

    expect(result).toStrictEqual(new Lunch(date, 42));
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  test('cannot update lunch that does not exist', async () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(db.updateLunch(date, 10)).rejects.toThrow(LunchBotDatabaseError);
  });

  describe('hasLunch', () => {
    const date2 = addWeeks(date, 1);
    test('returns false when no lunch set on this date', async () => {
      await db.createLunch(date2);
      expect(await db.hasLunch(date)).toBe(false);
    });

    test('returns true when lunch set on this date', async () => {
      await db.createLunch(date);
      expect(await db.hasLunch(date)).toBe(true);
    });
  });

  describe('getLatestLunchDate', () => {
    test('throws if there is no lunch', async () => {
      const latestLunch = await db.getLatestLunchDate();
      expect(latestLunch).toBeNull();
    });
    test('gets latest lunch', async () => {
      // given some lunches are inserted
      for (let i = 0; i < 5; ++i) {
        const shiftedDate = addWeeks(date, i);
        await db.createLunch(shiftedDate);
      }
      // then the latest lunch is retrieved
      const latest = await db.getLatestLunchDate();
      expect(latest).toStrictEqual(addWeeks(date, 4));
    });
  });
});

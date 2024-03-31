import { LunchBotDatabaseError } from './error';
import {
  fAfterAll,
  fAfterEach,
  fBeforeAll,
  fBeforeEach,
  db,
} from './test_fixtures';

describe('User Database', () => {
  const email = 'user@company.com';

  beforeAll(fBeforeAll);
  afterAll(fAfterAll);
  beforeEach(fBeforeEach);
  afterEach(fAfterEach);

  test('ensureUser create a user if none exists', async () => {
    const result = await db.ensureUser(email);
    expect(result).toStrictEqual({ email, hasCreditCard: false });
  });

  test('ensureUser creates a new user on subsequent calls', async () => {
    const result0 = await db.ensureUser('user0@company.com');
    const result1 = await db.ensureUser('user1@company.com');
    expect(result0).not.toStrictEqual(result1);
  });
  test('ensureUser returns same value for subsequent calls', async () => {
    const result0 = await db.ensureUser('user@company.com');
    const result1 = await db.ensureUser('user@company.com');
    expect(result0).toStrictEqual(result1);
  });

  test('setUserCC existing user ', async () => {
    // given a user
    await db.ensureUser(email);

    // when setting has_credit_card
    await db.setUserCC(email, true);

    // then it succeeds
  });
  test('setUserCC non-existing user', async () => {
    // given a non-existing user
    // when setting has_credit_card
    // then it throws
    await expect(db.setUserCC(email, true)).rejects.toThrow(
      LunchBotDatabaseError,
    );
  });
});

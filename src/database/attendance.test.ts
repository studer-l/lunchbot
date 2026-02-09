import { subWeeks } from 'date-fns';
import { getNextLunchDate } from '../date_utils';
import {
  fAfterAll,
  fAfterEach,
  fBeforeAll,
  fBeforeEach,
  db,
} from './test_fixtures';

describe('Attendance Database', () => {
  const date = getNextLunchDate(new Date());
  const email = 'user@company.com';
  const groupId = 456;
  beforeAll(fBeforeAll);
  afterAll(fAfterAll);
  beforeEach(fBeforeEach);
  afterEach(fAfterEach);

  test('attendance fails if event does not exist', async () => {
    // given an existing user
    await db.ensureUser(email);

    const result = await db.setAttendance(date, email, groupId, false);
    expect(result).toBe(false);
  });

  test('attendance fails if user does not exist', async () => {
    // given the event exist
    await db.createLunch(date);

    const result = await db.setAttendance(date, email, groupId, false);
    expect(result).toBe(false);
  });

  test('attendance succeeds if both user and event exist', async () => {
    // given the event exist
    await db.createLunch(date);
    // and an existing user
    await db.ensureUser(email);

    const result = await db.setAttendance(date, email, groupId, false);
    expect(result).toBe(true);

    const readback = await db.getAttendance(date);
    expect(readback.size).toBe(1);
    expect(readback.get(groupId)).toStrictEqual([
      { email, hasCreditCard: false, isCaptain: false },
    ]);
  });

  test('getAttendance groups same groups', async () => {
    // given the event exist
    await db.createLunch(date);
    // and two existing users
    const email0 = 'user00@company.com';
    const email1 = 'user01@company.com';
    await db.ensureUser(email0);
    await db.ensureUser(email1);
    await db.setUserCC(email0, true);

    // both attend the event in the same group
    await db.setAttendance(date, email0, groupId, true);
    await db.setAttendance(date, email1, groupId, false);

    // then they are returned as attendees in the same group
    const readback = await db.getAttendance(date);
    expect(readback.size).toBe(1);
    expect(readback.get(groupId)).toStrictEqual([
      { email: email1, hasCreditCard: false, isCaptain: false },
      { email: email0, hasCreditCard: true, isCaptain: true },
    ]);
  });

  test('getAttendance separates differing groups', async () => {
    // given the event exist
    await db.createLunch(date);
    // and two existing users
    const email0 = 'user3@company.com';
    const email1 = 'user4@company.com';
    await db.ensureUser(email0);
    await db.ensureUser(email1);

    const group0 = 0;
    const group1 = 1;

    // both attend the event in the same group
    await db.setAttendance(date, email0, group0, false);
    await db.setAttendance(date, email1, group1, false);

    // then they are returned as attendees in the same group
    const readback = await db.getAttendance(date);
    expect(readback.size).toBe(2);
    expect(readback.get(group0)).toStrictEqual([
      { email: email0, hasCreditCard: false, isCaptain: false },
    ]);
    expect(readback.get(group1)).toStrictEqual([
      { email: email1, hasCreditCard: false, isCaptain: false },
    ]);
  });

  test('clearAttendance removes attendance', async () => {
    // given the event exist
    await db.createLunch(date);
    // and an existing user
    await db.ensureUser(email);

    // with an existing attendance
    await db.setAttendance(date, email, groupId, false);

    // when clearing the attendance
    const result = await db.clearAttendance(date, email);

    // then it succeeds
    expect(result).toBeTruthy();

    // and the attendance record is cleared
    const readback = await db.getAttendance(date);
    expect(readback.size).toBe(0);
  });

  test('clearAllAttendance removes all attendance', async () => {
    // given the event exist
    await db.createLunch(date);
    // and an existing user
    await db.ensureUser('foo');
    await db.ensureUser('bar');
    await db.ensureUser('baz');

    // with an existing attendance
    await db.setAttendance(date, 'foo', groupId, false);
    await db.setAttendance(date, 'bar', groupId, false);
    await db.setAttendance(date, 'baz', groupId, false);

    // when clearing the attendance
    const result = await db.clearAllAttendance(date);

    // then it succeeds
    expect(result).toBeTruthy();

    // and the attendance record is cleared
    const readback = await db.getAttendance(date);
    expect(readback.size).toBe(0);
  });

  describe('isLunchActuallyOrganized', () => {
    test('returns false when lunch has not been organized (group 0)', async () => {
      // Given a lunch with attendees in group 0 (unorganized)
      await db.createLunch(date);
      await db.ensureUser(email);
      await db.setAttendance(date, email, 0, false);

      // Then it is not considered organized
      const result = await db.isLunchActuallyOrganized(date);
      expect(result).toBe(false);
    });

    test('returns true when lunch has been organized (group != 0)', async () => {
      // Given a lunch with attendees in non-zero groups
      await db.createLunch(date);
      await db.ensureUser(email);
      await db.setAttendance(date, email, 1, false);

      // Then it is considered organized
      const result = await db.isLunchActuallyOrganized(date);
      expect(result).toBe(true);
    });

    test('returns false when lunch has no attendees', async () => {
      // Given a lunch with no attendees
      await db.createLunch(date);

      // Then it is not considered organized
      const result = await db.isLunchActuallyOrganized(date);
      expect(result).toBe(false);
    });

    test('returns false if some attendees are in group 0', async () => {
      // Given a lunch with attendees in both group 0 and other groups
      await db.createLunch(date);
      const email1 = 'user5@company.com';
      const email2 = 'user6@company.com';
      await db.ensureUser(email1);
      await db.ensureUser(email2);
      await db.setAttendance(date, email1, 0, false);
      await db.setAttendance(date, email2, 1, false);

      // Then it is not considered organized (group 0 exists)
      const result = await db.isLunchActuallyOrganized(date);
      expect(result).toBe(false);
    });

    test('returns true with multiple non-zero groups', async () => {
      // Given a lunch with attendees in multiple non-zero groups
      await db.createLunch(date);
      const email1 = 'user7@company.com';
      const email2 = 'user8@company.com';
      const email3 = 'user9@company.com';
      await db.ensureUser(email1);
      await db.ensureUser(email2);
      await db.ensureUser(email3);
      await db.setAttendance(date, email1, 1, true);
      await db.setAttendance(date, email2, 1, false);
      await db.setAttendance(date, email3, 2, false);

      // Then it is considered organized
      const result = await db.isLunchActuallyOrganized(date);
      expect(result).toBe(true);
    });
  });

  describe('getLastCaptainAssignment', () => {
    test('defaults to having organized on date', async () => {
      // Given a lunch with a single attendee who has never organized
      await db.createLunch(date);
      await db.ensureUser(email);
      const ok = await db.setAttendance(date, email, groupId, false);
      expect(ok).toBeTruthy();

      // Then the last captain assignment for this person defaults to current date
      const result = await db.getLastCaptainAssignment(date);

      const expected = new Map<string, Date>();
      expected.set(email, date);
      expect(result).toStrictEqual(expected);
    });

    test('picks the most recent captain date', async () => {
      // Given multiple lunches where the single attendee was captain for half of them
      await db.ensureUser(email);

      for (const idx of [4, 3, 2, 1]) {
        const pastDate = subWeeks(date, idx);
        const wasCaptain = [4, 2].includes(idx);
        await db.createLunch(pastDate);
        await db.setAttendance(pastDate, email, groupId, wasCaptain);
      }

      // Then the last captain assignment for this person was the lunch two weeks ago
      const result = await db.getLastCaptainAssignment(date);

      const expected = new Map<string, Date>();
      const twoWeeksAgo = subWeeks(date, 2);
      expected.set(email, twoWeeksAgo);
      expect(result).toStrictEqual(expected);
    });

    test('tracks captain history for multiple people independently', async () => {
      // Given multiple users with different captain histories
      const email1 = 'user1@company.com';
      const email2 = 'user2@company.com';
      await db.ensureUser(email1);
      await db.ensureUser(email2);

      // Create a series of past lunches with different captain assignments
      for (const idx of [4, 3, 2, 1]) {
        const pastDate = subWeeks(date, idx);
        await db.createLunch(pastDate);
        // user1 was captain 4 and 2 weeks ago
        await db.setAttendance(pastDate, email1, groupId, [4, 2].includes(idx));
        // user2 was captain 3 and 1 weeks ago
        await db.setAttendance(pastDate, email2, groupId, [3, 1].includes(idx));
      }

      // Then each person's last captain date is tracked correctly
      const result = await db.getLastCaptainAssignment(date);

      const expected = new Map<string, Date>();
      expected.set(email1, subWeeks(date, 2)); // 2 weeks ago
      expected.set(email2, subWeeks(date, 1)); // 1 week ago
      expect(result).toStrictEqual(expected);
    });
  });
});

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
});

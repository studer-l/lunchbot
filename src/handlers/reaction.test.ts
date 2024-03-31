import * as sut from './reaction';
import { MockZulip } from '../zulip/zulip_mock_impl';
import { getNextLunchDate } from '../date_utils';
import {
  fAfterAll,
  fAfterEach,
  fBeforeAll,
  fBeforeEach,
  db,
} from '../database/test_fixtures';
import { Reaction } from '../control_message';

describe('reaction handler', () => {
  beforeAll(fBeforeAll);
  afterAll(fAfterAll);
  beforeEach(fBeforeEach);
  afterEach(fAfterEach);

  const date = getNextLunchDate();

  interface Assigners {
    groupAssigner: (i: number) => number;
    captainAssigner: (i: number) => boolean;
  }

  async function organizedLunchWithAnnouncment({
    groupAssigner,
    captainAssigner,
  }: Assigners): Promise<void> {
    await db.createLunch(date);

    // and there are already 11 sign ups spread onto two groups
    for (let i = 0; i < 11; ++i) {
      const email = `user${i}@lunche.rs`;
      await db.ensureUser(email);

      if (i % 4 == 0) {
        await db.setUserCC(email, true);
      }
      const groupId = groupAssigner(i);
      const isCaptain = captainAssigner(i);
      const result = await db.setAttendance(date, email, groupId, isCaptain);
      expect(result).toBeTruthy();
    }
  }

  test('adding reaction before organizing', async () => {
    // Given an announced lunch
    const mockZulip = new MockZulip();
    await db.createLunch(date);

    // When a reaction is received that indicates participation
    const reaction: Reaction = {
      user: 'one-night@all-night',
      emoji: 'hungry',
      op: 'add',
    };
    await sut.handleReaction(db, mockZulip, reaction);

    // Then the user is signed up for this lunch
    const attendance = await db.getAttendance(date);
    expect(attendance.size).toBe(1);
    expect(attendance.get(0)).toStrictEqual([
      {
        email: reaction.user,
        hasCreditCard: false,
        isCaptain: false,
      },
    ]);
  });

  test('adding reaction after organizing', async () => {
    // Given an announced and organized lunch
    const mockZulip = new MockZulip();
    await organizedLunchWithAnnouncment({
      groupAssigner: (i) => (i >= 6 ? 1 : 2),
      captainAssigner: (i) => i % 5 == 0,
    });
    const zulipGroupMessageId = 1234;
    await db.updateLunch(date, zulipGroupMessageId);

    // when another person signs up
    const email = 'late@lunche.rs';

    const reaction: Reaction = {
      user: email,
      emoji: 'hungry',
      op: 'add',
    };
    await sut.handleReaction(db, mockZulip, reaction);

    // then this person is added to the smaller group
    const attendance = await db.getAttendance(date);
    expect(new Set(attendance.keys())).toStrictEqual(new Set([1, 2]));
    expect(attendance.get(1)!.length).toBe(6);
    expect(attendance.get(2)!.length).toBe(6);

    // and the posting is edited
    expect(mockZulip.messageCounts()).toStrictEqual({
      announceMessages: 0,
      errors: 0,
      failureMessages: 0,
      publicMessages: 0,
      successMessages: 1,
      updateMessages: 1,
    });
  });

  test('removing reaction before organizing', async () => {
    // Given an announced lunch
    const mockZulip = new MockZulip();
    await organizedLunchWithAnnouncment({
      groupAssigner: () => 0,
      captainAssigner: () => false,
    });

    // when someone signs off using a reaction
    const reaction: Reaction = {
      user: 'user4@lunche.rs',
      emoji: 'hungry',
      op: 'remove',
    };
    await sut.handleReaction(db, mockZulip, reaction);

    // then this person is removed from the lunch
    const attendance = await db.getAttendance(date);
    expect([...attendance.keys()]).toStrictEqual([0]);
    expect(attendance.get(0)!.length).toBe(10);

    // and no zulip message is sent
    expect(mockZulip.messageCounts()).toStrictEqual({
      announceMessages: 0,
      errors: 0,
      failureMessages: 0,
      publicMessages: 0,
      successMessages: 0,
      updateMessages: 0,
    });
  });

  test('removing reaction after organizing', async () => {
    // Given an announced and organized lunch
    const mockZulip = new MockZulip();
    await organizedLunchWithAnnouncment({
      groupAssigner: (i) => (i >= 6 ? 1 : 2),
      captainAssigner: (i) => i % 5 == 0,
    });

    // and the lunch is organized
    const zulipGroupMessageId = 1234;
    await db.updateLunch(date, zulipGroupMessageId);

    // when someone signs off using a reaction
    const reaction: Reaction = {
      user: 'user4@lunche.rs',
      emoji: 'hungry',
      op: 'remove',
    };
    await sut.handleReaction(db, mockZulip, reaction);

    // then this reaction is ignored (not implemented yet)
    const attendance = await db.getAttendance(date);
    expect(new Set(attendance.keys())).toStrictEqual(new Set([1, 2]));
    expect(attendance.get(1)!.length).toBe(5);
    expect(attendance.get(2)!.length).toBe(6);

    // and a zulip message is sent
    expect(mockZulip.messageCounts()).toStrictEqual({
      announceMessages: 0,
      errors: 0,
      failureMessages: 1,
      publicMessages: 0,
      successMessages: 0,
      updateMessages: 0,
    });
  });
});

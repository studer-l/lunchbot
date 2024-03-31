import * as sut from './organize';
import { MockZulip } from '../zulip/zulip_mock_impl';
import { getNextLunchDate } from '../date_utils';
import {
  fAfterAll,
  fAfterEach,
  fBeforeAll,
  fBeforeEach,
  db,
} from '../database/test_fixtures';

describe('organize handler', () => {
  beforeAll(fBeforeAll);
  afterAll(fAfterAll);
  beforeEach(fBeforeEach);
  afterEach(fAfterEach);

  test('Success case', async () => {
    // Given a mocked zulip and a lunch that has 32 sign-ups
    const mockZulip = new MockZulip();
    const date = getNextLunchDate();
    await db.createLunch(date);
    for (let i = 0; i < 32; ++i) {
      const email = `user${i}@integration.test`;
      await db.ensureUser(email);
      if (i % 5 == 0) {
        await db.setUserCC(email, true);
      }
      await db.setAttendance(date, email, 0, false);
    }

    // When requesting the lunch to be organized
    await sut.handleOrganizeRequest(db, mockZulip, 'lunch stream');

    // Then a new organize lunch post is emitted
    expect(mockZulip.publicMessages.length).toBe(1);
    expect(mockZulip.publicMessages[0].content).toContain(
      'Groups have been organized!',
    );

    // And a confirmation is posted
    expect(mockZulip.successMessages.length).toBe(1);
    expect(mockZulip.successMessages[0]).toContain('Organized lunch');
  });

  test('No lunch announced error', async () => {
    // Given no lunch has been announced
    const mockZulip = new MockZulip();

    // When requesting this non-existent lunch to be organized
    // Then it is an error
    await expect(
      sut.handleOrganizeRequest(db, mockZulip, 'lunch stream'),
    ).rejects.toThrow('no lunch announced for date');
  });

  test('Lunch already organized error', async () => {
    // Given a mocked zulip and a lunch that has 32 sign-ups and is already organized
    const mockZulip = new MockZulip();
    const date = getNextLunchDate();
    await db.createLunch(date);
    for (let i = 0; i < 32; ++i) {
      const email = `user${i}@integration.test`;
      await db.ensureUser(email);
      if (i % 5 == 0) {
        await db.setUserCC(email, true);
      }
      await db.setAttendance(date, email, 0, false);
    }
    await sut.handleOrganizeRequest(db, mockZulip, 'lunch stream');

    // When organizing again, then it is an error
    await expect(
      sut.handleOrganizeRequest(db, mockZulip, 'lunch stream'),
    ).rejects.toThrow('already organized; cannot organize again');
  });
});

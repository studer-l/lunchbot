import * as sut from './announce';
import { MockZulip } from '../zulip/zulip_mock_impl';
import { getNextLunchDate } from '../date_utils';
import {
  fAfterAll,
  fAfterEach,
  fBeforeAll,
  fBeforeEach,
  db,
} from '../database/test_fixtures';

describe('announce handler', () => {
  beforeAll(fBeforeAll);
  afterAll(fAfterAll);
  beforeEach(fBeforeEach);
  afterEach(fAfterEach);

  test('Success case', async () => {
    // Given a mocked zulip and an empty database
    const mockZulip = new MockZulip();

    // When a lunch is announced
    await sut.handleAnnounceRequest(db, mockZulip, 'weekly team lunch');

    // then it is a success
    expect(mockZulip.successMessages.length).toBe(1);
    expect(mockZulip.successMessages[0]).toContain(
      'Announced lunch @ #**weekly team lunch>',
    );
    expect(mockZulip.announceMessages.length).toBe(1);
    expect(mockZulip.announceMessages[0].topic).toContain('Groups');
    expect(mockZulip.announceMessages[0].content).toContain(
      'I am organizing the small group lunch for',
    );
  });

  test('Dupe case', async () => {
    // Given a mocked zulip and an database already containg a lunch for next
    // Wednesday
    await db.createLunch(getNextLunchDate());
    const mockZulip = new MockZulip();

    // When a Lunch announcement is requested
    await expect(
      sut.handleAnnounceRequest(db, mockZulip, 'announce stream'),
    ).rejects.toThrow('already scheduled');
  });
});

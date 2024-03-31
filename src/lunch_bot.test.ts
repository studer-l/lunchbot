import * as sut from './lunch_bot';
import { getNextLunchDate } from './date_utils';
import { MockZulip } from './zulip/zulip_mock_impl';
import { SetCreditCardMessage } from './control_message';
import { fAfterAll, fBeforeAll, db } from './database/test_fixtures';

describe('lunch bot', () => {
  beforeAll(fBeforeAll);
  afterAll(fAfterAll);
  afterEach(async () => {
    await db.recreateAll();
  });
  const date = getNextLunchDate();

  describe('mkReactionQueue', () => {
    test('existing lunch', async () => {
      // Given a mock zulip and a lunch is already announced
      const mockZulip = new MockZulip();
      await db.createLunch(date);

      // When creating a reaction queue
      const result = await sut.mkInitialReactionQueue(db, mockZulip);

      // then it succeeds
      expect(result).not.toBeNull();
    });

    test('no existing lunch', async () => {
      // Given a mock zulip and no lunch is announced
      const mockZulip = new MockZulip();

      // When creating a reaction queue
      const result = await sut.mkInitialReactionQueue(db, mockZulip);

      // then no reaction queue is available
      expect(result).toBeNull();
    });
  });

  test('Set Credit Card Request', async () => {
    // Given a control loop with mocked zulip and an empty database
    const mockZulip = new MockZulip();
    const lunchBot = new sut.LunchBot('weekly team lunch', mockZulip, db, null);

    // When a SetCreditCardMessage arrives
    const msg: SetCreditCardMessage = {
      email: 'foo@company.baz',
      hasCreditCard: true,
      messageType: 'SetCreditCardMessage',
    };
    await lunchBot.handleControlMessage(msg);

    // Then a success is reported
    expect(mockZulip.successMessages).toStrictEqual([
      'set foo@company.baz has_credit_card to true',
    ]);
  });
});

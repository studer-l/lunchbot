import * as sut from './types';

describe('organized lunch', () => {
  describe('when not actually organized', () => {
    test('then it is recognized as such', () => {
      const attendees: sut.Attendee[] = [];
      for (let i = 0; i < 16; ++i) {
        attendees.push({
          email: `user${i}@some.org`,
          hasCreditCard: false,
          isCaptain: false,
        });
      }
      const notOrganized = new Map([[0, attendees]]);
      expect(sut.isActuallyOrganized(notOrganized)).toBe(false);
    });
  });
  describe('when organized', () => {
    test('then it is recognized as such', () => {
      const attendees: sut.Attendee[] = [];
      for (let i = 0; i < 16; ++i) {
        attendees.push({
          email: `user${i}@some.org`,
          hasCreditCard: false,
          isCaptain: false,
        });
      }
      const notOrganized = new Map([[1, attendees]]);
      expect(sut.isActuallyOrganized(notOrganized)).toBe(true);
    });
  });
});

describe('lunchContainsUser', () => {
  const attendees: sut.Attendee[] = [
    {
      email: 'user1@some.org',
      hasCreditCard: false,
      isCaptain: false,
    },
    {
      email: 'user2@some.org',
      hasCreditCard: true,
      isCaptain: true,
    }
  ];
  const lunch = new Map([[1, attendees]]);

  test('returns true when user is in the lunch', () => {
    const user: sut.User = { email: 'user1@some.org', hasCreditCard: false };
    expect(sut.lunchContainsUser(lunch, user)).toBe(true);
  });

  test('returns false when user is not in the lunch', () => {
    const user: sut.User = { email: 'user3@some.org', hasCreditCard: false };
    expect(sut.lunchContainsUser(lunch, user)).toBe(false);
  });
});

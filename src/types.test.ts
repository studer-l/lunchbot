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

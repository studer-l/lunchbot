import { xoroshiro128plus } from 'pure-rand';
import * as sut from './chatting';

describe('mkAnnounceMessage', () => {
  test('it creates a message for a given date', () => {
    const date = new Date(2024, 3, 15);
    const { topic, content } = sut.mkAnnounceMessage(date);
    expect(topic).toBe('15/04/2024 Groups');
    expect(content).toMatch(/Monday, 15 April/);
  });
});

describe('mkOrganizedMessage', () => {
  test('it creates a message for a given date with given attendees', () => {
    const prng = xoroshiro128plus(1234);
    const date = new Date(2024, 3, 15);
    const organizedLunch = new Map([
      [
        1,
        [
          {
            fullName: 'Captain',
            email: 'captain@ship.com',
            isCaptain: true,
            hasCreditCard: false,
          },
          {
            fullName: 'Sailor One',
            email: 'sailor1@ship.com',
            hasCreditCard: false,
            isCaptain: false,
          },
          {
            fullName: 'Sailor Two',
            email: 'sailor2@ship.com',
            hasCreditCard: true,
            isCaptain: false,
          },
        ],
      ],
      [
        2,
        [
          {
            fullName: 'Navigator',
            email: 'navigator@ship.com',
            isCaptain: true,
            hasCreditCard: true,
          },
          {
            fullName: 'Admiral',
            email: 'admiral@ship.com',
            hasCreditCard: false,
            isCaptain: true,
          },
        ],
      ],
    ]);
    const { topic, content } = sut.mkOrganizedMessage(
      prng,
      date,
      organizedLunch,
    );
    expect(topic).toBe('15/04/2024 Groups');
    expect(content).toBe(`:alert: Groups have been organized! :point_down:

- Group 1: @_**Captain**, @_**Sailor One**, @_**Sailor Two** (Captain: @_**Captain** :point:, Creditcard: @_**Sailor Two** :dollars:)
- Group 2: @_**Navigator**, @_**Admiral** (Captain: @_**Admiral** :person_with_crown:, Creditcard: @_**Navigator** :money:)
`);
  });
});

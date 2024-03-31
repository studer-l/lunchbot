import * as sut from './most_recent_lunch_pairing';

describe('fromLunchGroups', () => {
  const date0 = new Date(2024, 3, 15);
  const date1 = new Date(2024, 3, 8);
  const lunches = [
    {
      date: date0,
      groups: [
        ['person0', 'person1'],
        ['person2', 'person3'],
      ],
    },
    {
      date: date1,
      groups: [
        ['person0', 'person2'],
        ['person1', 'person3'],
      ],
    },
  ];
  const mrlp = sut.fromLunchGroups(lunches, date1);

  test('parses lunches', () => {
    expect(mrlp.get('person0', 'person1')).toStrictEqual(date0);
    expect(mrlp.get('person2', 'person3')).toStrictEqual(date0);

    expect(mrlp.get('person0', 'person2')).toStrictEqual(date1);
    expect(mrlp.get('person1', 'person3')).toStrictEqual(date1);
  });
});

describe('MostRecentLunchPairing', () => {
  describe('get', () => {
    const date = new Date(2024, 3, 15);
    const lut = { person0: { person1: date } };
    const mrlp = new sut.MostRecentLunchPairing(lut, sut.minDateOf(lut, date));
    test('fails if both inputs are the same', () => {
      expect(() => mrlp.get('person0', 'person0')).toThrow();
    });
    test('same output for any argument order', () => {
      expect(mrlp.get('person0', 'person1')).toStrictEqual(date);
      expect(mrlp.get('person1', 'person0')).toStrictEqual(date);
    });
    test('returns a date in far past for new person', () => {
      expect(mrlp.get('person0', 'person2')).toStrictEqual(
        new Date(2024, 2, 25),
      );
    });
  });

  describe('meanDistance', () => {
    const date0 = new Date(2024, 3, 8);
    const date1 = new Date(2024, 3, 15);
    const date2 = new Date(2024, 3, 22);
    const lunches = [
      {
        date: date0,
        groups: [
          ['person0', 'person1'],
          ['person2', 'person3'],
        ],
      },
      {
        date: date1,
        groups: [
          ['person0', 'person2'],
          ['person1', 'person3'],
        ],
      },
    ];
    const mrlp = sut.fromLunchGroups(lunches, date2);

    test('existing person yields sensible values', () => {
      const person1 = {
        email: 'person1',
        hasCreditCard: false,
        isCaptain: false,
      };
      const person2 = {
        email: 'person2',
        hasCreditCard: false,
        isCaptain: false,
      };
      const person3 = {
        email: 'person3',
        hasCreditCard: false,
        isCaptain: false,
      };

      expect(mrlp.meanDistance(date2, 'person0', [person1, person2])).toBe(1.5);
      expect(mrlp.meanDistance(date2, 'person3', [person1, person2])).toBe(1.5);

      expect(mrlp.meanDistance(date2, 'person0', [person1, person3])).toBe(2.5);
      expect(mrlp.meanDistance(date2, 'person2', [person1, person3])).toBe(2.5);
    });

    test('non-existing person yields sensible values', () => {
      const person1 = {
        email: 'person1',
        hasCreditCard: false,
        isCaptain: false,
      };
      const person2 = {
        email: 'person2',
        hasCreditCard: false,
        isCaptain: false,
      };
      const person3 = {
        email: 'person3',
        hasCreditCard: false,
        isCaptain: false,
      };
      expect(mrlp.meanDistance(date2, 'person4', [person1, person2])).toBe(3);
      expect(mrlp.meanDistance(date2, 'person4', [person1, person2])).toBe(3);

      expect(mrlp.meanDistance(date2, 'person4', [person1, person3])).toBe(3);
      expect(mrlp.meanDistance(date2, 'person4', [person1, person3])).toBe(3);
    });
  });

  describe('deserialize', () => {
    const date0 = new Date(2024, 3, 8);
    const date1 = new Date(2024, 3, 15);

    const lunches = [
      {
        date: date0,
        groups: [
          ['person0', 'person1'],
          ['person2', 'person3'],
        ],
      },
      {
        date: date1,
        groups: [
          ['person0', 'person2'],
          ['person1', 'person3'],
        ],
      },
    ];
    const mrlp = sut.fromLunchGroups(lunches, date1);

    test('can roundtrip mrlp', () => {
      const serialized = JSON.stringify(mrlp.serialize());
      const mrlp2 = sut.deserialize(JSON.parse(serialized));
      const serialized2 = mrlp2.serialize();
      expect(serialized).toBe(JSON.stringify(serialized2));
    });

    test('handles wonky inputs', () => {
      const serialized = {
        lut: {},
        minDate: 'ahahaha',
      };
      expect(() => sut.deserialize(serialized)).toThrow();
    });
  });

  describe('merge', () => {
    const minDate = new Date(2024, 3, 1);

    test('merging an empty MRLP with another MRLP is identity', () => {
      const date = new Date(2024, 3, 15);
      const mrlp = new sut.MostRecentLunchPairing(
        { person0: { person1: date } },
        minDate,
      );
      const empty = new sut.MostRecentLunchPairing({}, minDate);
      const result = mrlp.merge(empty);
      expect(result).toStrictEqual(mrlp);
    });

    test('identity is symmetric', () => {
      const date = new Date(2024, 3, 15);
      const mrlp = new sut.MostRecentLunchPairing(
        { person0: { person1: date } },
        minDate,
      );
      const empty = new sut.MostRecentLunchPairing({}, minDate);
      const result = empty.merge(mrlp);
      expect(result).toStrictEqual(mrlp);
    });

    test('can merge two MRLPs', () => {
      const date0 = new Date(2024, 3, 15);
      const mrlp0 = new sut.MostRecentLunchPairing(
        {
          person0: { person1: date0 },
          person2: { person3: date0 },
        },
        minDate,
      );

      const date1 = new Date(2024, 3, 22);
      const mrlp1 = new sut.MostRecentLunchPairing(
        {
          person0: { person2: date1 }, // new relationship
          person2: { person3: date1 }, // update existing
        },
        minDate,
      );

      const result = mrlp0.merge(mrlp1);

      expect(result).toStrictEqual(
        new sut.MostRecentLunchPairing(
          {
            person0: { person1: date0, person2: date1 },
            person2: { person3: date1 },
          },
          minDate,
        ),
      );
    });
  });
});

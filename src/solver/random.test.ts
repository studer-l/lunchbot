import { xoroshiro128plus } from 'pure-rand';
import * as sut from './random';

describe('shuffle', () => {
  test('shuffles small array deterministically given a seeded prng', () => {
    const prng = xoroshiro128plus(1234);
    const arr = [1, 2, 3, 4];

    sut.shuffle(prng, arr);
    // nb: last element changed
    expect(arr).toStrictEqual([2, 4, 3, 1]);

    // nb: first element remained the same
    sut.shuffle(prng, arr);
    expect(arr).toStrictEqual([2, 3, 1, 4]);

    sut.shuffle(prng, arr);
    expect(arr).toStrictEqual([4, 1, 3, 2]);
  });

  test('each permutation has equal probability', () => {
    const prng = xoroshiro128plus(1234);
    const arr = ['a', 'b', 'c', 'd'];

    const counts: Record<string, number> = {};

    for (let i = 0; i < 2 ** 14; ++i) {
      sut.shuffle(prng, arr);
      const key = arr.join('');
      if (key in counts) {
        counts[key] += 1;
      } else {
        counts[key] = 1;
      }
    }
    expect(counts).toStrictEqual({
      abcd: 719,
      abdc: 657,
      acbd: 697,
      acdb: 676,
      adbc: 685,
      adcb: 710,
      bacd: 632,
      badc: 663,
      bcad: 717,
      bcda: 664,
      bdac: 707,
      bdca: 695,
      cabd: 668,
      cadb: 697,
      cbad: 648,
      cbda: 641,
      cdab: 671,
      cdba: 706,
      dabc: 699,
      dacb: 689,
      dbac: 662,
      dbca: 730,
      dcab: 670,
      dcba: 681,
    });
  });
});

describe('rollFairDice', () => {
  test('is fair', () => {
    const prng = xoroshiro128plus(1234);
    const counts = [0, 0, 0, 0, 0, 0];

    for (let i = 0; i < 6 * 2 ** 10; ++i) {
      const idx = sut.rollFairDice(prng, 6);
      counts[idx] += 1;
    }
    expect(counts).toStrictEqual([1047, 1033, 1006, 1018, 1031, 1009]);
  });
});

describe('samplePDF', () => {
  test('can sample fair dice roll', () => {
    const arr = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
    const prng = xoroshiro128plus(1234);

    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6 * 2 ** 10; ++i) {
      const idx = sut.samplePDF(prng, arr);
      counts[idx] += 1;
    }
    expect(counts).toStrictEqual([1047, 1033, 1006, 1018, 1031, 1009]);
  });
});

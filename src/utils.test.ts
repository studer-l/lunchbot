import * as sut from './utils';
import { setTimeout } from 'node:timers/promises';

async function* numberGen(start: number, delay: number) {
  await setTimeout(delay);
  for (let i = start; i < start + 16; ++i) {
    yield i;
  }
}

describe('zip', () => {
  test('it zips two arrays of the same length', () => {
    const result = sut.zip(['foo', 'bar'], ['qux', '?!']);

    expect(result).toStrictEqual([
      ['foo', 'qux'],
      ['bar', '?!'],
    ]);
  });
  test('it zips arrays of differing length', () => {
    const result0 = sut.zip([1, 2, 3], [4, 5]);
    expect(result0).toStrictEqual([
      [1, 4],
      [2, 5],
    ]);

    const result1 = sut.zip([4, 5], [1, 2, 3]);
    expect(result1).toStrictEqual([
      [4, 1],
      [5, 2],
    ]);
  });

  describe('asyncGenReduce', () => {
    test.skip('for a single generator, is same as the generator itself', async () => {
      const reduced = sut.asyncGenReduce([numberGen(0, 1)]);
      const reference = numberGen(0, 1);

      for (let i = 0; i < 17; ++i) {
        const result = await reduced.next();
        const expected = await reference.next();
        expect(result).toStrictEqual(expected);
      }
    });

    test('for multiple generators, it yields the first result', async () => {
      const reduced = sut.asyncGenReduce([
        numberGen(0, 1),
        numberGen(1000, 100),
      ]);
      const reference0 = numberGen(0, 1);
      const reference1 = numberGen(1000, 100);

      for (let i = 0; i < 16; ++i) {
        const result = await reduced.next();
        const expected = await reference0.next();
        expect(result).toStrictEqual(expected);
      }

      for (let i = 1000; i < 1016; ++i) {
        const result = await reduced.next();
        const expected = await reference1.next();
        expect(result).toStrictEqual(expected);
      }

      const finalResult = await reduced.next();
      expect(finalResult).toStrictEqual({ done: true, value: undefined });
    });
  });
});

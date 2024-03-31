import * as sut from './ordering';

describe('strMin', () => {
  test('aa is less than ab', () => {
    expect(sut.strMin('aa', 'ab')).toBe('aa');
  });
  test('a is less than aa', () => {
    expect(sut.strMin('a', 'aa')).toBe('a');
  });
});

describe('strMax', () => {
  test('ab is greater than aa', () => {
    expect(sut.strMax('aa', 'ab')).toBe('ab');
  });
  test('aa is greater than a', () => {
    expect(sut.strMax('a', 'aa')).toBe('aa');
  });
});

describe('maxBy', () => {
  test('it is an error to call on an empty array', () => {
    expect(() => sut.maxBy([], (a: number) => a)).toThrow();
  });
  test('finds maximum', () => {
    const arr = [
      { value: 4, name: 'four' },
      { value: 5, name: 'five' },
    ];
    expect(sut.maxBy(arr, ({ value }) => value)).toStrictEqual({
      value: 5,
      name: 'five',
    });
  });
});

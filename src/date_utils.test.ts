import * as sut from './date_utils';

describe('getNextLunchDate', () => {
  test('returns next wednesday on a monday', () => {
    const monday = new Date(2024, 3, 8);
    const lunchDay = sut.getNextLunchDate(monday);
    expect(lunchDay).toStrictEqual(new Date(2024, 3, 10));
  });

  test('returns current day on a wednesday', () => {
    const monday = new Date(2024, 2, 20, 1, 40);
    const lunchDay = sut.getNextLunchDate(monday);
    expect(lunchDay).toStrictEqual(new Date(2024, 2, 20));
  });

  test('returns next wednesday on at midnight', () => {
    const monday = new Date(2024, 3, 8, 0, 40);
    const lunchDay = sut.getNextLunchDate(monday);
    expect(lunchDay).toStrictEqual(new Date(2024, 3, 10));
  });

  test('default param', () => {
    expect(sut.getNextLunchDate()).toStrictEqual(
      sut.getNextLunchDate(new Date()),
    );
  });
});

export function strMin(a: string, b: string) {
  return a < b ? a : b;
}

export function strMax(a: string, b: string) {
  return a > b ? a : b;
}

export function maxBy<T>(arr: readonly T[], key: (t: T) => number): T {
  if (arr.length === 0) {
    throw new Error('maxBy over empty array');
  }
  let bestIdx = 0;
  let bestVal = key(arr[0]);
  for (let idx = 1; idx < arr.length; ++idx) {
    const val = key(arr[idx]);
    if (val > bestVal) {
      bestIdx = idx;
      bestVal = val;
    }
  }
  return arr[bestIdx];
}

export function minBy<T>(arr: readonly T[], key: (t: T) => number): T {
  return maxBy(arr, (t) => -key(t));
}

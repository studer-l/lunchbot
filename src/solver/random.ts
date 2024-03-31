import {
  RandomGenerator,
  unsafeUniformIntDistribution,
  xoroshiro128plus,
} from 'pure-rand';
import logger from '../logger';

export function shuffle<T>(prng: RandomGenerator, arr: T[]): void {
  logger.silly(`shuffling an array of length ${arr.length}`);
  for (let i = 0; i <= arr.length - 2; ++i) {
    const j = unsafeUniformIntDistribution(i, arr.length - 1, prng);
    logger.silly(`swaping ${i} with ${j}`);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function uniformFloat(prng: RandomGenerator): number {
  const z = 2 ** 20;
  return unsafeUniformIntDistribution(0, z, prng) / (1.0 + z);
}

/** an inefficient way to sample a PDF given by `arr` */
export function samplePDF(
  prng: RandomGenerator,
  arr: readonly number[],
): number {
  const r = uniformFloat(prng);
  let curr = 0;
  for (let i = 0; i < arr.length; ++i) {
    curr += arr[i];
    if (r < curr) {
      return i;
    }
  }
  throw Error(`bad prng value ${r}, curr = ${curr}`);
}

export function rollFairDice(prng: RandomGenerator, nSide: number): number {
  const r = uniformFloat(prng);
  return Math.floor(r * nSide);
}

/**
 * Given an array, selects a subsequence from it, each item given a probability
 * of `prob` of being added to the resulting array.
 */
export function select<T>(
  prng: RandomGenerator,
  arr: readonly T[],
  prob: number,
): T[] {
  const result = [];
  for (const elem of arr) {
    const r = uniformFloat(prng);
    if (r <= prob) {
      result.push(elem);
    }
  }
  return result;
}

export function deterministicSeed(date: Date): number {
  return 1227204213 + (date.getTime() % 2 ** 24);
}

export function deterministicPrng(date: Date): RandomGenerator {
  const seed = deterministicSeed(date);
  const prng = xoroshiro128plus(seed);
  return prng;
}

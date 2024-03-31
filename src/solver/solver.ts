import { RandomGenerator, xoroshiro128plus } from 'pure-rand';
import { MostRecentLunchPairing } from './most_recent_lunch_pairing';
import { rollFairDice, shuffle } from './random';
import { maxBy, minBy } from './ordering';
import logger from '../logger';
import { OrganizedLunch, User } from '../types';

export function softmax(arr: number[], temp: number): number[] {
  const exps = arr.map((x) => Math.exp(x / temp));
  const norm = exps.reduce((acc, x) => acc + x, 0.0);
  return exps.map((x) => x / norm);
}

function nextGroupSize(lengths: number[]): number {
  const minLength = minBy(lengths, (a) => a);
  const maxLength = maxBy(lengths, (a) => a);
  if (minLength == maxLength) {
    return maxLength + 1;
  }
  return maxLength;
}

export interface Solution {
  assignment: OrganizedLunch;
  score: number;
}

export class Solver {
  private readonly lut: MostRecentLunchPairing;
  private readonly groupSize: number;
  private readonly prng: RandomGenerator;

  constructor(lut: MostRecentLunchPairing, groupSize: number, seed: number) {
    this.lut = lut;
    this.groupSize = groupSize;
    this.prng = xoroshiro128plus(seed);
  }

  score(date: Date, assignment: OrganizedLunch): number {
    return this.lut.score(date, assignment);
  }

  greedy(attendees: readonly User[], date: Date, nSample: number): Solution {
    logger.debug('Solver.greedy', { attendees, date, nSample });
    if (nSample < 0) {
      throw Error('nSample must be larger than 1');
    }

    let bestSolution = this.greedyImpl(attendees, date);
    let bestValue = this.lut.score(date, bestSolution);
    logger.debug('got initial value', { value: bestValue });
    for (let idx = 1; idx < nSample; ++idx) {
      const solution = this.greedyImpl(attendees, date);
      const value = this.lut.score(date, solution);
      if (value > bestValue) {
        logger.debug('greedy solver improved solution', {
          idx,
          newBest: value,
          previousBest: bestValue,
        });
        bestValue = value;
        bestSolution = solution;
      }
    }
    return { assignment: bestSolution, score: bestValue };
  }

  greedyAddOne(
    assignment: Readonly<OrganizedLunch>,
    date: Date,
    attendee: Readonly<User>,
  ): number {
    const { email } = attendee;
    const diffs = [];
    const lengths = Array(...assignment.values()).map((group) => group.length);
    const maxSize = nextGroupSize(lengths);

    for (const [idx, group] of assignment) {
      if (group.length === maxSize) {
        continue;
      }
      const meanDistance = this.lut.meanDistance(date, email, group);
      diffs.push({ meanDistance, idx });
    }
    // choose group with maximum distance
    logger.silly('maximizing locally', { email, diffs });
    const { idx } = maxBy(diffs, ({ meanDistance }) => meanDistance);
    return idx;
  }

  private greedyImpl(attendees: readonly User[], date: Date): OrganizedLunch {
    const nGroups = Math.ceil(attendees.length / this.groupSize);
    const assignment: OrganizedLunch = new Map();

    // initialize
    const remaining = structuredClone(attendees) as User[];
    shuffle(this.prng, remaining);

    // initialize each group with a single member who has a credit card
    let groupIdx = 1;
    let attendeeIdx = 0;
    while (groupIdx <= nGroups && attendeeIdx < remaining.length) {
      const { hasCreditCard } = remaining[attendeeIdx];
      if (hasCreditCard) {
        const { email, hasCreditCard } = remaining[attendeeIdx];
        assignment.set(groupIdx, [{ email, hasCreditCard, isCaptain: false }]);
        remaining.splice(attendeeIdx, 1);
        groupIdx++;
      } else {
        attendeeIdx++;
      }
    }

    logger.debug('greedy solver start', {
      nGroups,
      nAttendees: attendees.length,
      initial: [...assignment],
    });
    while (remaining.length !== 0) {
      logger.silly('greedy solver iteration iteration', {
        nUnassigned: remaining.length,
      });
      const attendee = remaining.pop()!;
      const { email, hasCreditCard } = attendee;
      const idx = this.greedyAddOne(assignment, date, attendee);
      assignment.get(idx)?.push({ email, hasCreditCard, isCaptain: false });
    }

    // choose a random captain for each group
    for (const group of assignment.values()) {
      const captainIdx = rollFairDice(this.prng, group.length);
      group[captainIdx].isCaptain = true;
    }

    return assignment;
  }
}

import { xoroshiro128plus } from 'pure-rand';
import * as sut from './solver';
import { subWeeks } from 'date-fns';
import { MostRecentLunchPairing } from './most_recent_lunch_pairing';
import { select, uniformFloat } from './random';
import logger from '../logger';
import { maxBy, minBy } from './ordering';
import { zip } from '../utils';

function mkFixture(nPeople: number, nDates: number) {
  const prng = xoroshiro128plus(42);
  const people = [...Array(nPeople).keys()].map((idx) => {
    const email = `person${idx}`;
    const hasCreditCard = uniformFloat(prng) > 0.5;
    const isCaptain = false;
    return { email, isCaptain, hasCreditCard };
  });

  let current = new Date();
  const dates = [current];
  for (let i = 1; i < nDates; ++i) {
    current = subWeeks(current, 1);
    dates.push(current);
  }
  dates.reverse();

  const seed = 1837193;
  const groupSize = 6;
  const mrlp = new MostRecentLunchPairing({}, dates[0]);
  const solver = new sut.Solver(mrlp, groupSize, seed);
  return { prng, people, dates, solver, mrlp };
}

describe('solver', () => {
  describe('greedy', () => {
    test('finds good solutions after some iterations', () => {
      const { prng, people, dates, solver, mrlp } = mkFixture(30, 20);
      // empirically attained
      const minScores = [
        0, 40, 70, 70, 70, 90, 90, 90, 90, 140, 100, 90, 80, 168, 110, 170, 170,
        160, 140, 140,
      ];

      for (const [date, minScore] of zip(dates, minScores)) {
        const attendees = select(prng, people, 0.6);
        const attendeeSet = new Set(attendees.map(({ email }) => email));
        logger.debug('computing new solution', {
          date,
          nPeople: attendees.length,
        });
        const { assignment, score } = solver.greedy(attendees, date, 20);

        // sanity check 1: set of people remains the same
        const allPeople = new Set();
        for (const group of assignment.values()) {
          group.forEach(({ email }) => allPeople.add(email));
        }
        expect(allPeople).toStrictEqual(attendeeSet);

        for (const group of assignment.values()) {
          const { nCaptains, nCC } = group.reduce(
            ({ nCaptains, nCC }, { isCaptain, hasCreditCard }) => {
              return {
                nCaptains: nCaptains + (isCaptain ? 1 : 0),
                nCC: nCC + (hasCreditCard ? 1 : 0),
              };
            },
            { nCaptains: 0, nCC: 0 },
          );

          // sanity check 2: each group has one captain
          expect(nCaptains).toEqual(1);

          // sanity check 3: each group has at least one credit card holder
          expect(nCC).toBeGreaterThan(0);

          // sanity check 4: groups have roughly the same size
          const sizes = Array(...assignment.values()).map(
            (group) => group.length,
          );
          const maxLength = maxBy(sizes, (a) => a);
          const minLength = minBy(sizes, (a) => a);
          expect(maxLength - minLength).toBeLessThanOrEqual(1);

          // sanity check 5: attained value function is good
          expect(score).toBeGreaterThanOrEqual(minScore);
        }
        mrlp.updateAssignment(assignment, date);
      }
    });
  });
});

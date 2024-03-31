import { compareAsc, differenceInWeeks, min, max, subWeeks } from 'date-fns';
import { strMin, strMax } from './ordering';
import logger from '../logger';
import { Attendee, OrganizedLunch } from '../types';

export interface LunchGroups {
  readonly date: Date;
  readonly groups: string[][];
}

export function fromLunchGroups(
  lunchGroups: LunchGroups[],
  date: Date,
): MostRecentLunchPairing {
  const mrlp = new MostRecentLunchPairing({}, subWeeks(date, 3));
  // ensure lunches are ordered
  lunchGroups.sort((lhs, rhs) => compareAsc(lhs.date, rhs.date));
  for (const { date, groups } of lunchGroups) {
    for (const group of groups) {
      mrlp.updateGroup(group, date);
    }
  }
  return mrlp;
}

export interface SerializedMRLP {
  readonly lut: Record<string, Record<string, Date>>;
  readonly minDate: Date;
}

/** result of `JSON.parse(JSON.stringify(mrlp.serialize()))` as retrieved from postgres */
export interface DeserializedMRLP {
  readonly lut: Record<string, Record<string, string>>;
  readonly minDate: string;
}

/** Parse JSON representation for mrlp */
export function deserialize(
  serialized: DeserializedMRLP,
): MostRecentLunchPairing {
  const parsedLut: Record<string, Record<string, Date>> = {};
  const { lut, minDate } = serialized;
  for (const email0 in lut) {
    parsedLut[email0] = {};
    for (const email1 in lut[email0]) {
      const stringifiedDate = lut[email0][email1];
      const parsed = Date.parse(stringifiedDate);
      if (isNaN(parsed)) {
        logger.error('failed to parse pairing', {
          email0,
          email1,
          stringifiedDate,
        });
        continue;
      }
      parsedLut[email0][email1] = new Date(parsed);
    }
  }
  const parsedMinDate = Date.parse(minDate);
  if (isNaN(parsedMinDate)) {
    logger.error('failed to parse minDate', { minDate });
    throw new Error(`bad minDate: ${minDate}`);
  }
  return new MostRecentLunchPairing(parsedLut, new Date(parsedMinDate));
}

export function minDateOf(
  lut: Record<string, Record<string, Date>>,
  date: Date,
): Date {
  let minDate = date;
  for (const email0 in lut) {
    for (const email1 in lut[email0]) {
      minDate = min([minDate, lut[email0][email1]]);
    }
  }
  return subWeeks(minDate, 3);
}

export class MostRecentLunchPairing {
  private readonly lut: Record<string, Record<string, Date>>;
  private minDate: Date;

  constructor(lut: Record<string, Record<string, Date>>, minDate: Date) {
    this.lut = lut;
    this.minDate = minDate;
  }

  serialize(): SerializedMRLP {
    return { lut: this.lut, minDate: this.minDate };
  }

  updateMinDate(date: Date) {
    this.minDate = minDateOf(this.lut, date);
  }

  private order(email0: string, email1: string): [string, string] {
    const first = strMin(email0, email1);
    const second = strMax(email0, email1);
    return [first, second];
  }

  private tryGet(email0: string, email1: string): Date | undefined {
    if (email0 == email1) {
      throw Error('logic error, email0 == email1');
    }
    const [first, second] = this.order(email0, email1);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.lut[first] === undefined) {
      return undefined;
    }
    return this.lut[first][second];
  }

  get(email0: string, email1: string): Date {
    return this.tryGet(email0, email1) ?? this.minDate;
  }

  set(email0: string, email1: string, date: Date): void {
    if (email0 == email1) {
      throw Error('logic error, email0 == email1');
    }
    const [first, second] = this.order(email0, email1);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.lut[first] === undefined) {
      this.lut[first] = {};
    }
    this.lut[first][second] = date;
  }

  setMax(email0: string, email1: string, date: Date): void {
    const previous = this.get(email0, email1);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (previous === undefined || previous < date) {
      this.set(email0, email1, date);
    }
  }

  updateAssignment(assignment: OrganizedLunch, date: Date) {
    for (const group of assignment.values()) {
      this.updateGroup(
        group.map(({ email }) => email),
        date,
      );
    }
    this.updateMinDate(date);
  }

  updateGroup(group: readonly string[], date: Date) {
    for (const email0 of group) {
      for (const email1 of group) {
        if (email0 === email1) {
          continue;
        }
        this.set(email0, email1, date);
      }
    }
  }

  updateGroupMax(group: readonly string[], date: Date) {
    for (const email0 of group) {
      for (const email1 of group) {
        if (email0 === email1) {
          continue;
        }
        this.setMax(email0, email1, date);
      }
    }
  }

  /** mean weeks since users in `group` had lunch with `email` */
  meanDistance(date: Date, email0: string, group: readonly Attendee[]): number {
    const sumDistance = group.reduce((acc, { email }) => {
      if (email0 == email) {
        return acc;
      }
      return acc + differenceInWeeks(date, this.get(email0, email));
    }, 0.0);
    return sumDistance / group.length;
  }

  private sumDistance(date: Date, group: readonly Attendee[]): number {
    return group.reduce((acc, { email }) => {
      return acc + this.meanDistance(date, email, group);
    }, 0.0);
  }

  score(date: Date, assignment: OrganizedLunch): number {
    let objective = 0;
    for (const group of assignment.values()) {
      objective += this.sumDistance(date, group);
    }
    return objective;
  }

  allEmails(): Set<string> {
    const keys = new Set<string>();
    for (const key0 in this.lut) {
      keys.add(key0);
      for (const key1 in this.lut[key0]) {
        keys.add(key1);
      }
    }
    return keys;
  }

  merge(other: MostRecentLunchPairing): MostRecentLunchPairing {
    const minDate = max([this.minDate, other.minDate]);
    const result = new MostRecentLunchPairing({}, minDate);

    const lhsKeys = this.allEmails();
    const rhsKeys = other.allEmails();

    const allKeysSet = new Set([...lhsKeys, ...rhsKeys]);
    const allKeys = new Array(...allKeysSet.values());

    // now perform pairwise merge
    for (let i = 0; i < allKeys.length; ++i) {
      for (let j = i + 1; j < allKeys.length; ++j) {
        const [first, second] = this.order(allKeys[i], allKeys[j]);
        const dates = [];
        const lhs = this.tryGet(allKeys[i], allKeys[j]);
        if (lhs) {
          dates.push(lhs);
        }
        const rhs = other.tryGet(allKeys[i], allKeys[j]);
        if (rhs) {
          dates.push(rhs);
        }

        if (dates.length) {
          result.set(first, second, max(dates));
        }
      }
    }
    return result;
  }

  maxDate() {
    let maxDate = null;
    for (const email0 in this.lut) {
      for (const email1 in this.lut[email0]) {
        if (maxDate === null) {
          maxDate = this.lut[email0][email1];
        } else {
          maxDate = max([maxDate, this.lut[email0][email1]]);
        }
      }
    }
    return maxDate;
  }
}

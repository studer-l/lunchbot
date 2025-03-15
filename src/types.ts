export class Lunch {
  readonly date: Date;
  readonly zulipGroupMessageId: number | null;

  constructor(date: Date, zulipGroupMessageId: number | null) {
    this.date = date;
    this.zulipGroupMessageId = zulipGroupMessageId;
  }

  initialAssignmentDone(): boolean {
    return this.zulipGroupMessageId !== null;
  }
}

export interface User {
  email: string;
  hasCreditCard: boolean;
}

export type LastCaptainDates = Map<string, Date>;

export interface Attendee extends User {
  isCaptain: boolean;
}

export type GroupId = number;

export type OrganizedLunch = Map<GroupId, Attendee[]>;

export function isActuallyOrganized(lunch: OrganizedLunch): boolean {
  const groups = [...lunch.keys()];
  /* initially all lunches start out with a single group (id 0) */
  return groups.length >= 1 && !groups.includes(0);
}

export function lunchContainsUser(lunch: OrganizedLunch, user: User): boolean {
  for (const attendees of lunch.values()) {
    if (attendees.some(attendee => attendee.email === user.email)) {
      return true;
    }
  }
  return false;
}

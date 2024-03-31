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

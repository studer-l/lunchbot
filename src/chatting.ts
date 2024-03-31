import { RandomGenerator } from 'pure-rand';
import { zip } from './utils';
import { shuffle } from './solver/random';
import { Attendee, User } from './types';

export interface ChatMessage {
  readonly topic: string;
  readonly content: string;
}

export function mkAnnounceTopic(date: Date): string {
  const topicDate = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${topicDate} Groups`;
}

export function mkAnnounceMessage(date: Date): ChatMessage {
  const msgDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    weekday: 'long',
    month: 'long',
  });
  const content = `Hey everyone :wave:

I am organizing the small group lunch for **${msgDate}** :yum:
Please react to this post with a :fork_and_knife_with_plate: to sign up! You can sign-off at any time by removing your reaction!

I will create groups around noon on Monday! :time_ticking:`;

  return {
    topic: mkAnnounceTopic(date),
    content,
  };
}

export function mkAnnounceSuccessContent(
  date: Date,
  announceStream: string,
): string {
  const topic = mkAnnounceTopic(date);
  const topicLink = `#**${announceStream}>${topic}**`;
  return `Announced lunch @ ${topicLink}`;
}

export function mkOrganizeSuccessContent(
  topic: string,
  announceStream: string,
  score: number,
): string {
  const topicLink = `#**${announceStream}>${topic}**`;
  return `Organized lunch @ ${topicLink}\nscore = ${score}`;
}

export function mkIncrementalSuccessMsg(attendee: User, score: number): string {
  return `added ${attendee.email} to active lunch, new score ${score}`;
}

export interface ZulipAttendee extends Attendee {
  /** current name in zulip, i.e. "Jane Doe". */
  fullName: string;
}

const ccEmojis = [
  ':money:',
  ':money_with_wings:',
  ':dollar_bills:',
  ':dollars:',
  ':yen_banknotes:',
  ':euro_banknotes:',
  ':pound_notes:',
  ':coin:',
  ':credit_card:',
  ':gem:',
];

const captainEmojis = [
  ':pilot:',
  ':woman_pilot:',
  ':salute:',
  ':point:',
  ':brain:',
  ':raising_hand:',
  ':man_raising_hand:',
  ':woman_raising_hand:',
  ':crown:',
  ':person_with_crown:',
  ':medal:',
  ':horn:',
  ':note:',
];

function groupContent(
  groupId: number,
  ccEmoji: string,
  captainEmoji: string,
  members: readonly ZulipAttendee[],
): string {
  let result = `- Group ${groupId}: `;
  let ccHolder: string | undefined = undefined;
  let captain: string | undefined = undefined;
  for (const { fullName, isCaptain, hasCreditCard } of members) {
    if (isCaptain) {
      captain = fullName;
    }
    if (ccHolder === undefined && hasCreditCard) {
      ccHolder = fullName;
    }
  }
  result += members.map(({ fullName }) => `@_**${fullName}**`).join(', ');
  result += ` (Captain: @_**${captain}** ${captainEmoji}, Creditcard: @_**${ccHolder}** ${ccEmoji})\n`;
  return result;
}

export function mkOrganizedMessage(
  prng: RandomGenerator,
  date: Date,
  groups: ReadonlyMap<number, readonly ZulipAttendee[]>,
): ChatMessage {
  const topic = mkAnnounceTopic(date);
  const ccEmojis_ = ccEmojis.slice();
  const captainEmojis_ = captainEmojis.slice();
  shuffle(prng, ccEmojis_);
  shuffle(prng, captainEmojis_);

  const emojis = zip(ccEmojis_, captainEmojis_).map(
    ([ccEmoji, captainEmoji]) => {
      return { ccEmoji, captainEmoji };
    },
  );

  let content = ':alert: Groups have been organized! :point_down:\n\n';
  // sort groups
  const sorted = new Array<[number, readonly ZulipAttendee[]]>(...groups);
  sorted.sort((lhs, rhs) => lhs[0] - rhs[0]);
  for (const [groupId, attendees] of sorted) {
    const { ccEmoji, captainEmoji } = emojis[(groupId - 1) % emojis.length];
    content += groupContent(groupId, ccEmoji, captainEmoji, attendees);
  }
  return { topic, content };
}

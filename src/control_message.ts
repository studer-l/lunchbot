export interface SetCreditCardMessage {
  readonly email: string;
  readonly hasCreditCard: boolean;
  readonly messageType: 'SetCreditCardMessage';
}

export interface AnnounceRequestMessage {
  readonly messageType: 'AnnounceRequestMessage';
}

export interface OrganizeRequestMessage {
  readonly messageType: 'OrganizeRequestMessage';
}

export interface FixupMessage {
  readonly messageType: 'FixupMessage';
  readonly messageId: number;
}

export interface BadMessage {
  readonly errorMessage: string;
  readonly messageType: 'BadMessage';
}

export interface HistoryInsertMessage {
  readonly messageType: 'HistoryInsertMessage';
  readonly date: Date;
  readonly groups: readonly (readonly string[])[];
}

export interface Reaction {
  readonly user: string;
  readonly emoji: string;
  readonly op: 'add' | 'remove';
}

export interface ReactionMessage {
  readonly messageType: 'ReactionMessage';
  readonly reaction: Reaction;
}

export interface LunchExpiredMessage {
  readonly messageType: 'LunchExpiredMessage';
}

/** Can be received from Zulip */
export type ControlMessage =
  | SetCreditCardMessage
  | AnnounceRequestMessage
  | OrganizeRequestMessage
  | HistoryInsertMessage
  | FixupMessage
  | ReactionMessage
  | LunchExpiredMessage
  | BadMessage;

interface ZulipMessage {
  readonly content: string;
}

export function mkControlMessageFromZulipMessage(
  message: ZulipMessage,
): ControlMessage {
  const { content } = message;
  const setCCre = /!setcc ([\w@.\-_]+) (true|false)/;
  const ccMatches = setCCre.exec(content);
  if (ccMatches) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, email, hasCreditCard] = ccMatches;
    return {
      email,
      hasCreditCard: hasCreditCard === 'true',
      messageType: 'SetCreditCardMessage',
    };
  }

  const historyRe = /!history (\d{1,2})\.(\d{1,2})\.(\d{4}) (.+)/;
  const historyMatches = historyRe.exec(content);
  if (historyMatches) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_m, day, month, year, groups] = historyMatches;
    try {
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        12,
        0,
      );
      return {
        messageType: 'HistoryInsertMessage',
        date,
        groups: JSON.parse(groups),
      };
    } catch (err) {
      if (err instanceof SyntaxError) {
        return {
          messageType: 'BadMessage',
          errorMessage: 'failed to parse JSON',
        };
      }
      throw err;
    }
  }

  const fixUpRe = /!fix (\d+)/;
  const fixUpMatch = fixUpRe.exec(content);
  if (fixUpMatch) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_m, msgId] = fixUpMatch;
    return {
      messageType: 'FixupMessage',
      messageId: Number(msgId),
    };
  }

  switch (content) {
    case '!announce':
      return {
        messageType: 'AnnounceRequestMessage',
      };
    case '!organize':
      return {
        messageType: 'OrganizeRequestMessage',
      };
    default:
      return {
        messageType: 'BadMessage',
        errorMessage: 'Did not understand command',
      };
  }
}

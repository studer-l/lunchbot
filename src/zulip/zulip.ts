import { ControlMessage } from '../control_message';
import { ChatMessage, ZulipAttendee } from '../chatting';
import { OrganizedLunch } from '../types';

export abstract class ReactionQueue {
  abstract next(): Promise<ControlMessage>;
  abstract close(): Promise<void>;
}

export abstract class Zulip {
  /** Obtain zulip user id by email */
  abstract getUserNameByEmail(email: string): Promise<string>;

  /** obtain emails of all usrs */
  abstract getAllUsersEmail(): Promise<string[]>;

  /** Send `chatMessage` checking for success */
  abstract sendPublicMessage(chatMessage: ChatMessage): Promise<number>;

  abstract updatePublicMessage(
    chatMessage: ChatMessage,
    messageId: number,
  ): Promise<void>;

  /** obtain all :hungry: reactions on `messageId` excluding the bot itself */
  abstract getReactions(messageId: number): Promise<string[]>;

  /**
   * Send `chatMessage` as initial announcement, adding the initial reactions
   */
  abstract announce(chatMessage: ChatMessage): Promise<void>;

  /** report `message` as failure to control topic */
  abstract failed(message: string): Promise<void>;

  /** report `error` to control topic */
  abstract error(error: Error): Promise<void>;

  /** confirm that operation succeeded in control topic */
  abstract success(successContent: string): Promise<void>;

  /** add full names to attendees */
  async addFullNames(
    lunch: OrganizedLunch,
  ): Promise<Map<number, readonly ZulipAttendee[]>> {
    const result = new Map<number, readonly ZulipAttendee[]>();
    for (const [groupId, group] of lunch) {
      const zulipGroup = group.map(async (attendee) => {
        const fullName = await this.getUserNameByEmail(attendee.email);
        return { fullName, ...attendee };
      });
      result.set(groupId, await Promise.all(zulipGroup));
    }
    return result;
  }

  /** yields control messages as parsed from control topic */
  abstract controlMessage(): AsyncGenerator<ControlMessage, void, void>;

  /** obtain queue of reactions matching given topic */
  abstract mkReactionQueue(topic: string): Promise<ReactionQueue>;
}

/* eslint @typescript-eslint/require-await: off */
/* eslint @typescript-eslint/no-unused-vars: off */
/* eslint @typescript-eslint/no-empty-function: off */

import { ChatMessage } from '../chatting';
import { ReactionQueue, Zulip } from './zulip';
import { ControlMessage, Reaction } from '../control_message';

interface MessageUpdates {
  chatMessage: ChatMessage;
  messageId: number;
}

class MockQueue extends ReactionQueue {
  async next(): Promise<ControlMessage> {
    return {
      messageType: 'ReactionMessage',
      reaction: { user: 'test@user.com', emoji: 'hungry', op: 'add' },
    };
  }

  confirm(): void {}

  async close(): Promise<void> {}
}

export class MockZulip extends Zulip {
  successMessages: string[];
  announceMessages: ChatMessage[];
  errors: Error[];
  failureMessages: string[];
  updateMessages: MessageUpdates[];
  publicMessages: ChatMessage[];

  constructor() {
    super();
    this.successMessages = [];
    this.announceMessages = [];
    this.errors = [];
    this.failureMessages = [];
    this.updateMessages = [];
    this.publicMessages = [];
  }

  async getUserNameByEmail(_email: string): Promise<string> {
    return 'Spencer';
  }

  getAllUsersEmail(): Promise<string[]> {
    throw new Error('not implemented');
  }

  async sendPublicMessage(chatMessage: ChatMessage): Promise<number> {
    this.publicMessages.push(chatMessage);
    return 48;
  }

  async updatePublicMessage(
    chatMessage: ChatMessage,
    messageId: number,
  ): Promise<void> {
    this.updateMessages.push({ chatMessage, messageId });
  }

  async getReactions(messageId: number): Promise<string[]> {
    throw new Error('not implemented');
  }

  async announce(chatMessage: ChatMessage): Promise<void> {
    this.announceMessages.push(chatMessage);
  }

  async failed(message: string): Promise<void> {
    this.failureMessages.push(message);
  }

  async error(error: Error): Promise<void> {
    this.errors.push(error);
  }

  async success(successContent: string): Promise<void> {
    this.successMessages.push(successContent);
  }

  controlMessage(): AsyncGenerator<ControlMessage, void, void> {
    throw new Error('not implemented');
  }

  reaction(_topic: string): AsyncGenerator<Reaction, void, void> {
    throw new Error('not implemented');
  }

  async mkReactionQueue(_topic: string): Promise<ReactionQueue> {
    return await new Promise((resolve) => {
      resolve(new MockQueue());
    });
  }

  messageCounts() {
    return {
      successMessages: this.successMessages.length,
      announceMessages: this.announceMessages.length,
      errors: this.errors.length,
      failureMessages: this.failureMessages.length,
      updateMessages: this.updateMessages.length,
      publicMessages: this.publicMessages.length,
    };
  }
}

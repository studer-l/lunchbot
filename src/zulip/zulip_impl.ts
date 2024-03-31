/* eslint @typescript-eslint/no-unsafe-call: off */
/* eslint @typescript-eslint/no-unsafe-assignment: off */
/* eslint @typescript-eslint/no-unsafe-argument: off */
/* eslint @typescript-eslint/no-unsafe-return: off */
/* eslint @typescript-eslint/no-unsafe-member-access: off */

import logger from '../logger';
import { Config } from '../config';
import zulipInit, { ZulipResources } from 'zulip-js';
import {
  ControlMessage,
  mkControlMessageFromZulipMessage,
} from '../control_message';
import { ChatMessage } from '../chatting';
import { Zulip, ReactionQueue } from './zulip';
import { ReactionQueueImpl } from './ReactionQueueImpl';

interface Queue {
  queue_id: number;
  last_event_id: number;
}

export interface ZulipResponse {
  readonly result: 'success' | 'error';
}

export function checkZulipResult(response: ZulipResponse, errMsg: string) {
  if (response.result != 'success') {
    logger.error(errMsg, response);
    throw new Error(errMsg);
  }
}

export class ZulipImpl extends Zulip {
  private readonly zulip: ZulipResources;
  private readonly announceStream: string;
  private readonly controlStream: string;
  private readonly controlTopic: string;
  private readonly botEmail: string;

  constructor(
    zulip: ZulipResources,
    announceStream: string,
    controlStream: string,
    controlTopic: string,
    botEmail: string,
  ) {
    super();
    this.zulip = zulip;
    this.announceStream = announceStream;
    this.controlStream = controlStream;
    this.controlTopic = controlTopic;
    this.botEmail = botEmail;
  }

  async getUserNameByEmail(email: string): Promise<string> {
    const response = await this.zulip.callEndpoint(`/users/${email}`, 'GET');
    checkZulipResult(response, `failed to get user ${email}`);
    return response.user.full_name;
  }

  async getAllUsersEmail(): Promise<string[]> {
    const response = await this.zulip.users.retrieve();
    checkZulipResult(response, 'failed to obtain list of all users');
    const members: { email: string }[] = response.members;
    return members.map(({ email }) => email);
  }

  private async addInitialReaction(messageId: number): Promise<void> {
    const response = await this.zulip.reactions.add({
      message_id: messageId,
      emoji_name: 'hungry',
    });
    checkZulipResult(response, 'failed to add initial reaction');
  }

  async sendPublicMessage(chatMessage: ChatMessage): Promise<number> {
    const { topic, content } = chatMessage;
    const result = await this.zulip.messages.send({
      type: 'stream',
      to: this.announceStream,
      content,
      topic,
    });
    checkZulipResult(result, 'failed to send announcement message');
    logger.debug('sent message', result);
    return result.id;
  }

  async updatePublicMessage(
    chatMessage: ChatMessage,
    messageId: number,
  ): Promise<void> {
    const { content } = chatMessage;
    const result = await this.zulip.messages.update({
      message_id: messageId,
      content: content,
    });
    checkZulipResult(result, 'failed to update public message');
    logger.debug('updated message', result);
  }

  async announce(chatMessage: ChatMessage): Promise<void> {
    const messageId = await this.sendPublicMessage(chatMessage);
    await this.addInitialReaction(messageId);
  }

  async getReactions(messageId: number): Promise<string[]> {
    const result = await this.zulip.messages.getById({ message_id: messageId });
    checkZulipResult(result, `failed to get message with id ${messageId}`);
    const emails = [];
    for (const { emoji_name, user } of result.message.reactions) {
      const { email } = user;
      if (email == this.botEmail) {
        continue;
      }
      if (emoji_name != 'hungry') {
        continue;
      }
      emails.push(email);
    }
    return emails;
  }

  async failed(message: string): Promise<void> {
    logger.debug('reporting failure to zulip', { message });
    await this.zulip.messages.send({
      type: 'stream',
      to: this.controlStream,
      content: `:bomb: Error: ${message}`,
      topic: this.controlTopic,
    });
  }

  async error(error: Error): Promise<void> {
    await this.failed(`Caught ${error.name}: ${error.message}`);
  }

  async success(successContent: string): Promise<void> {
    logger.debug('reporting success to zulip', { successContent });
    await this.zulip.messages.send({
      type: 'stream',
      to: this.controlStream,
      content: `:check: OK: ${successContent}`,
      topic: this.controlTopic,
    });
  }

  private async mkControlMessageQueue(): Promise<Queue> {
    const options = {
      event_types: ['message'],
      narrow: [
        ['stream', this.controlStream],
        ['topic', this.controlTopic],
      ],
    };
    logger.debug('registering control message queue', options);
    const response = await this.zulip.queues.register(options);
    checkZulipResult(response, 'failed to register event queue');
    logger.debug('got register queue response', response);
    return {
      queue_id: response.queue_id,
      last_event_id: response.last_event_id,
    };
  }

  async *controlMessage(): AsyncGenerator<ControlMessage, void, void> {
    const queue = await this.mkControlMessageQueue();
    for (;;) {
      const response = await this.zulip.events.retrieve(queue);
      for (const event of response.events) {
        queue.last_event_id = Math.max(event.id, queue.last_event_id);
        if (event.type === 'heartbeat') {
          logger.debug('received heartbeat event', response);
          continue;
        }
        logger.debug('received non-heartbeat event', { event });
        if (event.message.sender_email === this.botEmail) {
          // prevent reply to own message;
          continue;
        }
        yield mkControlMessageFromZulipMessage(event.message);
      }
    }
  }

  async mkReactionQueue(topic: string): Promise<ReactionQueue> {
    // FIXME: this also includes reaction to replies to unrelated replies
    // FIXME: missed all reactions while bot was not running
    const options = {
      event_types: ['reaction'],
      narrow: [
        ['stream', this.announceStream],
        ['topic', topic],
      ],
    };
    logger.debug('registering reaction message queue', options);
    const response = await this.zulip.queues.register(options);
    checkZulipResult(response, 'failed to register event queue');
    logger.debug('got register queue response', response);
    return new ReactionQueueImpl(
      this.zulip,
      this.botEmail,
      response.queue_id,
      response.last_event_id,
    );
  }
}

export async function mkZulip(config: Config): Promise<Zulip> {
  logger.debug('initializing zulip');
  const { announceStream, controlStream, zulipConfig, controlTopic } = config;
  const zulip = await zulipInit(zulipConfig);
  return new ZulipImpl(
    zulip,
    announceStream,
    controlStream,
    controlTopic,
    zulipConfig.username,
  );
}

import { readConfigFromEnv } from '../config';
import * as sut from './zulip_impl';

describe('mkZulip', () => {
  test('creates zulip connection from config', async () => {
    const config = readConfigFromEnv();
    const chatting = await sut.mkZulip(config);
    expect(chatting).toBeDefined();
  });
});

describe('Zulip', () => {
  const config = readConfigFromEnv();

  test.skip('can send announcement', async () => {
    const zulip = await sut.mkZulip(config);
    await zulip.announce({ content: 'hello world', topic: 'test' });
  });

  test.skip('can get user id', async () => {
    const zulip = await sut.mkZulip(config);
    const userName = await zulip.getUserNameByEmail('lukas.studer@distran.ch');
    expect(userName).toBe('Lukas Studer');
  });

  test('when getting non-existent user by email', async () => {
    const zulip = await sut.mkZulip(config);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(zulip.getUserNameByEmail('none-such@distran.ch')).rejects.toThrow();
  });

  test('can get list of all users', async () => {
    const zulip = await sut.mkZulip(config);
    const emails = await zulip.getAllUsersEmail();
    expect(emails.length).toBeGreaterThan(50);
  });

  test('can get full list of reactions', async () => {
    const zulip = await sut.mkZulip(config);
    const reactions = await zulip.getReactions(946735);
    expect(reactions.length).toBeGreaterThan(30);
  });

  describe('reaction queue', () => {
    test('can create and destroy', async () => {
      const zulip = await sut.mkZulip(config);

      const queue = await zulip.mkReactionQueue('10/04/2024 Groups');
      await queue.close();
    });

    test('using a closed queue is an error', async () => {
      const zulip = await sut.mkZulip(config);
      const queue = await zulip.mkReactionQueue('10/04/2024 Groups');

      await expect(async () => {
        await queue.close();
        await queue.next();
      }).rejects.toThrow('failed to retrieve event from queue');
    });
  });
});

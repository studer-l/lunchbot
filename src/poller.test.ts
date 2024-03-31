import * as sut from './poller';
import { setTimeout } from 'node:timers/promises';

describe('poller', () => {
  test('can wrap a single promise', async () => {
    // given a poller
    const poller = new sut.Poller();
    const pollItem = new sut.PollItem(() => {
      return setTimeout(10, 'done');
    });
    poller.push(pollItem);

    // then it can be polled
    const result = await poller.poll();
    expect(result).toBe('done');

    // to avoid open handles
    await pollItem.drain();
  });

  test('can race', async () => {
    // given a poller
    const poller = new sut.Poller();
    const pollItem0 = new sut.PollItem(() => {
      return setTimeout(100, 'done0');
    });
    const pollItem1 = new sut.PollItem(() => {
      return setTimeout(1, 'done1');
    });
    poller.push(pollItem0);
    poller.push(pollItem1);

    // then it can be polled
    const result = await poller.poll();
    expect(result).toBe('done1');

    // to avoid open handles
    await pollItem0.drain();
    await pollItem1.drain();
  });

  test('can pop', async () => {
    // given a poller
    const poller = new sut.Poller();
    const pollItem0 = new sut.PollItem(() => {
      return setTimeout(100, 'done0');
    });
    const pollItem1 = new sut.PollItem(() => {
      return setTimeout(1, 'done1');
    });
    poller.push(pollItem0);
    poller.push(pollItem1);
    poller.pop();

    // then it can be polled
    const result = await poller.poll();
    expect(result).toBe('done0');

    // to avoid open handles
    await pollItem0.drain();
    await pollItem1.drain();
  });

  test('can repeat', async () => {
    // given a poller
    const poller = new sut.Poller();
    const pollItem = new sut.PollItem(() => {
      return setTimeout(10, 'done');
    });
    poller.push(pollItem);

    // then it can be polled
    const result = await poller.poll();
    expect(result).toBe('done');
    expect(result).toBe('done');
    expect(result).toBe('done');

    // to avoid open handles
    await pollItem.drain();
  });

  describe('delay', () => {
    test('can delay single value', async () => {
      const poller = new sut.Poller();
      poller.push(sut.delay(10, 'quick'));

      const result = await poller.poll();
      expect(result).toBe('quick');
      expect(poller.length()).toBe(0);
    });

    test('can delay multiple values', async () => {
      const poller = new sut.Poller();
      poller.push(sut.delay(10, 'one'));
      poller.push(sut.delay(20, 'two'));
      poller.push(sut.delay(30, 'three'));

      const result0 = await poller.poll();
      const result1 = await poller.poll();
      const result2 = await poller.poll();
      expect(result0).toBe('one');
      expect(result1).toBe('two');
      expect(result2).toBe('three');
      expect(poller.length()).toBe(0);
    });
  });
});

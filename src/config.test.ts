import * as sut from './config';

describe('readEnv', () => {
  test('throws error when not defined', () => {
    expect(() => sut.readEnv('foobarbaz')).toThrow();
  });
  test('reads $PATH', () => {
    expect(sut.readEnv('PATH')).toBeDefined();
  });
});

describe('readZulipConfigFromEnv', () => {
  test('succeeds in test environment', () => {
    expect(sut.readZulipConfigFromEnv()).toBeDefined();
  });
});

describe('readConfigFromEnv', () => {
  test('succeeds in test environment', () => {
    expect(sut.readConfigFromEnv()).toBeDefined();
  });
});

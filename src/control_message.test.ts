import * as sut from './control_message';

describe('fromZulipMessage', () => {
  test('returns BadMessage for unrelated input', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: 'how do i even',
    });
    expect(result).toStrictEqual({
      messageType: 'BadMessage',
      errorMessage: 'Did not understand command',
    });
  });

  test('returns SetCreditCardMessage for valid input', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: '!setcc moneybag@company.com true',
    });
    expect(result).toStrictEqual({
      email: 'moneybag@company.com',
      hasCreditCard: true,
      messageType: 'SetCreditCardMessage',
    });
  });

  test('returns SetCreditCardMessage for valid input2', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: '!setcc moneybag@company.com false',
    });
    expect(result).toStrictEqual({
      email: 'moneybag@company.com',
      hasCreditCard: false,
      messageType: 'SetCreditCardMessage',
    });
  });

  test('returns SetCreditCardMessage for valid input3', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: '!setcc money-bag@company.com false',
    });
    expect(result).toStrictEqual({
      email: 'money-bag@company.com',
      hasCreditCard: false,
      messageType: 'SetCreditCardMessage',
    });
  });

  test('returns AnnounceRequestMessage for valid input', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: '!announce',
    });
    expect(result).toStrictEqual({
      messageType: 'AnnounceRequestMessage',
    });
  });

  test('returns OrganizeRequestMessage for  valid input', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: '!organize',
    });
    expect(result).toStrictEqual({ messageType: 'OrganizeRequestMessage' });
  });

  test('returns BadMessage for invalid input', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: 'again and again',
    });
    expect(result).toStrictEqual({
      errorMessage: 'Did not understand command',
      messageType: 'BadMessage',
    });
  });

  test('parses history insert', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: '!history 1.1.2024 [["a@b.c", "e@f.g"], ["quux@baz.org"]]',
    });
    expect(result).toStrictEqual({
      messageType: 'HistoryInsertMessage',
      date: new Date(2024, 0, 1, 12, 0),
      groups: [['a@b.c', 'e@f.g'], ['quux@baz.org']],
    });
  });

  test('raises error on bad history insert', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: '!history 1.1.2024 not-a-valid-json',
    });
    expect(result).toStrictEqual({
      messageType: 'BadMessage',
      errorMessage: 'failed to parse JSON',
    });
  });

  test('can parse fixup message', () => {
    const result = sut.mkControlMessageFromZulipMessage({
      content: '!fix 1234',
    });
    expect(result).toStrictEqual({
      messageType: 'FixupMessage',
      messageId: 1234,
    });
  });
});

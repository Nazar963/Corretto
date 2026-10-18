import { describe, expect, it } from 'vitest';
import { isEligibleField, meetsMinimumLength } from '@/lib/fields';

function make(html: string): Element {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return wrapper.firstElementChild!;
}

describe('isEligibleField', () => {
  it.each([
    '<textarea></textarea>',
    '<input>',
    '<input type="text">',
    '<input type="search">',
    '<input type="unknown-type">',
    '<input autocomplete="name">',
    '<div contenteditable="true"></div>',
    // contenteditable="" is covered in e2e: happy-dom does not treat it as editable, browsers do.
    '<div contenteditable="plaintext-only"></div>',
  ])('accepts %s', (html) => {
    expect(isEligibleField(make(html))).toBe(true);
  });

  it.each([
    '<input type="password">',
    '<input type="email">',
    '<input type="tel">',
    '<input type="url">',
    '<input type="number">',
    '<input type="hidden">',
    '<input type="checkbox">',
    '<textarea readonly></textarea>',
    '<textarea disabled></textarea>',
    '<input readonly>',
    '<input disabled>',
    '<input autocomplete="cc-number">',
    '<input autocomplete="billing cc-csc">',
    '<input autocomplete="one-time-code">',
    '<input autocomplete="current-password">',
    '<input autocomplete="NEW-PASSWORD">',
    '<select></select>',
  ])('rejects %s', (html) => {
    expect(isEligibleField(make(html))).toBe(false);
  });

  it('accepts only the editing host, not its descendants', () => {
    const host = make('<div contenteditable="true"><p>text</p></div>');
    document.body.append(host);
    expect(isEligibleField(host)).toBe(true);
    expect(isEligibleField(host.querySelector('p'))).toBe(false);
  });

  it.each([
    '<div contenteditable="false"></div>',
    '<div contenteditable="true" aria-readonly="true"></div>',
    '<div contenteditable="true" aria-disabled="true"></div>',
    '<div></div>',
  ])('rejects %s', (html) => {
    const el = make(html);
    document.body.append(el);
    expect(isEligibleField(el)).toBe(false);
  });

  it('rejects null', () => {
    expect(isEligibleField(null)).toBe(false);
  });
});

describe('meetsMinimumLength', () => {
  it.each([
    ['', false],
    ['   ', false],
    ['hi there', false],
    ['one two three', true],
    ['supercalifragilistic', true],
    ['  a  b  ', false],
    ['这是一个比较长的中文句子用于测试长度', true],
    ['你好', false],
  ])('%j -> %s', (text, expected) => {
    expect(meetsMinimumLength(text)).toBe(expected);
  });

  it('respects a custom minimum', () => {
    expect(meetsMinimumLength('one two', { minWords: 2, minChars: 100 })).toBe(true);
    expect(meetsMinimumLength('one two', { minWords: 5, minChars: 100 })).toBe(false);
  });
});

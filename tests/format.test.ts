import { describe, expect, test } from 'bun:test';
import { ago, duration, elapsed, shortSha, tailLines, toEpoch } from '../panel/format';

describe('shortSha', () => {
  test('keeps seven characters', () => {
    expect(shortSha('0123456789abcdef')).toBe('0123456');
  });
  test('handles empty input', () => {
    expect(shortSha(null)).toBe('');
    expect(shortSha(undefined)).toBe('');
  });
});

describe('toEpoch', () => {
  test('parses ISO strings', () => {
    expect(toEpoch('1970-01-01T00:00:01.000Z')).toBe(1000);
  });
  test('passes numbers through', () => {
    expect(toEpoch(1234)).toBe(1234);
  });
  test('returns null for absent or junk values', () => {
    expect(toEpoch(null)).toBeNull();
    expect(toEpoch('')).toBeNull();
    expect(toEpoch('not a date')).toBeNull();
  });
});

describe('duration', () => {
  test('renders seconds below a minute', () => {
    expect(duration(0)).toBe('0s');
    expect(duration(45)).toBe('45s');
    expect(duration(59)).toBe('59s');
  });
  test('renders minutes and seconds', () => {
    expect(duration(60)).toBe('1m');
    expect(duration(90)).toBe('1m 30s');
    expect(duration(119)).toBe('1m 59s');
  });
  test('renders hours and minutes', () => {
    expect(duration(3600)).toBe('1h 00m');
    expect(duration(3660)).toBe('1h 01m');
    expect(duration(7325)).toBe('2h 02m');
  });
  test('is empty for absent values', () => {
    expect(duration(null)).toBe('');
    expect(duration(undefined)).toBe('');
  });
});

describe('elapsed', () => {
  test('is the duration between two epochs', () => {
    expect(elapsed(1000, 61000)).toBe('1m');
  });
});

describe('ago', () => {
  const now = 1_000_000_000_000;
  test('under ten seconds reads as just now', () => {
    expect(ago(now - 0, now)).toBe('just now');
    expect(ago(now - 9_000, now)).toBe('just now');
  });
  test('seconds', () => {
    expect(ago(now - 10_000, now)).toBe('10s ago');
    expect(ago(now - 59_000, now)).toBe('59s ago');
  });
  test('minutes and hours', () => {
    expect(ago(now - 60_000, now)).toBe('1m ago');
    expect(ago(now - 3_600_000, now)).toBe('1h ago');
  });
  test('days and months', () => {
    expect(ago(now - 86_400_000, now)).toBe('1d ago');
    expect(ago(now - 31 * 86_400_000, now)).toBe('1mo ago');
  });
});

describe('tailLines', () => {
  test('keeps the last n lines', () => {
    expect(tailLines('a\nb\nc\nd', 2)).toEqual(['c', 'd']);
  });
  test('keeps everything when the log is shorter', () => {
    expect(tailLines('a\nb', 40)).toEqual(['a', 'b']);
  });
  test('is empty for an empty or absent log', () => {
    expect(tailLines('', 40)).toEqual([]);
    expect(tailLines(null, 40)).toEqual([]);
    expect(tailLines('a\nb', 0)).toEqual([]);
  });
  test('a trailing newline is a terminator, not an extra content line', () => {
    expect(tailLines('a\n', 1)).toEqual(['a']);
  });
  test('a 40-line log ending in a newline keeps 40 content lines', () => {
    const log = `${Array.from({ length: 40 }, (_, index) => `line ${index + 1}`).join('\n')}\n`;
    const tail = tailLines(log, 40);
    expect(tail).toHaveLength(40);
    expect(tail[0]).toBe('line 1');
    expect(tail[39]).toBe('line 40');
  });
});

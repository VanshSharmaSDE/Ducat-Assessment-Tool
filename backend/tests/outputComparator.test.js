import { compareOutput, normalizeLineEndings } from '../src/utils/comparator.js';

describe('Output Comparator Engine', () => {
  test('normalizeLineEndings converts CRLF and CR to LF', () => {
    expect(normalizeLineEndings('hello\r\nworld\r!')).toBe('hello\nworld\n!');
  });

  describe('TRIMMED mode (default)', () => {
    test('matches identical outputs with trailing whitespace differences', () => {
      expect(compareOutput('1 2 \n3 4  \n', '1 2\n3 4', 'TRIMMED')).toBe(true);
    });

    test('matches when CRLF line breaks differ', () => {
      expect(compareOutput('line1\r\nline2\r\n', 'line1\nline2\n', 'TRIMMED')).toBe(true);
    });

    test('rejects mismatched line content', () => {
      expect(compareOutput('1 2\n3 5', '1 2\n3 4', 'TRIMMED')).toBe(false);
    });

    test('rejects different number of lines', () => {
      expect(compareOutput('1 2\n3 4\n5 6', '1 2\n3 4', 'TRIMMED')).toBe(false);
    });
  });

  describe('EXACT mode', () => {
    test('matches only when characters match exactly after LF normalization', () => {
      expect(compareOutput('hello\n', 'hello\n', 'EXACT')).toBe(true);
      expect(compareOutput('hello \n', 'hello\n', 'EXACT')).toBe(false);
    });
  });

  describe('WHITESPACE_INSENSITIVE mode', () => {
    test('matches regardless of space counts or line breaks', () => {
      expect(compareOutput('0   1  \n 2\t3', '0 1 2 3', 'WHITESPACE_INSENSITIVE')).toBe(true);
    });

    test('rejects actual numerical or textual differences', () => {
      expect(compareOutput('0 1 2 4', '0 1 2 3', 'WHITESPACE_INSENSITIVE')).toBe(false);
    });
  });
});

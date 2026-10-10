/**
 * Output Comparator utility for judging code execution against expected outputs.
 * Supports EXACT, TRIMMED, and WHITESPACE_INSENSITIVE modes.
 */
export function normalizeLineEndings(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function compareOutput(actual, expected, mode = 'TRIMMED') {
  if (typeof actual !== 'string') actual = '';
  if (typeof expected !== 'string') expected = '';

  const normActual = normalizeLineEndings(actual);
  const normExpected = normalizeLineEndings(expected);

  switch (mode) {
    case 'EXACT':
      return normActual === normExpected;

    case 'WHITESPACE_INSENSITIVE': {
      // Normalize all runs of whitespace to a single space, trim edges
      const tokenActual = normActual.trim().split(/\s+/).join(' ');
      const tokenExpected = normExpected.trim().split(/\s+/).join(' ');
      return tokenActual === tokenExpected;
    }

    case 'TRIMMED':
    default: {
      // Trim overall leading/trailing whitespace, and trim each individual line
      const linesActual = normActual.trim().split('\n').map((l) => l.trimEnd());
      const linesExpected = normExpected.trim().split('\n').map((l) => l.trimEnd());

      if (linesActual.length !== linesExpected.length) {
        return false;
      }

      for (let i = 0; i < linesActual.length; i++) {
        if (linesActual[i] !== linesExpected[i]) {
          return false;
        }
      }
      return true;
    }
  }
}

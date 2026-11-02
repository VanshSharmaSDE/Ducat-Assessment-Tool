const MAX_LOG_BUFFER_SIZE = 1000;
const logBuffer = [];

let isIntercepting = false;
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

function pushToBuffer(defaultLevel, chunk) {
  if (!chunk) return;
  const str = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  const lines = str.split('\n');
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    // Strip terminal ANSI escape codes
    const clean = trimmed.replace(/\x1b\[[0-9;]*m/g, '');
    if (!clean) continue;

    // Check if line already has a timestamp, e.g. [2026-11-03T...]
    const tsMatch = clean.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/);
    const timestamp = tsMatch ? tsMatch[0] : new Date().toISOString();

    let level = defaultLevel;
    if (/error|exception|fail|fatal/i.test(clean)) level = 'error';
    else if (/warn/i.test(clean)) level = 'warn';
    else if (/debug/i.test(clean)) level = 'debug';

    logBuffer.push({
      timestamp,
      level,
      message: clean,
    });

    if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
      logBuffer.shift();
    }
  }
}

// Intercept stdout to capture console.log, morgan HTTP request logs, worker logs
process.stdout.write = (chunk, encoding, callback) => {
  if (!isIntercepting) {
    isIntercepting = true;
    try {
      pushToBuffer('info', chunk);
    } catch {
      // ignore
    }
    isIntercepting = false;
  }
  return originalStdoutWrite(chunk, encoding, callback);
};

// Intercept stderr to capture error logs and stack traces
process.stderr.write = (chunk, encoding, callback) => {
  if (!isIntercepting) {
    isIntercepting = true;
    try {
      pushToBuffer('error', chunk);
    } catch {
      // ignore
    }
    isIntercepting = false;
  }
  return originalStderrWrite(chunk, encoding, callback);
};

export const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] [${timestamp}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN] [${timestamp}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] [${timestamp}] ${message}`, error ? (error.stack || error) : '');
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.debug(`[DEBUG] [${timestamp}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    }
  },
  getRecentLogs: ({ lines = 100, severity = 'all', search = '' } = {}) => {
    let result = [...logBuffer];
    if (severity && severity !== 'all') {
      result = result.filter((l) => l.level === severity.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) => l.message.toLowerCase().includes(q));
    }
    const capped = Math.min(Math.max(10, lines), MAX_LOG_BUFFER_SIZE);
    return result.slice(-capped);
  },
};

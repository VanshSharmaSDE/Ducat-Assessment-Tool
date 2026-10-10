import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { compareOutput } from '../utils/comparator.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { restartContainer } from './containerPool.js';

/**
 * Executes submissions inside the warm per-language containers (see containerPool.js).
 *
 * Every submission gets its own /sandbox/<jobId> directory inside the container
 * (a tmpfs), is compiled/syntax-checked once and then run once per test case with
 * `docker exec`. Limits per process: wall time (`timeout -s KILL`), heap/virtual
 * memory, output size. The container itself has no network, a read-only root FS,
 * no capabilities and runs as an unprivileged uid.
 */

export const SUPPORTED = ['java', 'python', 'javascript'];
const CLASS_NAME_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const DAEMON_ERROR_RE = /Error response from daemon|No such container|is not running|Cannot connect to the Docker daemon/i;
const OOM_RE = /OutOfMemoryError|JavaScript heap out of memory|MemoryError|Cannot allocate memory/;

export class DockerExecutionService {
  constructor(opts = config.execution) {
    this.compileTimeoutSec = opts.compileTimeoutSec;
    this.maxOutputBytes = opts.maxOutputSizeBytes;
    this.maxSourceBytes = opts.maxSourceCodeBytes;
  }

  /** Main class = first `public class X`, else first `class X`, else Main. */
  detectClassName(sourceCode) {
    const name =
      sourceCode.match(/public\s+(?:final\s+)?class\s+([A-Za-z_$][\w$]*)/)?.[1] ||
      sourceCode.match(/class\s+([A-Za-z_$][\w$]*)/)?.[1] ||
      'Main';
    return CLASS_NAME_RE.test(name) ? name : 'Main';
  }

  /** Build the language specific file name, compile step and run command. */
  #plan(language, sourceCode, dir, timeLimitSec, memoryMb) {
    const t = ['timeout', '-s', 'KILL', String(timeLimitSec)];
    if (language === 'java') {
      const cls = this.detectClassName(sourceCode);
      return {
        file: `${cls}.java`,
        compile: ['javac', '-J-XX:+UseSerialGC', '-J-XX:-UsePerfData', '-d', dir, `${dir}/${cls}.java`],
        run: [...t, 'java', '-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-XX:-UsePerfData',
          `-Xmx${memoryMb}m`, '-Xss64m', '-cp', dir, cls],
      };
    }
    if (language === 'python') {
      return {
        file: 'solution.py',
        compile: ['python3', '-c', `import ast,sys; ast.parse(open(sys.argv[1]).read(), sys.argv[1])`, `${dir}/solution.py`],
        // ulimit -v caps the address space of the interpreter (KB)
        run: ['sh', '-c', `ulimit -v ${memoryMb * 1024 + 65536}; exec "$@"`, 'sh', ...t, 'python3', '-u', `${dir}/solution.py`],
      };
    }
    return {
      file: 'solution.js',
      compile: ['node', '--check', `${dir}/solution.js`],
      run: [...t, 'node', `--max-old-space-size=${memoryMb}`, `${dir}/solution.js`],
    };
  }

  async evaluateSubmission({
    language = 'java',
    sourceCode = '',
    testCases = [],
    questionTimeLimit = 2,
    questionMemoryLimit = 256,
    comparisonMode = 'TRIMMED',
    container,
  }) {
    const lang = (language || '').toLowerCase();
    if (!SUPPORTED.includes(lang)) {
      return this.#failure('SYSTEM_ERROR', `Unsupported language: ${language}. Allowed: Java, Python, JavaScript.`, testCases);
    }

    const sourceBytes = Buffer.byteLength(sourceCode, 'utf-8');
    if (sourceBytes > this.maxSourceBytes) {
      return this.#failure(
        'COMPILE_ERROR',
        `Source code (${sourceBytes} bytes) exceeds maximum allowed size of ${this.maxSourceBytes} bytes`,
        testCases
      );
    }
    if (!container) {
      return this.#failure('SYSTEM_ERROR', 'No sandbox container assigned to this submission', testCases);
    }

    const timeLimitSec = Math.min(Math.max(Math.ceil(Number(questionTimeLimit) || 2), 1), 15);
    const memoryMb = Math.min(Math.max(Number(questionMemoryLimit) || 256, 64), 512);
    const dir = `/sandbox/${randomUUID()}`;
    const plan = this.#plan(lang, sourceCode, dir, timeLimitSec, memoryMb);

    try {
      // 1. Write the source file into the container (retry once after restarting a dead container)
      let write = await this.#writeSource(container, dir, plan.file, sourceCode);
      if (write.daemonError && (await restartContainer(container))) {
        write = await this.#writeSource(container, dir, plan.file, sourceCode);
      }
      if (write.code !== 0) {
        return this.#failure('SYSTEM_ERROR', `Sandbox unavailable: ${write.stderr.trim() || 'unknown error'}`, testCases);
      }

      // 2. Compile / syntax check
      const compile = await this.#exec(container, dir, plan.compile, { timeoutMs: this.compileTimeoutSec * 1000 });
      if (compile.daemonError) return this.#failure('SYSTEM_ERROR', compile.stderr.trim(), testCases);
      if (compile.code !== 0) {
        const msg = compile.timedOut ? 'Compilation timed out' : (compile.stderr || compile.stdout).trim();
        return this.#failure('COMPILE_ERROR', msg.replaceAll(`${dir}/`, ''), testCases);
      }
      const compileOutput = (compile.stderr || '').trim();

      // 3. Run every test case
      const testResults = [];
      let passedTests = 0;
      let score = 0;
      let maxTime = 0;
      let firstFailure = null;

      for (const tc of testCases) {
        const run = await this.#exec(container, dir, plan.run, {
          input: tc.input || '',
          timeoutMs: (timeLimitSec + 5) * 1000,
        });

        let status;
        let errorMessage = '';
        if (run.daemonError) {
          status = 'SYSTEM_ERROR';
          errorMessage = run.stderr.trim();
        } else if (run.outputExceeded) {
          status = 'RUNTIME_ERROR';
          errorMessage = `Output exceeded ${this.maxOutputBytes} bytes`;
        } else if (OOM_RE.test(run.stderr)) {
          status = 'MEMORY_LIMIT_EXCEEDED';
          errorMessage = `Memory limit exceeded (${memoryMb} MB)`;
        } else if (run.timedOut || run.code === 137 || run.code === 124) {
          status = run.elapsedSec < timeLimitSec * 0.9 ? 'MEMORY_LIMIT_EXCEEDED' : 'TIME_LIMIT_EXCEEDED';
          errorMessage = status === 'TIME_LIMIT_EXCEEDED' ? `Time limit exceeded (${timeLimitSec}s)` : 'Memory limit exceeded';
        } else if (run.code !== 0) {
          status = 'RUNTIME_ERROR';
          errorMessage = run.stderr.replaceAll(`${dir}/`, '').trim().slice(0, 2000) || `Process exited with code ${run.code}`;
        } else {
          status = compareOutput(run.stdout, tc.expectedOutput || '', comparisonMode) ? 'PASSED' : 'WRONG_ANSWER';
        }

        const passed = status === 'PASSED';
        if (passed) {
          passedTests += 1;
          score += tc.marks || 0;
        } else if (!firstFailure) {
          firstFailure = status;
        }
        maxTime = Math.max(maxTime, run.elapsedSec);

        testResults.push({
          testCaseId: tc._id || tc.id,
          isHidden: Boolean(tc.isHidden),
          passed,
          status,
          executionTime: Number(run.elapsedSec.toFixed(3)),
          memoryUsed: 0,
          actualOutput: run.stdout.slice(0, 10000),
          expectedOutput: tc.expectedOutput || '',
          input: tc.input || '',
          errorMessage,
        });
      }

      return {
        overallStatus: firstFailure || 'PASSED',
        passedTests,
        totalTests: testCases.length,
        score,
        executionTime: Number(maxTime.toFixed(3)),
        memoryUsed: 0,
        compileOutput,
        testResults,
      };
    } catch (err) {
      logger.error(`Execution error in ${container}: ${err.message}`);
      return this.#failure('SYSTEM_ERROR', err.message, testCases);
    } finally {
      this.#spawn(['exec', container, 'sh', '-c', `pkill -9 -f '${dir}' ; rm -rf '${dir}'`]).on('error', () => {});
    }
  }

  // ---------------------------------------------------------------------------

  #writeSource(container, dir, file, sourceCode) {
    return this.#exec(container, null, ['sh', '-c', `mkdir -p '${dir}' && cat > '${dir}/${file}'`], {
      input: sourceCode,
      timeoutMs: 15000,
    });
  }

  #spawn(args) {
    return spawn('docker', args, { windowsHide: true, stdio: 'ignore' });
  }

  /** `docker exec -i <container> <cmd>` with timeout, output cap and in-container kill on overrun. */
  #exec(container, dir, command, { input, timeoutMs = 10000 } = {}) {
    return new Promise((resolve) => {
      const start = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let outputExceeded = false;
      let settled = false;

      const child = spawn('docker', ['exec', '-i', container, ...command], { windowsHide: true });

      const kill = () => {
        child.kill('SIGKILL');
        // Killing the docker CLI does not kill the process inside the container
        if (dir) this.#spawn(['exec', container, 'pkill', '-9', '-f', dir]).on('error', () => {});
      };

      const timer = setTimeout(() => {
        timedOut = true;
        kill();
      }, timeoutMs);

      const collect = (which) => (chunk) => {
        if (which === 'out') stdout += chunk;
        else stderr += chunk;
        if (!outputExceeded && stdout.length + stderr.length > this.maxOutputBytes) {
          outputExceeded = true;
          kill();
        }
      };
      child.stdout.setEncoding('utf8').on('data', collect('out'));
      child.stderr.setEncoding('utf8').on('data', collect('err'));

      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, timedOut, outputExceeded, elapsedSec: (Date.now() - start) / 1000, ...result });
      };

      child.on('error', (err) => {
        stderr = `Docker is not available: ${err.message}`;
        finish({ code: -1, daemonError: true });
      });
      child.on('close', (code) => {
        const daemonError = (code === 125 || code === 1 || code === 126) && DAEMON_ERROR_RE.test(stderr);
        finish({ code, daemonError });
      });

      child.stdin.on('error', () => {});
      if (input) child.stdin.write(input);
      child.stdin.end();
    });
  }

  #failure(status, message, testCases = []) {
    return {
      overallStatus: status,
      error: message,
      passedTests: 0,
      totalTests: testCases.length,
      score: 0,
      executionTime: 0,
      memoryUsed: 0,
      compileOutput: message,
      testResults: testCases.map((tc) => ({
        testCaseId: tc._id || tc.id,
        isHidden: Boolean(tc.isHidden),
        passed: false,
        status,
        executionTime: 0,
        memoryUsed: 0,
        actualOutput: '',
        expectedOutput: tc.expectedOutput || '',
        input: tc.input || '',
        errorMessage: message,
      })),
    };
  }
}

export const dockerExecutionService = new DockerExecutionService();
export default dockerExecutionService;
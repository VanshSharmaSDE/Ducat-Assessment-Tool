import { spawn } from 'child_process';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { dockerExecutionService } from './DockerExecutionService.js';

/**
 * Warm per-language container pool.
 *
 *   codeassess-java-1     (image codeassess-java)
 *   codeassess-python-1   (image codeassess-python)
 *   codeassess-js-1       (image codeassess-js)
 *
 * Containers are started once when the backend boots and kept alive. Each
 * submission runs inside the matching container via `docker exec`, in its own
 * /sandbox/<jobId> directory, so there is no per-submission container start-up cost.
 *
 * Scaling: each container evaluates up to JOBS_PER_CONTAINER submissions in
 * parallel; extra submissions wait in a per-language FIFO queue. Add more
 * containers for a busy language with JAVA_CONTAINERS / PYTHON_CONTAINERS / JS_CONTAINERS.
 */

export const POOL_LABEL = 'codeassess.pool=1';
const SHORT = { java: 'java', python: 'python', javascript: 'js', c: 'c', cpp: 'cpp', sql: 'sql' };

const exec = config.execution;

/** name -> { name, language, image, active, healthy } */
const containers = new Map();
/** language -> [job] */
const queues = { java: [], python: [], javascript: [], c: [], cpp: [], sql: [] };
let handler = null;

export function runDocker(args, { timeoutMs = 60000, input } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const child = spawn('docker', args, { windowsHide: true });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.setEncoding('utf8').on('data', (d) => (stdout += d));
    child.stderr.setEncoding('utf8').on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: err.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.stdin.on('error', () => {});
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

function containerArgs(name, language, image) {
  return [
    'run', '-d',
    '--name', name,
    '--label', POOL_LABEL,
    '--label', `codeassess.language=${language}`,
    '--network', 'none',
    '--memory', exec.containerMemory,
    '--memory-swap', exec.containerMemory, // no swap
    '--cpus', String(exec.containerCpus),
    '--pids-limit', String(exec.pidsLimit),
    '--read-only',
    '--tmpfs', '/tmp:rw,exec,nosuid,size=64m',
    '--tmpfs', '/sandbox:rw,exec,nosuid,size=256m,uid=10001,gid=10001,mode=0700',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--user', '10001:10001',
    image,
    'sleep', 'infinity',
  ];
}

async function startContainer(entry) {
  await runDocker(['rm', '-f', entry.name], { timeoutMs: 30000 });
  const res = await runDocker(containerArgs(entry.name, entry.language, entry.image), { timeoutMs: 60000 });
  entry.healthy = res.code === 0;
  if (entry.healthy) logger.info(`[Pool] Started ${entry.name} (${entry.image})`);
  else logger.error(`[Pool] Failed to start ${entry.name}: ${res.stderr.trim()}`);
  return entry.healthy;
}

/** Recreate a container that died / was removed. Called by the executor on docker errors. */
export async function restartContainer(name) {
  const entry = containers.get(name);
  if (!entry) return false;
  logger.warn(`[Pool] Restarting ${name}`);
  return startContainer(entry);
}

/** Start every warm container. Never throws; the API keeps working without Docker. */
export async function startContainerPool() {
  const info = await runDocker(['info', '--format', '{{.ServerVersion}}'], { timeoutMs: 15000 });
  if (info.code !== 0) {
    logger.warn('[Pool] Docker is not running - submissions will stay queued until it is available.');
  }

  const starts = [];
  for (const language of Object.keys(queues)) {
    const image = exec.images[language];
    const count = Math.max(1, exec.containersPerLanguage[language] || 1);

    if (info.code === 0) {
      const img = await runDocker(['image', 'inspect', image], { timeoutMs: 15000 });
      if (img.code !== 0) {
        logger.warn(`[Pool] Image "${image}" missing. Build: docker build -t ${image} docker/${language}`);
      }
    }

    for (let i = 1; i <= count; i++) {
      const entry = { name: `codeassess-${SHORT[language]}-${i}`, language, image, active: 0, healthy: false };
      containers.set(entry.name, entry);
      if (info.code === 0) starts.push(startContainer(entry));
    }
  }
  await Promise.all(starts);

  const healthy = [...containers.values()].filter((c) => c.healthy).length;
  logger.info(`[Pool] ${healthy}/${containers.size} sandbox containers running, ${exec.jobsPerContainer} parallel jobs each`);
  drainAll();
}

/** Remove all pool containers (on shutdown). */
export async function stopContainerPool() {
  const names = [...containers.keys()];
  if (names.length) await runDocker(['rm', '-f', ...names], { timeoutMs: 30000 });
  logger.info('[Pool] Sandbox containers removed');
}

function pickContainer(language) {
  let best = null;
  for (const c of containers.values()) {
    if (c.language !== language || !c.healthy || c.active >= exec.jobsPerContainer) continue;
    if (!best || c.active < best.active) best = c;
  }
  return best;
}

function drain(language) {
  const queue = queues[language];
  while (queue.length > 0) {
    const peekJob = queue[0];
    if (!peekJob.run && !handler) break;

    const container = pickContainer(language);
    if (!container) break; // all containers for this language are at capacity

    const job = queue.shift();
    container.active += 1;
    job.container = container.name;
    logger.info(`[Pool] ${job.id} -> ${container.name} (active ${container.active}, ${language} queue ${queue.length})`);

    const runner = job.run ? job.run(job) : handler(job);

    Promise.resolve()
      .then(() => runner)
      .then((res) => {
        if (job.resolve) job.resolve(res);
      })
      .catch((err) => {
        logger.error(`[Pool] Job ${job.id} failed: ${err.message}`, err);
        if (job.reject) job.reject(err);
      })
      .finally(() => {
        container.active -= 1;
        drain(language);
      });
  }
}

function drainAll() {
  Object.keys(queues).forEach(drain);
}

export function registerWorkerHandler(fn) {
  handler = fn;
  drainAll();
}

export async function addSubmissionJob(data) {
  const language = queues[data.language] ? data.language : 'java';
  const job = { id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, data };
  queues[language].push(job);
  setImmediate(() => drain(language));
  return job;
}

export async function runCustomCodeInPool(data) {
  const language = queues[data.language] ? data.language : 'java';

  // High load protection: if queue for this language is excessively large, reject early
  const maxQueue = parseInt(process.env.MAX_EXECUTION_QUEUE_SIZE || '1500', 10);
  if (queues[language].length > maxQueue) {
    const error = new Error('Execution sandbox is currently under high load. Please try again in a few seconds.');
    error.statusCode = 503;
    throw error;
  }

  // Check if containers are available
  const healthyContainers = [...containers.values()].filter(
    (c) => c.language === language && c.healthy
  );

  if (healthyContainers.length === 0) {
    return {
      status: 'SYSTEM_ERROR',
      stdout: '',
      stderr: `Execution sandbox container for ${language} is not currently running.`,
      compileOutput: '',
      executionTime: 0,
    };
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    // Safety timeout in case job is stuck waiting in queue or execution takes too long
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      const idx = queues[language].indexOf(job);
      if (idx !== -1) queues[language].splice(idx, 1);
      resolve({
        status: 'TIME_LIMIT_EXCEEDED',
        stdout: '',
        stderr: 'Execution request timed out.',
        compileOutput: '',
        executionTime: 0,
      });
    }, 35000);

    const job = {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      data,
      run: async (activeJob) => {
        return dockerExecutionService.executeCustomCode({
          language: activeJob.data.language,
          sourceCode: activeJob.data.sourceCode,
          customInput: activeJob.data.customInput,
          questionTimeLimit: activeJob.data.questionTimeLimit,
          questionMemoryLimit: activeJob.data.questionMemoryLimit,
          container: activeJob.container,
        });
      },
      resolve: (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(res);
      },
      reject: (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(err);
      },
    };

    queues[language].push(job);
    setImmediate(() => drain(language));
  });
}


export function getQueueStats() {
  return {
    jobsPerContainer: exec.jobsPerContainer,
    queued: Object.fromEntries(Object.entries(queues).map(([l, q]) => [l, q.length])),
    containers: [...containers.values()].map(({ name, language, image, active, healthy }) => ({
      name, language, image, active, healthy,
    })),
  };
}

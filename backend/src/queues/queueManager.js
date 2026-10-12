// Submission queueing now lives in the per-language container pool.
// Kept as a thin re-export so existing imports keep working.
export { addSubmissionJob, registerWorkerHandler, getQueueStats, runCustomCodeInPool } from '../execution/containerPool.js';

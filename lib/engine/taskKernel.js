import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUNNER_FILE = path.join(__dirname, 'jobRunner.js');

const POOL_CAPACITY = 4;
const threadPool = [];
const taskQueue = [];

function spawnThread() {
  const threadHolder = {
    instance: new Worker(RUNNER_FILE),
    active: false,
    resolveCallback: null,
    rejectCallback: null
  };

  threadHolder.instance.on('message', (response) => {
    if (!threadHolder.active) return;

    const resolve = threadHolder.resolveCallback;
    const reject = threadHolder.rejectCallback;
    threadHolder.active = false;

    if (response.state === 'OK') {
      const payload = response.binary ? Buffer.from(response.data) : response.data;
      resolve(payload);
    } else {
      reject(new Error(response.message));
    }

    dispatchNext();
  });

  threadHolder.instance.on('error', (err) => {
    if (threadHolder.rejectCallback) threadHolder.rejectCallback(err);
    threadHolder.active = false;
    dispatchNext();
  });

  return threadHolder;
}

function dispatchNext() {
  if (taskQueue.length === 0) return;
  const freeThread = threadPool.find(t => !t.active);
  if (!freeThread) return;

  const { job, resolve, reject } = taskQueue.shift();
  freeThread.active = true;
  freeThread.resolveCallback = resolve;
  freeThread.rejectCallback = reject;
  freeThread.instance.postMessage(job);
}

export function runBackgroundJob(job) {
  return new Promise((resolve, reject) => {
    if (threadPool.length < POOL_CAPACITY) {
      threadPool.push(spawnThread());
    }

    taskQueue.push({ job, resolve, reject });
    dispatchNext();
  });
}
import { parentPort, workerData } from 'node:worker_threads'
import { executeScript } from '@shared/scripting/script-host'
import type { ScriptRun } from '@shared/types/scripting'
import { createVmEvaluate } from './vm-evaluate'

/** Worker thread entry: runs one script and posts the outcome back. */
void executeScript(workerData as ScriptRun, createVmEvaluate()).then((outcome) => parentPort?.postMessage(outcome))

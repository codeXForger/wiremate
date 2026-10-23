import { ipcMain } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { WireRequest } from '@shared/types/http'
import type { ScriptRun } from '@shared/types/scripting'
import type { HttpClient } from './http/http-client'
import type { ScriptRunner } from './scripting/script-runner'

interface RequestServices {
  http: HttpClient
  scripts: ScriptRunner
}

/** Exposes HTTP sending and script running to the renderer. */
export class RequestController {
  public constructor(private readonly services: RequestServices) {}

  public register(): void {
    ipcMain.handle(IpcChannel.sendHttp, (_event, request: WireRequest) => this.services.http.send(request))
    ipcMain.handle(IpcChannel.runScript, (_event, run: ScriptRun) => this.services.scripts.run(run))
  }
}

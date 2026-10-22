import type { ProtocolId, RequestDocument } from '../types/protocol'
import { createId } from '../utils/id'
import { PROTOCOL_DEFAULTS } from './defaults'

export class RequestFactory {
  public static create<P extends ProtocolId>(protocol: P, name: string): RequestDocument<P> {
    const config = PROTOCOL_DEFAULTS[protocol]()
    return { id: createId('req'), name, protocol, config }
  }
}

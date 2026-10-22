import { createElement, type ComponentType } from 'react'
import type { ProtocolId } from '@shared/types/protocol'
import type { EditorProps } from '../types'
import { StreamFormEditor, type StreamFormSpec } from './StreamFormEditor'

/** Builds a protocol editor component from a declarative spec. */
export function createStreamEditor<P extends ProtocolId>(spec: StreamFormSpec<P>): ComponentType<EditorProps> {
  return function SpecEditor({ requestId }: EditorProps) {
    return createElement(StreamFormEditor<P>, { requestId, spec })
  }
}

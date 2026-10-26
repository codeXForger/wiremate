import { HTTP_METHODS, type HttpMethod } from '@shared/types/protocol'
import { Column } from '@/components/Column'
import { OptionSelect } from '../../request/components/OptionSelect'
import { SendButton } from '../../request/components/SendButton'
import { UrlBar } from '../../request/components/UrlBar'
import { useConfigBinder } from '../../request/use-field-binder'
import type { EditorProps } from '../types'
import { HttpTabs } from './HttpTabs'
import { useUrlParams } from './use-url-params'

export function HttpEditor({ requestId }: EditorProps) {
  const { url } = useUrlParams(requestId)
  const method = useConfigBinder<'http', HttpMethod>(requestId)('method')
  const leading = <OptionSelect label="Method" className="w-28 font-mono text-xs" options={HTTP_METHODS} {...method} />
  return (
    <Column>
      <UrlBar label="Request URL" leading={leading} action={<SendButton requestId={requestId} />} {...url} />
      <HttpTabs requestId={requestId} />
    </Column>
  )
}

import { LINE_ENDINGS, type LineEnding, type PayloadEncoding } from '@shared/types/protocol'
import { OptionSelect } from '../../request/components/OptionSelect'
import type { Bound } from '../../request/use-field-binder'

const ENCODINGS: readonly PayloadEncoding[] = ['text', 'hex']
const LINE_ENDING_LABEL: Record<LineEnding, string> = { none: 'No line ending', lf: 'LF (\\n)', crlf: 'CRLF (\\r\\n)' }

interface PayloadFormatProps {
  encoding: Bound<PayloadEncoding>
  lineEnding: Bound<LineEnding>
}

/** How a payload becomes bytes: text or hex, and what ends a line of text. Hex is sent exactly as written. */
export function PayloadFormat({ encoding, lineEnding }: PayloadFormatProps) {
  return (
    <>
      <OptionSelect label="Encoding" className="w-20 text-xs" options={ENCODINGS} {...encoding} />
      {encoding.value === 'text' && <LineEndingSelect {...lineEnding} />}
    </>
  )
}

function LineEndingSelect(props: Bound<LineEnding>) {
  const format = (ending: LineEnding): string => LINE_ENDING_LABEL[ending]
  return <OptionSelect label="Line ending" className="w-36 text-xs" options={LINE_ENDINGS} format={format} {...props} />
}

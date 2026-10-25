import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { IconButton } from './IconButton'

const CONFIRM_MS = 1500

/** Copies text to the clipboard and shows a tick for a moment. */
export function CopyButton({ label, text }: { label: string; text: () => string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), CONFIRM_MS)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = (): void => {
    void navigator.clipboard.writeText(text()).then(() => setCopied(true))
  }
  return <IconButton label={copied ? 'Copied' : label} icon={copied ? Check : Copy} onClick={copy} />
}

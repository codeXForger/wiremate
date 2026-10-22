interface MockEditorProps {
  value?: string
  onChange?: (value: string | undefined) => void
  options?: { readOnly?: boolean; ariaLabel?: string }
}

export default function MockEditor({ value, onChange, options }: MockEditorProps) {
  return (
    <textarea
      aria-label={options?.ariaLabel ?? 'code editor'}
      readOnly={options?.readOnly}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  )
}

export const loader = { config: () => undefined }

/** A whole number typed in a dialog; anything else throws with the field's name. */
export function wholeNumber(text: string, label: string, min = 0): number {
  const trimmed = text.trim()
  const value = Number(trimmed)
  if (trimmed === '' || !Number.isInteger(value) || value < min) {
    throw new Error(`${label} must be a whole number of at least ${min}`)
  }
  return value
}

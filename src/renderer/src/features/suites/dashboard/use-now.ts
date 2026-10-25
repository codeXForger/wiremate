import { useEffect, useState } from 'react'

/** The current time, refreshed every `intervalMs`, so a view of a run in progress keeps its clock moving. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

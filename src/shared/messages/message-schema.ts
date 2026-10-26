import { z } from 'zod'
import { SafeId } from '../suites/suite-schema'
import { LINE_ENDINGS } from '../types/protocol'

export const SavedMessageSchema = z.object({
  id: SafeId,
  name: z.string(),
  position: z.number(),
  payload: z.string(),
  encoding: z.enum(['text', 'hex']),
  lineEnding: z.enum(LINE_ENDINGS).catch('none')
})

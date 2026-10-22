import { z } from 'zod'

export const workspaceInputSchema = z.object({
  name: z.string().trim().min(1, 'Give the workspace a name'),
  path: z.string().trim().min(1, 'Choose a folder to store the workspace in')
})

export type WorkspaceInput = z.infer<typeof workspaceInputSchema>
export type WorkspaceInputErrors = Partial<Record<keyof WorkspaceInput, string>>

export function validateWorkspaceInput(input: WorkspaceInput): WorkspaceInputErrors {
  const result = workspaceInputSchema.safeParse(input)
  if (result.success) return {}
  const errors: WorkspaceInputErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof WorkspaceInput
    errors[field] ??= issue.message
  }
  return errors
}

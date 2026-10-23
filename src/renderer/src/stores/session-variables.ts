import { create } from 'zustand'
import type { Variables } from '@shared/types/scripting'

interface SessionVariablesState {
  variables: Variables
  replace: (variables: Variables) => void
}

/** Where `wm.env.set` writes while no environment is active. Lives until the app closes. */
export const useSessionVariables = create<SessionVariablesState>()((set) => ({
  variables: {},
  replace: (variables) => set({ variables })
}))

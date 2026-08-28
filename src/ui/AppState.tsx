import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type AppStateValue = {
  booted: boolean
  setBooted: (value: boolean) => void
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

type AppStateProviderProps = {
  children: ReactNode
  startBooted: boolean
}

export function AppStateProvider({ children, startBooted }: AppStateProviderProps) {
  const [booted, setBooted] = useState(startBooted)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const value = useMemo(
    () => ({ booted, setBooted, selectedProjectId, setSelectedProjectId }),
    [booted, selectedProjectId],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return ctx
}

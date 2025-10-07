'use client'

import { createContext, useContext, useMemo } from 'react'

import { useDashboardData } from '@/lib/hooks'
import type { DashboardDataPayload } from '@/types/api'

type DashboardDataContextValue = {
  data: DashboardDataPayload | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const DashboardDataContext = createContext<DashboardDataContextValue | undefined>(undefined)

export interface DashboardDataProviderProps {
  children: React.ReactNode
}

export function DashboardDataProvider({ children }: DashboardDataProviderProps) {
  const { data, loading, error, refetch } = useDashboardData()

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      refetch,
    }),
    [data, loading, error, refetch]
  )

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>
}

export function useDashboardContext() {
  const context = useContext(DashboardDataContext)
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardDataProvider')
  }
  return context
}

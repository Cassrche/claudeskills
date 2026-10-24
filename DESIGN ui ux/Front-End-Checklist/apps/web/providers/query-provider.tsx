'use client'

import { defaultQueryClientOptions, initializeQueryClient } from '@repo/data-layer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { type ReactNode, useEffect, useState } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

/**
 * QueryProvider function.
 * @param { children } - { children }.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient(defaultQueryClientOptions))

  useEffect(() => {
    void initializeQueryClient(queryClient)
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  )
}

import type { ReactNode } from 'react'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata.lists

interface LayoutProps {
  children: ReactNode
}

export default function ListsLayout({ children }: LayoutProps) {
  return <>{children}</>
}

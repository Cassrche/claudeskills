import { pageMetadata } from '@/lib/seo'
import { QueryProvider } from '@/providers/query-provider'
import { ListsPageClient } from './lists-page-client'

export const metadata = pageMetadata.lists

export default async function ListsPage() {
  return (
    <QueryProvider>
      <ListsPageClient />
    </QueryProvider>
  )
}

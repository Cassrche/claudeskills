import { allRules } from 'content-collections'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/navigation/app-shell'
import { Footer } from '@/components/navigation/footer'
import { getCachedGitHubStars } from '@/lib/cache'

export const SITE_LANGUAGE = 'en' as const
export type Locale = typeof SITE_LANGUAGE

interface SiteLayoutProps {
  children: ReactNode
}

export default async function SiteLayout({ children }: SiteLayoutProps) {
  const githubStars = await getCachedGitHubStars()

  const rules = allRules
    .filter(rule => rule.language === SITE_LANGUAGE)
    .map(rule => ({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      slug: rule.slug,
      priority: rule.priority,
      primaryCategory: rule.primaryCategory,
      language: rule.language
    }))

  return (
    <div lang={SITE_LANGUAGE} dir="ltr" className="min-h-screen">
      <div className="flex min-h-screen flex-col">
        <AppShell rules={rules} githubStars={githubStars} />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </div>
  )
}

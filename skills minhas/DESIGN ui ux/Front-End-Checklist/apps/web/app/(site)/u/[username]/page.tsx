import { prisma } from '@repo/auth/prisma'
import { routeHome } from '@repo/config'
import { allRules } from 'content-collections'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SITE_LANGUAGE } from '@/app/(site)/layout'
import { PublicProfileClient } from './public-profile-client'

interface PageProps {
  params: Promise<{ username: string }>
}

/**
 * Generate metadata for a public user profile.
 *
 * @param props - Route params containing the public username.
 * @returns Metadata describing the public profile page.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase(), isProfilePublic: true },
    select: { name: true, headline: true }
  })
  if (!user) return { title: 'Profile not found' }
  const title = [user.name ?? 'Profile', user.headline].filter(Boolean).join(' · ')
  return { title: title || 'Profile' }
}

interface CategoryProgressStats {
  total: number
  completed: number
}

/**
 * Public profile page at /u/[username]. Read-only; 404 if profile is private or not found.
 */
async function PublicProfilePageContent({ params }: PageProps) {
  const { username } = await params
  const lang = SITE_LANGUAGE
  const slug = username.trim().toLowerCase()
  if (!slug) notFound()

  const user = await prisma.user.findUnique({
    where: { username: slug, isProfilePublic: true },
    include: {
      ruleProgress: { select: { ruleId: true, completed: true } },
      checklists: {
        where: { publicId: { not: null } },
        select: { id: true, name: true, description: true, publicId: true, ruleIds: true }
      }
    }
  })

  if (!user) notFound()

  const langRules = allRules.filter(r => r.language === lang)
  const ruleIds = langRules.map(r => r.id)
  const ruleIdSet = new Set(ruleIds)
  const completedSet = new Set<string>()
  for (const progress of user.ruleProgress) {
    if (progress.completed) {
      completedSet.add(progress.ruleId)
    }
  }
  const completed = Array.from(completedSet).filter(ruleId => ruleIdSet.has(ruleId)).length
  const total = ruleIds.length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const categoryStats = Object.entries(
    langRules.reduce<Record<string, CategoryProgressStats>>((acc, rule) => {
      const cat = rule.primaryCategory
      if (!acc[cat]) acc[cat] = { total: 0, completed: 0 }
      acc[cat].total++
      if (completedSet.has(rule.id)) acc[cat].completed++
      return acc
    }, {})
  ).map(([category, stats]: [string, CategoryProgressStats]) => ({
    category,
    ...stats,
    percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  }))

  const sharedChecklists = user.checklists.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    publicId: c.publicId!,
    ruleCount: c.ruleIds.length
  }))

  return (
    <div className="container-content py-12 sm:py-16">
      <PublicProfileClient
        user={{
          name: user.name ?? 'Anonymous',
          image: user.image ?? undefined,
          headline: user.headline ?? undefined,
          bio: user.bio ?? undefined,
          githubUrl: user.githubUrl ?? undefined,
          xUrl: user.xUrl ?? undefined,
          linkedinUrl: user.linkedinUrl ?? undefined,
          githubCompany: user.githubCompany ?? undefined,
          githubBlog: user.githubBlog ?? undefined,
          githubLocation: user.githubLocation ?? undefined,
          githubPublicRepos: user.githubPublicRepos ?? undefined,
          githubFollowers: user.githubFollowers ?? undefined
        }}
        showProgress={user.showProgress}
        showChecklists={user.showChecklists}
        overallStats={{ total, completed, percentage }}
        categoryStats={categoryStats}
        sharedChecklists={sharedChecklists}
        homeHref={routeHome()}
      />
    </div>
  )
}

export default function PublicProfilePage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="container-content py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-background-muted" />
            <div className="h-32 rounded-lg bg-background-muted" />
            <div className="h-40 rounded-lg bg-background-muted" />
          </div>
        </div>
      }
    >
      <PublicProfilePageContent params={params} />
    </Suspense>
  )
}

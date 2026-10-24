import { Suspense } from 'react'
import { ErrorBoundary } from '@/components/feedback/status/error-boundary'
import { BottomCTA } from '@/components/homepage/bottom-cta'
import { CategorySection, type CategorySummary } from '@/components/homepage/category-section'
import {
  type ChecklistPreviewData,
  ChecklistsPreview
} from '@/components/homepage/checklists-preview'
import { FAQSection } from '@/components/homepage/faq-section'
import { HeroSection } from '@/components/homepage/hero-section'
import { McpSection } from '@/components/homepage/mcp-section'
import { MentionsSection } from '@/components/homepage/mentions-section'
import { ProTeaser } from '@/components/homepage/pro-teaser'
import { ResumeBanner } from '@/components/homepage/resume-banner'
import { PUBLIC_RULE_COUNT_LABEL } from '@/components/homepage/rule-count-display'
import {
  SponsorsSectionAsync,
  SponsorsSectionFallback
} from '@/components/homepage/sponsors-section-async'

interface HomePageContentProps {
  categories: CategorySummary[]
  githubStars: number | null
  checklistsForPreview: ChecklistPreviewData[]
  mentions: Parameters<typeof MentionsSection>[0]['mentions']
}

/**
 * Render the homepage sections after the page resolves its datasets.
 *
 * @param props - Homepage datasets and localized values.
 */
export function HomePageContent({
  categories,
  githubStars,
  checklistsForPreview,
  mentions
}: HomePageContentProps) {
  return (
    <>
      <ErrorBoundary sectionName="Hero">
        <HeroSection ruleCountLabel={PUBLIC_RULE_COUNT_LABEL} githubStars={githubStars} />
      </ErrorBoundary>

      <ErrorBoundary sectionName="Categories">
        <CategorySection categories={categories} />
      </ErrorBoundary>

      <ErrorBoundary sectionName="Checklists">
        <ChecklistsPreview checklists={checklistsForPreview} />
      </ErrorBoundary>

      <ErrorBoundary sectionName="MCP integration">
        <McpSection />
      </ErrorBoundary>

      <ErrorBoundary sectionName="Mentions">
        <MentionsSection mentions={mentions} />
      </ErrorBoundary>

      <ErrorBoundary sectionName="Pro teaser">
        <ProTeaser />
      </ErrorBoundary>

      <ErrorBoundary sectionName="FAQ">
        <FAQSection />
      </ErrorBoundary>

      <ErrorBoundary sectionName="Sponsors">
        <Suspense fallback={<SponsorsSectionFallback />}>
          <SponsorsSectionAsync />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary sectionName="Call to action">
        <BottomCTA />
      </ErrorBoundary>

      <ResumeBanner />
    </>
  )
}

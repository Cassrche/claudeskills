export type ChecklistAudience = 'junior-dev' | 'senior-reviewer' | 'launch-team' | 'ai-audit'

export interface ChecklistCuration {
  label: string
  audience: ChecklistAudience[]
  whenToUse: string
  expectedOutcome: string
  doneLooksLike: string
  differentiator: string
}

export const CHECKLIST_AUDIENCE_LABELS: Record<ChecklistAudience, string> = {
  'junior-dev': 'Junior dev',
  'senior-reviewer': 'Senior reviewer',
  'launch-team': 'Launch workflow',
  'ai-audit': 'AI-assisted audit'
}

export const checklistCurationMap: Record<string, ChecklistCuration> = {
  'launch-checklist': {
    label: 'Launch workflow',
    audience: ['launch-team', 'junior-dev'],
    whenToUse: 'Use before a new site, major redesign, or high-risk release goes live.',
    expectedOutcome:
      'You clear the baseline blockers that most often cause launch-day regressions.',
    doneLooksLike:
      'Critical document, accessibility, crawlability, transport, and baseline performance checks are verified before deployment.',
    differentiator:
      'This is the fastest broad launch gate. Use it instead of a deep audit when you need confidence quickly.'
  },
  'comprehensive-audit': {
    label: 'Broad site audit',
    audience: ['senior-reviewer', 'ai-audit'],
    whenToUse:
      'Use during scheduled quality reviews, after major redesigns, or when a team needs one cross-discipline pass.',
    expectedOutcome:
      'You leave with a prioritized action list across structure, accessibility, SEO, performance, security, and testing.',
    doneLooksLike:
      'You have reviewed representative pages across the major quality dimensions and logged clear pass/fail follow-up work.',
    differentiator:
      'Choose this instead of goal-based checklists when the question is “what is the overall quality state of the site?”'
  },
  'core-web-vitals': {
    label: 'Deep performance pass',
    audience: ['senior-reviewer', 'ai-audit'],
    whenToUse:
      'Use when LCP, CLS, or INP are already known concerns or when performance is part of a release gate.',
    expectedOutcome:
      'You understand which rendering, image, and loading decisions are holding back the core metrics.',
    doneLooksLike:
      'You can explain the likely metric bottlenecks and have a concrete plan for LCP, CLS, and INP improvements.',
    differentiator:
      'Use this instead of Performance Quick Wins when you need metric-level diagnosis rather than simple fast wins.'
  },
  'performance-quick-wins': {
    label: 'Fast performance wins',
    audience: ['junior-dev', 'launch-team'],
    whenToUse:
      'Use when you want the highest-impact performance improvements without a deep performance investigation.',
    expectedOutcome:
      'You improve transfer cost and loading behavior quickly with changes that are usually easy to implement.',
    doneLooksLike:
      'Compression, caching, page weight, and obvious loading issues are addressed before deeper optimization work.',
    differentiator:
      'This is the practical starting point before Core Web Vitals when the team needs speed improvements quickly.'
  },
  'accessibility-essentials': {
    label: 'Accessibility foundations',
    audience: ['junior-dev', 'senior-reviewer'],
    whenToUse:
      'Use on new pages, redesigns, or baseline accessibility reviews where the core experience matters more than edge-case nuance.',
    expectedOutcome:
      'You cover the most common failures that block keyboard, form, contrast, and media accessibility.',
    doneLooksLike:
      'Keyboard access, visible focus, form semantics, heading structure, and essential media accessibility are in place.',
    differentiator: 'This is the broad foundation checklist, not a full WCAG audit.'
  },
  'security-audit': {
    label: 'Frontend security pass',
    audience: ['senior-reviewer', 'launch-team'],
    whenToUse:
      'Use before launch, during trust reviews, or after changes to auth, forms, privacy, or third-party integrations.',
    expectedOutcome:
      'You confirm the main browser-visible security and privacy controls are working together as intended.',
    doneLooksLike:
      'Transport security, core headers, password/form handling, and privacy-boundary controls are all reviewed together.',
    differentiator:
      'This is a pragmatic frontend security pass, not a full application security assessment.'
  },
  'seo-audit': {
    label: 'Search visibility pass',
    audience: ['senior-reviewer', 'ai-audit'],
    whenToUse:
      'Use when traffic, indexing, metadata quality, or editorial discoverability are active concerns.',
    expectedOutcome:
      'You verify the crawl and metadata foundations search engines need before moving to more advanced SEO work.',
    doneLooksLike:
      'Titles, descriptions, canonical signals, crawl files, structured data, and editorial trust signals are in good shape.',
    differentiator:
      'This focuses on practical technical SEO fundamentals rather than content marketing strategy.'
  },
  'privacy-and-consent': {
    label: 'Consent and privacy controls',
    audience: ['senior-reviewer', 'launch-team'],
    whenToUse:
      'Use before shipping analytics, embedded tools, personalization, forms, or regional privacy-sensitive experiences.',
    expectedOutcome:
      'You know whether consent, storage, policy copy, and browser-visible privacy controls match what the site actually does.',
    doneLooksLike:
      'Consent gates work, tracking is scoped correctly, the privacy policy matches behavior, and browser-side controls are verified.',
    differentiator:
      'This is narrower than the security checklist and deeper on consent boundaries, storage, and policy alignment.'
  },
  'testing-checklist': {
    label: 'Testing strategy',
    audience: ['junior-dev', 'senior-reviewer'],
    whenToUse:
      'Use when a team needs a practical testing baseline or when a codebase has weak confidence before shipping changes.',
    expectedOutcome:
      'You leave with a clearer testing mix across unit, integration, end-to-end, accessibility, and browser coverage.',
    doneLooksLike:
      'Critical behaviors are covered by the right test layer and the testing plan feels intentional instead of ad hoc.',
    differentiator:
      'This is about choosing the right coverage mix, not just adding more tests everywhere.'
  },
  'html-foundations': {
    label: 'Page/template foundations',
    audience: ['junior-dev'],
    whenToUse:
      'Use when building new templates, shared layout primitives, or form-heavy pages and you want a reliable starting pass.',
    expectedOutcome:
      'You lock in the HTML decisions that quietly shape accessibility, browser behavior, and crawlability.',
    doneLooksLike:
      'Document shell, landmarks, input semantics, validation, and markup correctness are stable before deeper review.',
    differentiator:
      'This is the cleanest onboarding checklist for someone learning what a solid page foundation looks like.'
  },
  'javascript-resilience': {
    label: 'Runtime resilience',
    audience: ['junior-dev', 'senior-reviewer'],
    whenToUse:
      'Use after new integrations, state complexity, or client-side behavior starts feeling fragile under load or failure.',
    expectedOutcome:
      'You identify the runtime and typing patterns most likely to create crashes, stale state, or poor responsiveness.',
    doneLooksLike:
      'Failure handling, runtime validation, storage behavior, long-task responsiveness, and memory hygiene are covered.',
    differentiator: 'This is for client-side robustness, not general code style.'
  },
  'image-optimization': {
    label: 'Image delivery and quality',
    audience: ['junior-dev', 'launch-team'],
    whenToUse:
      'Use when image weight dominates page performance or when a team is cleaning up responsive media behavior.',
    expectedOutcome:
      'You reduce page weight and improve delivery quality without guessing where to start on media optimization.',
    doneLooksLike:
      'Formats, compression, responsive sizing, critical image loading, and SVG handling are all reviewed together.',
    differentiator:
      'This is a media-focused checklist that complements, rather than replaces, the broader performance checklists.'
  }
}

/**
 * Read the curated UX metadata for a checklist slug.
 *
 * @param slug - Checklist slug.
 * @returns Curated checklist metadata when available.
 */
export function getChecklistCuration(slug: string): ChecklistCuration | null {
  return checklistCurationMap[slug] ?? null
}

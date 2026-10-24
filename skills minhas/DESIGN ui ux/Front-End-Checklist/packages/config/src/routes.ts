// ---------------------------------------------------------------------------
// Centralized routes, paths, and external URLs for the entire monorepo.
//
// Every internal route segment and every external URL that appears in more
// than one file (or is likely to be referenced from multiple places) should
// live here so a rename only requires a single change.
// ---------------------------------------------------------------------------

// ── Site & service base URLs ────────────────────────────────────────────────

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://frontendchecklist.io'
export const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.frontendchecklist.io'

// ── GitHub ──────────────────────────────────────────────────────────────────

export const GITHUB_OWNER = 'thedaviddias'
export const GITHUB_REPO_NAME = 'Front-End-Checklist'
export const GITHUB_REPO = `${GITHUB_OWNER}/${GITHUB_REPO_NAME}` as const
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}` as const
export const GITHUB_REPO_API_URL = `https://api.github.com/repos/${GITHUB_REPO}` as const
export const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'
export const GITHUB_RULES_BLOB_URL = `${GITHUB_REPO_URL}/blob/main/packages/content/rules` as const

export const SKILLS_REPO = `${GITHUB_OWNER}/frontendchecklist` as const
export const SKILLS_SH_URL = `https://skills.sh/${SKILLS_REPO}` as const

/**
 * Build a GitHub "new issue" URL pre-filled with a title.
 */
export function githubNewIssueUrl(title: string): string {
  return `${GITHUB_REPO_URL}/issues/new?title=${encodeURIComponent(title)}`
}

// ── Social / author ─────────────────────────────────────────────────────────

export const SOCIAL = {
  x: 'https://x.com/thedaviddias',
  twitter: 'https://twitter.com/thedaviddias',
  authorUrl: 'https://thedaviddias.com',
  authorHandle: '@thedaviddias'
} as const

// ── Internal route segments ─────────────────────────────────────────────────
// These are the canonical-url site paths used by the English-only web app.

export const ROUTES = {
  home: '/',
  rules: '/rules',
  checklists: '/checklists',
  guides: '/guides',
  guide: '/guide',
  about: '/about',
  mcp: '/mcp',
  mentions: '/mentions',
  lists: '/lists',
  sharedChecklist: '/list',
  profile: '/profile',
  settings: '/settings',
  publicProfile: '/u',
  audits: '/audits',
  report: '/report',
  learn: '/learn'
} as const

// ── Route builders ──────────────────────────────────────────────────────────
// Type-safe helpers that produce canonical-url internal paths.

export function routeHome(): string {
  return ROUTES.home
}

export function routeRules(): string {
  return ROUTES.rules
}

export function routeRulesCategory(category: string): string {
  return `${ROUTES.rules}/${category}`
}

export function routeRule(category: string, slug: string): string {
  return `${ROUTES.rules}/${category}/${slug}`
}

export function routeChecklists(): string {
  return ROUTES.checklists
}

export function routeChecklist(slug: string): string {
  return `${ROUTES.checklists}/${slug}`
}

export function routeGuides(): string {
  return ROUTES.guides
}

export function routeGuideDetail(slug: string): string {
  return `${ROUTES.guides}/${slug}`
}

export function routeGuide(): string {
  return ROUTES.guide
}

export function routeAbout(): string {
  return ROUTES.about
}

export function routeMcp(): string {
  return ROUTES.mcp
}

export function routeMentions(): string {
  return ROUTES.mentions
}

export function routeLists(): string {
  return ROUTES.lists
}

export function routeList(id: string): string {
  return `${ROUTES.lists}/${id}`
}

export function routeSharedChecklist(publicId: string): string {
  return `${ROUTES.sharedChecklist}/${publicId}`
}

export function routeProfile(): string {
  return ROUTES.profile
}

export function routeSettings(): string {
  return ROUTES.settings
}

export function routePublicProfile(username: string): string {
  return `${ROUTES.publicProfile}/${username}`
}

export function routeAudits(): string {
  return ROUTES.audits
}

export function routeReport(publicId: string): string {
  return `${ROUTES.report}/${publicId}`
}

// ── Absolute URL builders (for SEO, sitemap, llms.txt, etc.) ────────────────

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`
}

export function absoluteRuleUrl(category: string, slug: string): string {
  return absoluteUrl(routeRule(category, slug))
}

// ── User-Agent string (used by crawler and audit-url tool) ──────────────────

export const BOT_USER_AGENT = `FrontEndChecklistBot/2.0 (+${SITE_URL})`

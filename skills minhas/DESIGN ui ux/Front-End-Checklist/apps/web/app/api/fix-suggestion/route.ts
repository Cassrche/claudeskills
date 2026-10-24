import { allRules } from 'content-collections'
import { NextResponse } from 'next/server'

/**
 * GET /api/fix-suggestion?slug=alt-text&code=optional-snippet
 * Returns fix prompt and optional code context for a rule (for context-aware fix suggestions).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const code = searchParams.get('code') ?? ''

  if (!slug?.trim()) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const rule = allRules.find(r => r.slug === slug.trim())
  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }

  const fixPrompt = rule.prompts?.fix ?? 'No fix prompt available for this rule.'
  const response: {
    slug: string
    title: string
    fixPrompt: string
    priority: string
    codeContext?: string
  } = {
    slug: rule.slug,
    title: rule.title,
    fixPrompt,
    priority: rule.priority
  }
  if (code.trim()) {
    response.codeContext = code.trim()
  }

  return NextResponse.json(response)
}

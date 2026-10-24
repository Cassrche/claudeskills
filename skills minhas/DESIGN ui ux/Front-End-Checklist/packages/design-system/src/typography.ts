/**
 * Fonttrio Launch typography config for the design system.
 *
 * Next.js requires literal `next/font` options in the app, so this file stays
 * the source of truth for class names and CSS variable mapping.
 */
export const launchFontConfig = {
  sora: {
    variable: '--font-sora' as const,
    subsets: ['latin'] as ('latin' | 'latin-ext')[],
    display: 'swap' as const
  },
  publicSans: {
    variable: '--font-public-sans' as const,
    subsets: ['latin'] as ('latin' | 'latin-ext' | 'vietnamese')[],
    display: 'swap' as const
  },
  firaCode: {
    variable: '--font-fira-code' as const,
    subsets: ['latin'] as (
      | 'latin'
      | 'latin-ext'
      | 'cyrillic'
      | 'cyrillic-ext'
      | 'greek'
      | 'greek-ext'
      | 'symbols2'
    )[],
    display: 'swap' as const
  }
}

export const launchFontCssVars = {
  heading: 'var(--font-sora)',
  body: 'var(--font-public-sans)',
  mono: 'var(--font-fira-code)'
} as const

export type LaunchFontInstances = {
  sora: { className?: string; variable?: string }
  publicSans: { className?: string; variable?: string }
  firaCode: { className?: string; variable?: string }
}

/** Build the html className that attaches font variables to the document root. */
export function launchFontClassNames(instances: LaunchFontInstances): string {
  return [instances.sora.variable, instances.publicSans.variable, instances.firaCode.variable]
    .filter((value): value is string => Boolean(value))
    .join(' ')
}

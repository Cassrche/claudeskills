import { SKILLS_REPO } from '@repo/config'
import { CodeSurface, CommandCode } from '@repo/design-system/custom/content/code-surface'
import { cn } from '@repo/utils'

interface SkillInstallBoxProps {
  slug: string
  className?: string
}

/** Renders a copyable `npx skills add` command for a given skill slug. */
export function SkillInstallBox({ slug, className }: SkillInstallBoxProps) {
  const command = `npx skills add ${SKILLS_REPO} --skill ${slug}`

  return (
    <CodeSurface
      copyText={command}
      density="compact"
      wrapperClassName={cn('my-0 w-full', className)}
      className="px-4 py-3 text-sm"
    >
      <CommandCode
        tokens={[
          { text: 'npx', className: 'text-green-700 dark:text-green-400' },
          { text: ` skills add ${SKILLS_REPO} ` },
          { text: '--skill', className: 'text-cyan-700 dark:text-cyan-400' },
          { text: ` ${slug}` }
        ]}
      />
    </CodeSurface>
  )
}

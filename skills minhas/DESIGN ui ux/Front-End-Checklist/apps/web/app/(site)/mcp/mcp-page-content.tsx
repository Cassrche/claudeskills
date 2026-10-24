import { GITHUB_REPO_URL, routeRules } from '@repo/config'
import { CodeSurface, InlineCode } from '@repo/design-system/custom/content/code-surface'
import {
  Bot,
  ChevronRight,
  Code2,
  HelpCircle,
  MessageSquare,
  Shield,
  Terminal,
  Workflow
} from '@repo/design-system/icons'
import {
  ExternalLinkCard,
  SectionHeading,
  SecurityListItem,
  UseCaseCard
} from '@/app/(site)/mcp/mcp-section-components'
import {
  CLIENT_CONFIGS,
  EXAMPLE_PROMPTS,
  FAQ_ITEMS,
  MCP_SERVER_URL,
  MCP_TOOLS,
  TROUBLESHOOTING_ITEMS
} from '@/app/(site)/mcp/page-data'
import { TrackedCopyButton } from '@/components/analytics/tracked-copy-button'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { FaqAccordion } from '@/components/content/disclosures/faq-accordion'
import { PageHero } from '@/components/content/page/page-hero'
import { CliNotifyForm } from '@/components/mcp/cli-notify-form'
import { SetupTabs } from '@/components/mcp/setup-tabs'
import { ToolCard } from '@/components/mcp/tool-card'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'

interface McpPageContentProps {
  cursorInstallUrl: string
  vscodeInstallUrl: string
}

/**
 * Render the static marketing content for the MCP page.
 *
 * @param props - Install-link details.
 */
export function McpPageContent({ cursorInstallUrl, vscodeInstallUrl }: McpPageContentProps) {
  return (
    <>
      <PageHero
        title="Frontend Code Review MCP"
        description="Connect AI agents to 385 Front-End Checklist rules for React, Next.js, HTML, CSS, JavaScript, accessibility, performance, SEO, security, images, privacy, i18n, and launch audits."
        maxWidth="narrow"
        eyebrow={
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-accent/10 p-2">
              <Bot className="h-6 w-6 text-accent" aria-hidden="true" />
            </div>
            <span className="font-medium text-accent text-sm uppercase tracking-wider">
              AI Integration
            </span>
          </div>
        }
      >
        <div className="max-w-2xl">
          <p className="mb-2 text-foreground-muted text-xs">Server URL</p>
          <CodeSurface
            code={MCP_SERVER_URL}
            copyText={MCP_SERVER_URL}
            codeClassName="break-all"
            wrapperClassName="my-0"
          />
        </div>
      </PageHero>

      <section aria-labelledby="quick-start-heading" className="mb-16">
        <SectionHeading icon={Terminal} id="quick-start-heading" title="Quick start" />
        <p className="mb-4 max-w-2xl text-foreground-muted">
          The fastest way to add the Front-End Checklist MCP server is with one command. After
          installing, ask your agent to use the Front-End Checklist MCP for frontend work so lazy
          tool-loading clients surface it when it matters.
        </p>
        <div className="max-w-2xl">
          <CodeSurface
            code={`pnpm dlx add-mcp ${MCP_SERVER_URL}`}
            copyText={`pnpm dlx add-mcp ${MCP_SERVER_URL}`}
            density="compact"
            wrapperClassName="my-0"
          />
          <p className="mt-3 text-foreground-muted text-xs">
            Requires Node.js 18+. Restart your editor after running. For per-client instructions,
            use the tabs below.
          </p>
        </div>
      </section>

      <section aria-labelledby="setup-heading" className="mb-16">
        <SectionHeading icon={Terminal} id="setup-heading" title="Setup Instructions" />
        <p className="mb-6 max-w-2xl text-foreground-muted">
          Choose your AI tool below and follow the setup instructions. The server exposes{' '}
          {MCP_TOOLS.length} tools plus reusable prompts and read-only resources for searching,
          checking, and learning the same frontend standards available on the website. Existing tool
          names stay stable for client compatibility.
        </p>
        <SetupTabs
          configs={CLIENT_CONFIGS}
          cursorInstallUrl={cursorInstallUrl}
          vscodeInstallUrl={vscodeInstallUrl}
        />
        <p className="mt-6 text-foreground-muted text-sm">
          Hundreds of other tools support MCP servers. Configure them with the server URL above.
          Check your tool&apos;s documentation for specific setup instructions.
        </p>
      </section>

      <section aria-labelledby="tools-heading" className="mb-16">
        <SectionHeading icon={Code2} id="tools-heading" title="Available Tools" />
        <p className="mb-8 max-w-2xl text-foreground-muted">
          The MCP server provides {MCP_TOOLS.length} tools for frontend review workflows. Start with{' '}
          <InlineCode>review_code</InlineCode> for pasted HTML, CSS, JavaScript, React, or Next.js
          code, then use rule-specific tools for targeted checks and remediation. Clients can also
          browse rule/checklist resources and invoke built-in prompts for common workflows.
        </p>
        <div className="space-y-4">
          {MCP_TOOLS.map(tool => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      </section>

      <section aria-labelledby="example-prompts-heading" className="mb-16">
        <SectionHeading
          icon={MessageSquare}
          id="example-prompts-heading"
          title="Try these prompts"
        />
        <p className="mb-6 max-w-2xl text-foreground-muted">
          After connecting, use direct prompts that name the MCP server. This helps agents choose it
          over generic review habits, especially in clients that lazy-load installed tools.
        </p>
        <ul className="max-w-2xl space-y-0 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {EXAMPLE_PROMPTS.map(item => (
            <li
              key={item.prompt}
              className="flex items-start justify-between gap-3 bg-background px-4 py-3 first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm">&ldquo;{item.prompt}&rdquo;</p>
                {item.description && (
                  <p className="mt-1 text-foreground-muted text-xs">{item.description}</p>
                )}
              </div>
              <TrackedCopyButton
                text={item.prompt}
                className="shrink-0"
                iconClassName="h-3.5 w-3.5"
                telemetryEvent={TELEMETRY_EVENTS.copyActionCompleted}
                telemetryProperties={{
                  label: 'copy_mcp_example_prompt',
                  location: 'mcp_example_prompts',
                  target: item.prompt
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="usecases-heading" className="mb-16">
        <SectionHeading icon={Workflow} id="usecases-heading" title="Use Cases" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <UseCaseCard
            title="Code Reviews"
            description="Use review_code to check HTML, CSS, JavaScript, React, and Next.js changes against best practices with prioritized fix guidance."
          />
          <UseCaseCard
            title="Learning"
            description="Use explain_rule to understand why rules matter. Great for onboarding new team members or deepening knowledge."
          />
          <UseCaseCard
            title="Pre-Launch Audits"
            description="Use get_workflow with launch-checklist to get an ordered sequence of critical checks before deployment."
          />
          <UseCaseCard
            title="CI/CD Integration"
            description="Use get_quick_reference to generate checklists in markdown format for automated quality gates."
          />
          <UseCaseCard
            title="Accessibility Audits"
            description="Use search_rules with categories=['accessibility'] to find a11y rules, then check_rule for specific markup and component issues."
          />
          <UseCaseCard
            title="Performance Optimization"
            description="Use review_code with focus=['performance'] to identify performance issues in your code."
          />
        </div>
      </section>

      <section aria-labelledby="cli-notify-heading" className="mb-16">
        <SectionHeading
          icon={Terminal}
          id="cli-notify-heading"
          title="Coming soon: Standalone CLI"
        />
        <p className="mb-4 max-w-2xl text-foreground-muted">
          We&apos;re building a standalone CLI so you can audit any URL from your terminal—no MCP
          required. Get notified when it launches.
        </p>
        <CliNotifyForm />
      </section>

      <section aria-labelledby="security-heading" className="mb-16">
        <SectionHeading icon={Shield} id="security-heading" title="Security & Privacy" />
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="mb-4 text-foreground-muted">
            The Front-End Checklist MCP server is designed with security in mind:
          </p>
          <ul className="space-y-3">
            <SecurityListItem title="Read-only access">
              The server only provides access to our public rules database. It cannot modify any
              data.
            </SecurityListItem>
            <SecurityListItem title="No authentication required">
              All rules are public, so no credentials are needed or stored.
            </SecurityListItem>
            <SecurityListItem title="Code stays local">
              When you use review_code, your code is sent to the server but is not stored or logged.
            </SecurityListItem>
            <SecurityListItem title="Anonymous telemetry">
              Only anonymous usage counters are collected for tool adoption metrics.
            </SecurityListItem>
          </ul>
        </div>
      </section>

      <section aria-labelledby="troubleshooting-heading" className="mb-16">
        <SectionHeading icon={HelpCircle} id="troubleshooting-heading" title="Troubleshooting" />
        <div className="max-w-2xl space-y-0 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {TROUBLESHOOTING_ITEMS.map(item => (
            <div
              key={item.title}
              className="border-l-4 border-l-accent/50 bg-background px-4 py-4 first:rounded-t-lg last:rounded-b-lg"
            >
              <h3 className="mb-2 font-medium text-foreground text-sm">{item.title}</h3>
              <p className="text-foreground-muted text-sm">{item.content}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="mb-16">
        <SectionHeading icon={HelpCircle} id="faq-heading" title="FAQ" />
        <FaqAccordion items={FAQ_ITEMS} className="max-w-2xl" />
      </section>

      <section className="border-border border-t pt-8">
        <div className="flex flex-wrap gap-3">
          <TrackedLink
            href={routeRules()}
            telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
            telemetryProperties={{
              label: 'browse_all_rules',
              location: 'mcp_footer'
            }}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground text-sm transition-colors hover:bg-accent-hover"
          >
            Browse All Rules
            <ChevronRight className="h-4 w-4" />
          </TrackedLink>
          <ExternalLinkCard href={GITHUB_REPO_URL} label="view_on_github">
            View on GitHub
          </ExternalLinkCard>
          <ExternalLinkCard href="https://spec.modelcontextprotocol.io/" label="mcp_specification">
            MCP Specification
          </ExternalLinkCard>
        </div>
      </section>
    </>
  )
}

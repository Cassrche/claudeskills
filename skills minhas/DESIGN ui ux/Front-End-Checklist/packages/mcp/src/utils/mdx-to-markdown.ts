/**
 * Transform MDX content to plain Markdown
 * Strips custom components and converts them to standard Markdown equivalents
 */

/**
 * Component transformation rules
 */
const COMPONENT_TRANSFORMS: Array<{
  pattern: RegExp
  transform: (match: string, ...groups: string[]) => string
}> = [
  // <CodeExample language="html">content</CodeExample> -> ```html\ncontent\n```
  {
    pattern: /<CodeExample\s+language=["']([^"']+)["']>\s*([\s\S]*?)\s*<\/CodeExample>/gi,
    transform: (_, lang, content) => `\`\`\`${lang}\n${content.trim()}\n\`\`\``
  },

  // <Warning title="...">content</Warning> -> > **Warning: title**\n> content
  {
    pattern: /<Warning(?:\s+title=["']([^"']+)["'])?>\s*([\s\S]*?)\s*<\/Warning>/gi,
    transform: (_, title, content) => {
      const prefix = title ? `**Warning: ${title}**` : '**Warning:**'
      const lines = content
        .trim()
        .split('\n')
        .map((line: string) => `> ${line}`)
      return `> ${prefix}\n${lines.join('\n')}`
    }
  },

  // <Tip>content</Tip> -> > **Tip:** content
  {
    pattern: /<Tip>\s*([\s\S]*?)\s*<\/Tip>/gi,
    transform: (_, content) => {
      const lines = content
        .trim()
        .split('\n')
        .map((line: string) => `> ${line}`)
      return `> **Tip:**\n${lines.join('\n')}`
    }
  },

  // <ErrorBox title="...">content</ErrorBox> -> > **Error: title**\n> content
  {
    pattern: /<ErrorBox(?:\s+title=["']([^"']+)["'])?>\s*([\s\S]*?)\s*<\/ErrorBox>/gi,
    transform: (_, title, content) => {
      const prefix = title ? `**Error: ${title}**` : '**Error:**'
      const lines = content
        .trim()
        .split('\n')
        .map((line: string) => `> ${line}`)
      return `> ${prefix}\n${lines.join('\n')}`
    }
  },

  // <Success title="...">content</Success> -> > **Best Practice: title**\n> content
  {
    pattern: /<Success(?:\s+title=["']([^"']+)["'])?>\s*([\s\S]*?)\s*<\/Success>/gi,
    transform: (_, title, content) => {
      const prefix = title ? `**Best Practice: ${title}**` : '**Best Practice:**'
      const lines = content
        .trim()
        .split('\n')
        .map((line: string) => `> ${line}`)
      return `> ${prefix}\n${lines.join('\n')}`
    }
  },

  // <Exceptions>content</Exceptions> -> **Exceptions:**\n content
  {
    pattern: /<Exceptions>\s*([\s\S]*?)\s*<\/Exceptions>/gi,
    transform: (_, content) => `**Exceptions:**\n\n${content.trim()}`
  },

  // <CodeTabs defaultTab="...">content</CodeTabs> -> content (just unwrap)
  {
    pattern: /<CodeTabs[^>]*>\s*([\s\S]*?)\s*<\/CodeTabs>/gi,
    transform: (_, content) => content.trim()
  },

  // <Tab value="..." label="...">content</Tab> -> **label:**\ncontent
  {
    pattern: /<Tab[^>]*label=["']([^"']+)["'][^>]*>\s*([\s\S]*?)\s*<\/Tab>/gi,
    transform: (_, label, content) => `**${label}:**\n\n${content.trim()}`
  },

  // <CodeComparison>content</CodeComparison> -> content (just unwrap)
  {
    pattern: /<CodeComparison>\s*([\s\S]*?)\s*<\/CodeComparison>/gi,
    transform: (_, content) => content.trim()
  },

  // <Before>content</Before> -> **Before:**\ncontent
  {
    pattern: /<Before>\s*([\s\S]*?)\s*<\/Before>/gi,
    transform: (_, content) => `**Before:**\n\n${content.trim()}`
  },

  // <After>content</After> -> **After:**\ncontent
  {
    pattern: /<After>\s*([\s\S]*?)\s*<\/After>/gi,
    transform: (_, content) => `**After:**\n\n${content.trim()}`
  }
]

/**
 * Remove import statements
 */
function removeImports(content: string): string {
  return content.replace(/^import\s+.*?['"]\s*;?\s*$/gm, '')
}

/**
 * Remove export statements
 */
function removeExports(content: string): string {
  return content.replace(/^export\s+(default\s+)?/gm, '')
}

/**
 * Clean up self-closing JSX tags that we don't handle
 */
function removeUnhandledComponents(content: string): string {
  // Remove self-closing components like <Component />
  content = content.replace(/<[A-Z][a-zA-Z]*\s*\/>/g, '')

  // Remove any remaining unhandled components with content
  // This is a fallback for components we don't explicitly handle
  content = content.replace(/<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, match => {
    // If we got here, the component wasn't handled by COMPONENT_TRANSFORMS
    // Extract inner content if possible
    const innerMatch = match.match(/>([^<]*)</)
    return innerMatch ? innerMatch[1].trim() : ''
  })

  return content
}

/**
 * Clean up extra whitespace
 */
function cleanWhitespace(content: string): string {
  return content
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/^\s+$/gm, '') // Remove whitespace-only lines
    .trim()
}

/**
 * Convert MDX content to Markdown
 */
export function mdxToMarkdown(mdxContent: string): string {
  let content = mdxContent

  // Remove frontmatter if present
  content = content.replace(/^---[\s\S]*?---\s*/, '')

  // Remove imports and exports
  content = removeImports(content)
  content = removeExports(content)

  // Apply component transformations
  for (const { pattern, transform } of COMPONENT_TRANSFORMS) {
    content = content.replace(pattern, transform)
  }

  // Remove any unhandled components
  content = removeUnhandledComponents(content)

  // Clean up whitespace
  content = cleanWhitespace(content)

  return content
}

/**
 * Extract plain text from markdown (for search indexing)
 */
export function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      // Remove headers
      .replace(/^#+\s*/gm, '')
      // Remove bold/italic
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
      // Remove blockquotes
      .replace(/^>\s*/gm, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Clean up whitespace
      .replace(/\n{2,}/g, '\n')
      .trim()
  )
}

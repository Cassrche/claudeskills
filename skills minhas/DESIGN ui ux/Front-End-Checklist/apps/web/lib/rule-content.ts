import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { unstable_cache } from 'next/cache'

/**
 * Resolve the absolute path to the rules content directory.
 * When the server runs from apps/web (e.g. via turbo dev), cwd is apps/web.
 */
const RULES_DIR = path.join(process.cwd(), '..', '..', 'packages', 'content', 'rules')

/**
 * Read raw MDX body for a rule from disk (strips YAML frontmatter).
 * Used when content is not included in the content-collections output to reduce generated file size.
 *
 * @param filePath - Relative path from rules dir (e.g. "en/html/alt-text.mdx")
 */
export const getRuleRawContent = unstable_cache(
  async (filePath: string): Promise<string> => {
    const fullPath = path.join(RULES_DIR, filePath)
    const raw = await readFile(fullPath, 'utf-8')
    const match = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/m)
    return match ? match[1].trim() : raw
  },
  ['rule-raw-content']
)

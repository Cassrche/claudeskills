/**
 * CLI entry for the crawler. Usage: pnpm crawl:site <url>
 */
import { type CrawlResult, crawl } from './index.js'

const url = process.argv[2]
if (!url?.startsWith('http')) {
  console.error('Usage: pnpm crawl:site <https://example.com>')
  process.exit(1)
}

crawl(url)
  .then((result: CrawlResult) => {
    process.stdout.write(
      `${JSON.stringify(
        { baseUrl: result.baseUrl, summary: result.summary, pages: result.pages.length },
        null,
        2
      )}\n`
    )
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })

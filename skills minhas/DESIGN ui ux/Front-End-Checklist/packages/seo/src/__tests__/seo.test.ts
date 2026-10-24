import {
  generateBreadcrumbStructuredData,
  generateCategoryMetaTags,
  generateFAQStructuredData,
  generateMetaTags,
  generateRobotsTxt,
  generateRuleMetaTags,
  generateRuleStructuredData,
  generateSitemapUrls,
  generateSitemapXML,
  generateStructuredData,
  generateWebsiteStructuredData,
  renderMetaTags,
  renderStructuredData,
  validateMetaTags
} from '../index'

const sampleRule = {
  title: 'Use semantic HTML',
  slug: 'semantic-html',
  categories: ['html', 'accessibility'],
  priority: 'high',
  content: 'Use semantic HTML elements for structure and accessibility.',
  primaryCategory: 'html',
  url: '/rules/html/semantic-html'
}

describe('@repo/seo', () => {
  it('generates meta tags with defaults and overrides', () => {
    const meta = generateMetaTags({ title: 'Title', url: '/test', tags: ['one'] })
    expect(meta.title).toContain('Title')
    expect(meta.canonical).toContain('/test')
    expect(meta.keywords).toContain('one')
  })

  it('generates rule and category meta tags', () => {
    expect(generateRuleMetaTags(sampleRule).title).toContain(sampleRule.title)
    expect(generateCategoryMetaTags('html').title).toContain('HTML')
  })

  it('generates structured data variants', () => {
    expect(generateStructuredData('Thing', { name: 'Example' })['@type']).toBe('Thing')
    expect(generateWebsiteStructuredData()['@type']).toBe('WebSite')
    expect(generateRuleStructuredData(sampleRule)['@type']).toBe('Article')
    expect(
      generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Rule', url: '/rules/html/semantic-html' }
      ])['@type']
    ).toBe('BreadcrumbList')
    expect(generateFAQStructuredData([{ question: 'Q?', answer: 'A!' }])['@type']).toBe('FAQPage')
  })

  it('generates sitemap urls, xml, and robots.txt', () => {
    const urls = generateSitemapUrls([sampleRule])
    expect(urls.some(url => url.url === sampleRule.url)).toBe(true)
    const xml = generateSitemapXML(urls)
    expect(xml).toContain('<?xml')
    expect(xml).toContain(sampleRule.url)

    const robots = generateRobotsTxt({ disallow: ['/private'], allow: ['/'], crawlDelay: 5 })
    expect(robots).toContain('Disallow: /private')
    expect(robots).toContain('Crawl-delay: 5')
  })

  it('renders meta tags and structured data payloads', () => {
    const tags = renderMetaTags(
      generateMetaTags({
        title: 'Rendered',
        description: 'A description long enough to be valid for metadata rendering output checks.',
        keywords: ['seo', 'checklist']
      })
    )
    expect(tags.some(tag => tag.type === 'title')).toBe(true)
    expect(tags.some(tag => tag.props.name === 'description')).toBe(true)

    const structured = renderStructuredData(generateWebsiteStructuredData())
    expect(structured.type).toBe('script')
    expect(structured.props.type).toBe('application/ld+json')
  })

  it('validates missing and suspicious metadata', () => {
    const invalid = validateMetaTags({})
    expect(invalid.isValid).toBe(false)
    expect(invalid.errors).toContain('Title is required')
    expect(invalid.errors).toContain('Description is required')

    const warning = validateMetaTags({
      title: 'T'.repeat(65),
      description: 'short',
      keywords: Array.from({ length: 11 }, (_, i) => `k${i}`)
    })
    expect(warning.warnings).toContain('Title should be under 60 characters')
    expect(warning.warnings).toContain('Description should be at least 120 characters')
    expect(warning.warnings).toContain('Too many keywords, consider reducing to 5-10')
  })
})

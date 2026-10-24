import { launchFontClassNames } from '@repo/design-system/typography'
import { AnalyticsProvider } from '@thedaviddias/analytics'
import { OpenPanelIdentify } from '@thedaviddias/analytics/providers/openpanel-identify'
import type { Metadata, Viewport } from 'next'
import { Fira_Code, Public_Sans, Sora } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import type { ReactNode } from 'react'
import {
  baseMetadata,
  generateOrganizationSchema,
  generateWebsiteSchema,
  JsonLd,
  siteConfig
} from '@/lib/seo'
import './globals.css'

// Fonttrio Launch — options must be literals for next/font. Values match @repo/design-system/typography launchFontConfig.
const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  display: 'swap'
})
const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
  display: 'swap'
})
const firaCode = Fira_Code({
  variable: '--font-fira-code',
  subsets: ['latin'],
  display: 'swap'
})

export const metadata: Metadata = {
  ...baseMetadata,
  title: {
    default: `${siteConfig.name} - The Essential Web Development Reference`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  alternates: {
    canonical: siteConfig.url,
    languages: {
      en: siteConfig.url
    }
  },
  openGraph: {
    ...baseMetadata.openGraph,
    url: siteConfig.url,
    title: `${siteConfig.name} - The Essential Web Development Reference`,
    description: siteConfig.description
  },
  twitter: {
    ...baseMetadata.twitter,
    title: `${siteConfig.name} - The Essential Web Development Reference`,
    description: siteConfig.description
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' }
  ]
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const openPanelClientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID

  return (
    <html
      lang="en"
      className={launchFontClassNames({ sora, publicSans, firaCode })}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Structured Data for SEO */}
        <JsonLd data={generateOrganizationSchema()} />
        <JsonLd data={generateWebsiteSchema()} />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans antialiased">
        <AnalyticsProvider clientId={openPanelClientId} />
        {openPanelClientId ? <OpenPanelIdentify /> : null}
        {/* Skip link for keyboard navigation - WCAG AAA */}
        <a
          href="#main-content"
          className="absolute top-[-100px] left-4 z-9999 rounded-md border-0 bg-foreground px-6 py-3 font-medium text-background text-sm transition-[top] duration-150 focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>
            <main id="main-content" className="flex flex-1 flex-col">
              {children}
            </main>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  )
}

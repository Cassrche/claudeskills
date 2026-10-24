import type { NextConfig } from 'next'

const otelRegex = /@opentelemetry\/instrumentation/

export const baseConfig: NextConfig = {
  reactStrictMode: true,

  webpack(config, { isServer }) {
    if (isServer) {
      config.plugins = config.plugins || []
    }

    config.ignoreWarnings = [{ module: otelRegex }]

    return config
  },

  skipTrailingSlashRedirect: true
}

/** Add bundle analyzer support when the optional dependency is installed. */
export const withAnalyzer = (sourceConfig: NextConfig) => {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')
    return withBundleAnalyzer()(sourceConfig)
  } catch {
    console.warn('@next/bundle-analyzer not installed, skipping bundle analysis')
    return sourceConfig
  }
}

/** Add Vercel toolbar support when the optional dependency is installed. */
export const withVercelToolbarConfig = (sourceConfig: NextConfig) => {
  try {
    const { default: withVercelToolbar } = require('@vercel/toolbar/plugins/next')
    return withVercelToolbar()(sourceConfig)
  } catch {
    console.warn('@vercel/toolbar not installed, skipping Vercel toolbar')
    return sourceConfig
  }
}

/** Add Plausible proxy support when the optional dependency is installed. */
export const withPlausibleProxyConfig = (sourceConfig: NextConfig) => {
  try {
    const { withPlausibleProxy } = require('next-plausible')
    return withPlausibleProxy()(sourceConfig)
  } catch {
    console.warn('next-plausible not installed, skipping Plausible proxy')
    return sourceConfig
  }
}

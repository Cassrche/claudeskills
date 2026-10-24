import type { Page } from '@playwright/test'
import { TEST_CONFIG } from '@/e2e/config/test.config'

type ChromeMemoryInfo = {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

type ChromePerformance = Performance & {
  memory?: ChromeMemoryInfo
}

/** Performance measurement helpers for end-to-end tests. */
export class PerformanceUtils {
  constructor(private page: Page) {}

  async measurePageLoad() {
    const metrics = await this.page.evaluate(() => {
      const [navigation] = performance.getEntriesByType('navigation')

      if (!(navigation instanceof PerformanceNavigationTiming)) {
        throw new Error('Navigation timing entry is unavailable')
      }

      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        firstPaint: 0, // Would need additional API
        firstContentfulPaint: 0, // Would need additional API
        timeToInteractive: navigation.domInteractive - navigation.fetchStart
      }
    })

    return metrics
  }

  async measureInteraction(action: () => Promise<void>) {
    const startTime = Date.now()
    await action()
    const endTime = Date.now()

    return {
      duration: endTime - startTime,
      isAcceptable: endTime - startTime < TEST_CONFIG.performance.maxInteractionTime
    }
  }

  async getResourceMetrics() {
    const resources = await this.page.evaluate(() => {
      const entries = performance
        .getEntriesByType('resource')
        .filter(
          (entry): entry is PerformanceResourceTiming => entry instanceof PerformanceResourceTiming
        )

      return entries.map(entry => ({
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize,
        type: entry.initiatorType
      }))
    })

    return {
      totalResources: resources.length,
      totalSize: resources.reduce((sum, r) => sum + r.size, 0),
      totalDuration: resources.reduce((sum, r) => sum + r.duration, 0),
      resources
    }
  }

  async checkCoreWebVitals() {
    // Placeholder for Core Web Vitals measurement
    return {
      lcp: { value: 0, rating: 'good' },
      fid: { value: 0, rating: 'good' },
      cls: { value: 0, rating: 'good' }
    }
  }

  async measureMemoryUsage() {
    const memory = await this.page.evaluate(() => {
      const perf: ChromePerformance = performance
      if (perf.memory) {
        return {
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit
        }
      }
      return null
    })

    return memory
  }
}

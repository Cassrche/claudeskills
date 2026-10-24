export const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 2,
  workers: 4,
  performance: {
    maxLoadTime: 3000,
    maxInteractionTime: 100
  },
  accessibility: {
    runOnly: ['wcag2aa', 'wcag21aa']
  }
}

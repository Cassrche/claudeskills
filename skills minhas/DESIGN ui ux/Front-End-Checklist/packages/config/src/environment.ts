/** Type-safe environment variable reader with simple caching. */
export class Environment {
  private static instance: Environment
  private cache: Map<string, any> = new Map()

  private constructor() {}

  static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment()
    }
    return Environment.instance
  }

  get(key: string, defaultValue?: any): any {
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }

    const value = this.getEnvironmentVariable(key) ?? defaultValue
    this.cache.set(key, value)
    return value
  }

  getString(key: string, defaultValue = ''): string {
    return String(this.get(key, defaultValue))
  }

  getNumber(key: string, defaultValue = 0): number {
    const value = this.get(key)
    const parsed = Number(value)
    return Number.isNaN(parsed) ? defaultValue : parsed
  }

  getBoolean(key: string, defaultValue = false): boolean {
    const value = this.get(key)
    if (value === undefined || value === null) return defaultValue
    return value === 'true' || value === true || value === '1' || value === 1
  }

  getJson<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const value = this.get(key)
    if (!value) return defaultValue

    try {
      return JSON.parse(value)
    } catch {
      return defaultValue
    }
  }

  private getEnvironmentVariable(key: string): string | undefined {
    // Check multiple formats
    const formats = [
      key,
      `NEXT_PUBLIC_${key}`,
      key.toUpperCase(),
      `NEXT_PUBLIC_${key.toUpperCase()}`,
      this.toSnakeCase(key),
      `NEXT_PUBLIC_${this.toSnakeCase(key)}`
    ]

    for (const format of formats) {
      if (process.env[format] !== undefined) {
        return process.env[format]
      }
    }

    return undefined
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, '')
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const env = Environment.getInstance()

// Convenience exports
/** Read an environment value. */
export const getEnv = (key: string, defaultValue?: unknown) => env.get(key, defaultValue)
/** Read an environment value as a string. */
export const getEnvString = (key: string, defaultValue?: string) => env.getString(key, defaultValue)
/** Read an environment value as a number. */
export const getEnvNumber = (key: string, defaultValue?: number) => env.getNumber(key, defaultValue)
/** Read an environment value as a boolean. */
export const getEnvBoolean = (key: string, defaultValue?: boolean) =>
  env.getBoolean(key, defaultValue)
/** Read a JSON environment value. */
export const getEnvJson = <T = unknown>(key: string, defaultValue?: T) =>
  env.getJson(key, defaultValue)

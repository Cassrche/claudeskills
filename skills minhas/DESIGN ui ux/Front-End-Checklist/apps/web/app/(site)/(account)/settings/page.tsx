import { pageMetadata } from '@/lib/seo'
import { SettingsPageShell } from './settings-page-shell'

export const metadata = pageMetadata.settings

/**
 * Private settings page for account management, email preferences, and data.
 */
export default async function SettingsPage() {
  return <SettingsPageShell />
}

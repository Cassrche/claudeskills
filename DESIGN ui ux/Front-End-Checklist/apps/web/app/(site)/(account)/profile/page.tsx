import { pageMetadata } from '@/lib/seo'
import { ProfilePageShell } from './profile-page-shell'

export const metadata = pageMetadata.profile

/**
 * Profile editing page: private by default, username, headline, bio, social links, visibility toggles.
 */
export default async function ProfilePage() {
  return <ProfilePageShell />
}

import { routeAudits } from '@repo/config'
import { redirect } from 'next/navigation'
export default async function DashboardPage() {
  redirect(routeAudits())
}

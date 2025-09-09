import { SimpleDbLogin } from '@/components/auth/simple-db-login'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const params = await searchParams
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <SimpleDbLogin />
    </div>
  )
}

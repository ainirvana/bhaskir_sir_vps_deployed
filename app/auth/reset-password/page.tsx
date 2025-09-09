import { Metadata } from 'next'
import { PasswordReset } from '@/components/auth/password-reset'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your password',
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const params = await searchParams
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your new password below
          </p>
        </div>
        <PasswordReset 
          token={params.token} 
          email={params.email} 
        />
      </div>
    </div>
  )
}
import { Metadata } from 'next'
import { StudentRegistration } from '@/components/auth/student-registration'

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new account',
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; name?: string; email?: string }>
}) {
  const params = await searchParams
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <StudentRegistration 
        token={params.token} 
        fullName={params.name} 
        email={params.email} 
      />
    </div>
  )
}

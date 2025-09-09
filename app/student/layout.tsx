'use client';

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileText, Brain, Home, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface StudentProfile {
  id: string;
  name: string;
  email: string | null;
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('Frontend: Fetching student profile...')
        
        // Get logged-in email from localStorage (set during login)
        const loggedInEmail = localStorage.getItem('userEmail')
        console.log('Frontend: Logged in email from localStorage:', loggedInEmail)
        
        const response = await fetch('/api/student/profile', {
          headers: {
            'x-user-email': loggedInEmail || ''
          }
        })
        const data = await response.json()
        console.log('Frontend: Student profile response:', data)
        if (data.success && data.student) {
          console.log('Frontend: Setting student profile to:', data.student)
          setStudentProfile(data.student)
          console.log('Frontend: Student profile state updated')
        } else {
          console.log('Frontend: No student data received')
        }
      } catch (error) {
        console.error('Frontend: Error fetching student profile:', error)
      }
    }
    fetchProfile()
  }, [])
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/student" className="text-xl font-bold">
                Learning Portal
              </Link>
              <nav className="flex space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/student" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/student/articles" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Articles
                  </Link>
                </Button>

              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {studentProfile?.name || 'Loading...'}
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/login" className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow bg-gray-50">{children}</main>
    </div>
  )
}

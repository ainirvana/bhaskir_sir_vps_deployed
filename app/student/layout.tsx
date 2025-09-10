'use client';

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileText, Home, LogOut } from 'lucide-react'
import { SimpleStudentProtectedRoute } from '@/components/auth/simple-protected-route'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SimpleStudentProtectedRoute>
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
                  Welcome, {user?.full_name || 'Student'}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-grow bg-gray-50">{children}</main>
      </div>
    </SimpleStudentProtectedRoute>
  )
}

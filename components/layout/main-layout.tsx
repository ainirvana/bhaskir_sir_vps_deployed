"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut, BookOpen, BarChart3, Presentation, UserPlus } from "lucide-react"
import Link from "next/link"
import GlobalSearch from "@/components/layout/global-search"
import { NotificationBell, NotificationProvider } from "@/components/notifications/notification-system"
import { UserOnboarding } from "@/components/onboarding/user-onboarding"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, signOut } = useAuth()

  if (!user || !userProfile) {
    return <div>Loading...</div>
  }

  const isAdmin = userProfile.role === "admin"

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/">
                  <h1 className="text-xl font-semibold text-gray-900 cursor-pointer">EduPlatform</h1>
                </Link>
                <span className="ml-4 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{userProfile.role}</span>
              </div>

              {/* Global Search */}
              <div className="flex-1 max-w-md mx-8" data-search-trigger>
                <GlobalSearch />
              </div>

              <nav className="flex items-center space-x-4">
                {isAdmin && (
                  <>
                    <Link href="/admin/dashboard" data-dashboard-link>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/admin/slides">
                      <Button variant="ghost" size="sm">
                        <Presentation className="w-4 h-4 mr-2" />
                        Slides
                      </Button>
                    </Link>
                    <Link href="/admin/content" data-content-link>
                      <Button variant="ghost" size="sm">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Content
                      </Button>
                    </Link>
                    <Link href="/admin/students" data-students-link>
                      <Button variant="ghost" size="sm">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Students
                      </Button>
                    </Link>
                  </>
                )}

                {userProfile.role === "student" && (
                  <>
                    <Link href="/articles" data-articles-link>
                      <Button variant="ghost" size="sm">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Articles
                      </Button>
                    </Link>
                    <Link href="/quizzes" data-quizzes-link>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Quizzes
                      </Button>
                    </Link>
                  </>
                )}

                {/* Notification Bell */}
                <NotificationBell />

                <span className="text-sm text-gray-600">Welcome, {userProfile.full_name}</span>
                <Button onClick={signOut} variant="ghost" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        
        {/* User Onboarding */}
        <UserOnboarding />
      </div>
    </NotificationProvider>
  )
}

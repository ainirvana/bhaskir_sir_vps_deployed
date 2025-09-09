"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StudentRegistration from "./student-registration"
import AdminRegistration from "./admin-registration"

interface LoginFormProps {
  redirectTo?: string
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showStudentRegistration, setShowStudentRegistration] = useState(false)
  const [showAdminRegistration, setShowAdminRegistration] = useState(false)
  const [hasAdmins, setHasAdmins] = useState(true)
  const { signIn, user, userProfile } = useAuth()
  const router = useRouter()
  const redirectedRef = useRef(false)

  useEffect(() => {
    checkForAdmins()
  }, [])

  // Handle authentication success - use a ref to prevent multiple redirects
  useEffect(() => {
    if (user && userProfile && !redirectedRef.current) {
      console.log("Authentication successful, performing redirect...")
      redirectedRef.current = true
      
      // Use a more aggressive redirect approach
      const performRedirect = () => {
        let targetUrl = '/'
        
        if (redirectTo) {
          targetUrl = redirectTo
        } else if (userProfile.role === 'admin') {
          targetUrl = '/admin/dashboard'
        } else if (userProfile.role === 'student') {
          targetUrl = '/student/dashboard'
        }
        
        console.log("Redirecting to:", targetUrl)
        
        // Force immediate navigation using multiple methods
        try {
          // Method 1: Next.js router
          router.replace(targetUrl)
          
          // Method 2: Backup with window.location after a tiny delay
          setTimeout(() => {
            if (window.location.pathname === '/auth/login') {
              console.log("Router redirect failed, using window.location")
              window.location.replace(targetUrl)
            }
          }, 50)
        } catch (error) {
          console.error("Redirect error:", error)
          // Fallback to window.location
          window.location.replace(targetUrl)
        }
      }
      
      // Execute redirect immediately
      performRedirect()
    }
  }, [user, userProfile, redirectTo, router])

  const checkForAdmins = async () => {
    try {
      const { data, error } = await supabase.from("users").select("id").in("role", ["admin", "professor"]).limit(1)

      if (error) {
        console.error("Error checking for admins:", error)
        return
      }

      setHasAdmins(data && data.length > 0)
    } catch (error) {
      console.error("Error checking for admins:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (redirectedRef.current) return // Prevent multiple submissions
    
    setLoading(true)
    setError("")

    try {
      await signIn(email, password)
      // Don't set loading to false here - let the redirect handle it
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    if (redirectedRef.current) return // Prevent multiple submissions
    
    setLoading(true)
    setError("")

    try {
      await signIn(demoEmail, demoPassword)
      // Don't set loading to false here - let the redirect handle it
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Show loading state during redirect
  if (user && userProfile && redirectedRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Redirecting to dashboard...</p>
            <p className="text-sm text-gray-600 mt-2">Please wait while we redirect you.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showStudentRegistration) {
    return <StudentRegistration onBack={() => setShowStudentRegistration(false)} />
  }

  if (showAdminRegistration) {
    return <AdminRegistration onBack={() => setShowAdminRegistration(false)} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">EduPlatform</CardTitle>
          <p className="text-center text-sm text-gray-600">Current Affairs Learning Platform</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="demo">Demo</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <div className="text-red-600 text-sm">{error}</div>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="demo" className="space-y-4">
              <p className="text-sm text-gray-600 text-center">Quick login with demo accounts</p>

              <Button
                onClick={() => handleDemoLogin("admin@eduplatform.com", "admin123")}
                className="w-full"
                disabled={loading}
              >
                Login as Admin
              </Button>

              <Button
                onClick={() => handleDemoLogin("student@eduplatform.com", "student123")}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                Login as Student
              </Button>

              {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="space-y-4">
                {/* Student Registration */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Student Registration</h3>
                  <p className="text-sm text-gray-600 mb-3">Students need an invitation code to register</p>
                  <Button onClick={() => setShowStudentRegistration(true)} className="w-full" variant="outline">
                    Register as Student
                  </Button>
                </div>

                {/* Admin Registration */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Admin Registration</h3>
                  {!hasAdmins ? (
                    <div>
                      <p className="text-sm text-green-600 mb-3">
                        No administrators found. Create the first admin account.
                      </p>
                      <Button onClick={() => setShowAdminRegistration(true)} className="w-full">
                        Create First Admin
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Register as administrator (teacher)</p>
                      <Button onClick={() => setShowAdminRegistration(true)} className="w-full" variant="outline">
                        Register as Admin
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

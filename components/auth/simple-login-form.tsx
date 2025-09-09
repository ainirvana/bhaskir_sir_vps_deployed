"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EnhancedStudentRegistration from "./enhanced-student-registration"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function SimpleLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showStudentRegistration, setShowStudentRegistration] = useState(false)
  const [hasAdmin, setHasAdmin] = useState(true)
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [adminName, setAdminName] = useState("")
  const { signIn } = useAuth()

  useEffect(() => {
    checkForAdmin()
  }, [])

  const checkForAdmin = async () => {
    try {
      const { data, error } = await supabase.from("users").select("id").eq("role", "admin").limit(1)

      if (error) {
        console.error("Error checking for admin:", error)
        return
      }

      setHasAdmin(data && data.length > 0)
    } catch (error) {
      console.error("Error checking for admin:", error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingAdmin(true)
    setError("")

    try {
      // Create Firebase user
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)

      // Create admin profile in Supabase
      const { error: profileError } = await supabase.from("users").insert([
        {
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email!,
          full_name: adminName,
          role: "admin",
          student_id: null,
        },
      ])

      if (profileError) {
        throw profileError
      }

      // Admin will be automatically logged in
    } catch (err: any) {
      setError(err.message)
      setCreatingAdmin(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError("")

    try {
      await signIn("admin@eduplatform.com", "admin123")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (showStudentRegistration) {
    return <EnhancedStudentRegistration onBack={() => setShowStudentRegistration(false)} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">EduPlatform</CardTitle>
          <p className="text-center text-sm text-gray-600">Current Affairs Learning Platform</p>
        </CardHeader>
        <CardContent>
          {!hasAdmin ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-green-600">Setup Required</h3>
                <p className="text-sm text-gray-600">Create the first admin account to get started</p>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input
                    id="adminName"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    required
                  />
                </div>

                {error && <div className="text-red-600 text-sm">{error}</div>}

                <Button type="submit" className="w-full" disabled={creatingAdmin}>
                  {creatingAdmin ? "Creating Admin..." : "Create Admin Account"}
                </Button>
              </form>
            </div>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Student Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
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

                <div className="mt-4 pt-4 border-t">
                  <Button onClick={handleDemoLogin} variant="outline" className="w-full" disabled={loading}>
                    Demo Admin Login
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">Students need a 6-digit invite code to register</p>
                  <Button onClick={() => setShowStudentRegistration(true)} className="w-full">
                    Register as Student
                  </Button>
                  <p className="text-xs text-gray-500">Don't have an invite code? Contact your admin to get one.</p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

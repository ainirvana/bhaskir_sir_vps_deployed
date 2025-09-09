"use client"

import type React from "react"
import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SimpleLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true)
    setError("")

    try {
      console.log("🔐 Starting login for:", loginEmail)
      
      // Step 1: Authenticate with Firebase
      console.log("Step 1: Authenticating with Firebase...")
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword)
      console.log("✅ Firebase auth successful:", userCredential.user.uid)
      
      // Step 2: Get user profile from Supabase
      console.log("Step 2: Fetching user profile from Supabase...")
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', userCredential.user.uid)
        .single()
      
      console.log("Profile lookup result:", { profile, profileError })
      
      if (profileError || !profile) {
        console.log("❌ Profile not found by firebase_uid, checking by email...")
        const { data: emailProfile, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', loginEmail)
          .single()
        
        console.log("Email profile lookup result:", { emailProfile, emailError })
        
        if (emailError || !emailProfile) {
          console.error("❌ User profile not found in database")
          throw new Error("User profile not found. Please contact administrator.")
        }
        
        console.log("✅ Profile found by email:", emailProfile.role)
        
        // Step 3: Redirect based on role
        console.log("Step 3: Redirecting based on role...")
        if (emailProfile.role === 'admin') {
          console.log("🚀 Redirecting admin to dashboard...")
          console.log("Current location:", window.location.href)
          
          // Try multiple redirect methods
          console.log("Attempting window.location.replace...")
          window.location.replace('/admin/dashboard')
          
          // Backup method
          setTimeout(() => {
            console.log("Backup redirect attempt...")
            window.location.href = '/admin/dashboard'
          }, 1000)
          
        } else if (emailProfile.role === 'student') {
          console.log("🚀 Redirecting student to dashboard...")
          window.location.replace('/student/dashboard')
        } else {
          console.log("❌ Unknown role:", emailProfile.role)
          throw new Error("Invalid user role")
        }
      } else {
        console.log("✅ Profile found by firebase_uid:", profile.role)
        
        // Step 3: Redirect based on role
        console.log("Step 3: Redirecting based on role...")
        if (profile.role === 'admin') {
          console.log("🚀 Redirecting admin to dashboard...")
          console.log("Current location:", window.location.href)
          
          // Try multiple redirect methods
          console.log("Attempting window.location.replace...")
          window.location.replace('/admin/dashboard')
          
          // Backup method
          setTimeout(() => {
            console.log("Backup redirect attempt...")
            window.location.href = '/admin/dashboard'
          }, 1000)
          
        } else if (profile.role === 'student') {
          console.log("🚀 Redirecting student to dashboard...")
          window.location.replace('/student/dashboard')
        } else {
          console.log("❌ Unknown role:", profile.role)
          throw new Error("Invalid user role")
        }
      }
      
    } catch (err: any) {
      console.error("❌ Login error:", err)
      setError(err.message || "Login failed")
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleLogin(email, password)
  }

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    await handleLogin(demoEmail, demoPassword)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Authenticating...</p>
            <p className="text-sm text-gray-600 mt-2">Please wait while we sign you in.</p>
          </CardContent>
        </Card>
      </div>
    )
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="demo">Demo</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
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
                Login as Admin (Teacher)
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

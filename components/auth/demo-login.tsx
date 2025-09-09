"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

interface DemoLoginProps {
  onLogin: (userProfile: any) => void
}

export default function DemoLogin({ onLogin }: DemoLoginProps) {
  const [loading, setLoading] = useState(false)

  const handleDemoLogin = async (role: string) => {
    setLoading(true)
    try {
      let email = ""
      switch (role) {
        case "admin":
          email = "admin@eduplatform.com"
          break
        case "professor":
          email = "professor@eduplatform.com"
          break
        case "student":
          email = "student@eduplatform.com"
          break
      }

      // Fetch user profile from database
      const { data: profile } = await supabase.from("users").select("*").eq("email", email).single()

      if (profile) {
        onLogin(profile)
      } else {
        alert("Demo user not found. Please seed the database first.")
      }
    } catch (error) {
      console.error("Demo login error:", error)
      alert("Error during demo login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Demo Login - EduPlatform</CardTitle>
          <p className="text-center text-sm text-gray-600">Choose a demo user to explore the platform</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => handleDemoLogin("admin")} className="w-full" disabled={loading}>
            Login as Admin
          </Button>

          <Button onClick={() => handleDemoLogin("professor")} variant="outline" className="w-full" disabled={loading}>
            Login as Professor
          </Button>

          <Button onClick={() => handleDemoLogin("student")} variant="outline" className="w-full" disabled={loading}>
            Login as Student
          </Button>

          <div className="text-xs text-gray-500 text-center mt-4">
            This is a demo environment. No real authentication required.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

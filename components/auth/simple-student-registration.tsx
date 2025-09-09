"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

interface SimpleStudentRegistrationProps {
  onBack: () => void
}

export default function SimpleStudentRegistration({ onBack }: SimpleStudentRegistrationProps) {
  const [email, setEmail] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(1) // 1: Enter email & code, 2: Set password
  const [invitation, setInvitation] = useState<any>(null)
  const { signUpStudent, checkInviteCode } = useAuth()

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const invitationData = await checkInviteCode(email, inviteCode)
      setInvitation(invitationData)
      setStep(2)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    setError("")

    try {
      await signUpStudent(email, password, inviteCode)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle>Student Registration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <Label htmlFor="inviteCode">6-Digit Invite Code</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg font-mono"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code provided by your admin</p>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <Button type="submit" className="w-full" disabled={loading || inviteCode.length !== 6}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Welcome, {invitation.full_name}!</strong>
                </p>
                <p className="text-sm text-green-600">Student ID: {invitation.student_id}</p>
                <p className="text-sm text-green-600">Email: {email}</p>
              </div>

              <div>
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

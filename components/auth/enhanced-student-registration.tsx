"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface EnhancedStudentRegistrationProps {
  onBack: () => void
}

export default function EnhancedStudentRegistration({ onBack }: EnhancedStudentRegistrationProps) {
  const [email, setEmail] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(1) // 1: Enter email & code, 2: Set password
  const [invitation, setInvitation] = useState<any>(null)
  const { signUpWithInvitation, checkInvitation } = useAuth()

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log("Verifying invitation code:", { email, inviteCode })
      const invitationData = await checkInvitation(inviteCode)

      // Check if email matches
      if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
        throw new Error("Email does not match the invitation. Please check your email address.")
      }

      console.log("Invitation verified successfully")
      setInvitation(invitationData)
      setStep(2)
    } catch (err: any) {
      console.error("Error verifying invitation:", err)
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
      console.log("Creating account for:", email)
      await signUpWithInvitation(email, password, inviteCode)
      console.log("Account created successfully")
    } catch (err: any) {
      console.error("Error creating account:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatInviteCode = (value: string) => {
    // Remove any non-digits and limit to 6 characters
    const digits = value.replace(/\D/g, "").slice(0, 6)
    return digits
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
          <div className="flex items-center space-x-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? "bg-blue-500" : "bg-gray-300"}`} />
            <div className="flex-1 h-1 bg-gray-300 rounded">
              <div
                className={`h-full bg-blue-500 rounded transition-all duration-300 ${step >= 2 ? "w-full" : "w-0"}`}
              />
            </div>
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? "bg-blue-500" : "bg-gray-300"}`} />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Step {step} of 2: {step === 1 ? "Verify Invitation" : "Create Password"}
          </p>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Enter your email address and the 6-digit invite code provided by your admin.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Use the exact email address your admin provided</p>
              </div>

              <div>
                <Label htmlFor="inviteCode">6-Digit Invite Code</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(formatInviteCode(e.target.value))}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-wider"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code provided by your admin</p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading || inviteCode.length !== 6 || !email.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Invitation"
                )}
              </Button>

              <div className="text-center text-sm text-gray-600">
                <p>Don't have an invite code?</p>
                <p>Contact your admin to get one.</p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Invitation verified!</strong> Now create your password.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Welcome, {invitation.full_name}!</strong>
                </p>
                <p className="text-sm text-gray-600">Student ID: {invitation.student_id}</p>
                <p className="text-sm text-gray-600">Email: {email}</p>
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
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
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
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <p>
                  <strong>Next steps after registration:</strong>
                </p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>You'll be automatically logged in</li>
                  <li>Access study materials and slides</li>
                  <li>Take practice quizzes</li>
                  <li>Track your progress</li>
                </ol>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

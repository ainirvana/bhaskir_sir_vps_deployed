'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

interface StudentRegistrationProps {
  token?: string
  fullName?: string
  email?: string
}

export function StudentRegistration({ token, fullName, email }: StudentRegistrationProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token || !email || !fullName) {
      toast({
        title: 'Invalid registration link',
        description: 'This registration link is invalid or expired.',
        variant: 'destructive'
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are identical.',
        variant: 'destructive'
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          fullName,
          password
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Account created successfully!',
          description: 'You can now log in with your credentials.',
        })
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      } else {
        toast({
          title: 'Registration failed',
          description: data.error || 'Failed to create account.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: 'Network error. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email || !fullName) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Invalid registration link</p>
            <p className="text-sm mt-2">Please contact your administrator for a new registration link.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>Welcome! Set up your password to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-blue-900">Name:</span>
                <span className="text-sm text-blue-800 ml-2">{fullName}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-blue-900">Email:</span>
                <span className="text-sm text-blue-800 ml-2">{email}</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Enter your password"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must be at least 6 characters long
            </p>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Confirm your password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
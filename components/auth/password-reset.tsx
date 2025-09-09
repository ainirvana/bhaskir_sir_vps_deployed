'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface PasswordResetProps {
  token?: string
  email?: string
}

export function PasswordReset({ token, email }: PasswordResetProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !email) {
      toast({
        title: 'Invalid reset link',
        description: 'This password reset link is invalid or expired.',
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
      // Verify reset token
      const { data: invitation, error: tokenError } = await supabase
        .from('student_invitations')
        .select('*')
        .eq('invite_code', token)
        .eq('email', email)
        .eq('is_password_reset', true)
        .single()

      if (tokenError || !invitation) {
        throw new Error('Invalid or expired reset token')
      }

      // Find the user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('role', 'student')
        .single()

      if (userError || !user) {
        throw new Error('User not found')
      }

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password: password,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)

      if (updateError) {
        throw updateError
      }

      // Mark reset token as used
      await supabase
        .from('student_invitations')
        .update({ 
          is_registered: true,
          updated_at: new Date().toISOString()
        })
        .eq('invite_code', token)

      toast({
        title: 'Password reset successful',
        description: 'Your password has been updated. You can now log in.',
      })

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)

    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: error.message || 'Failed to reset password. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Invalid password reset link</p>
            <p className="text-sm mt-2">Please contact your administrator for a new reset link.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your new password for {email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Confirm new password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
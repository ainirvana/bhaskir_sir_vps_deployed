'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

export function SimpleDbLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('userEmail', data.user.email) // Store email for student profile mapping
        console.log('Stored user email in localStorage:', data.user.email)
        toast({
          title: 'Login successful',
          description: 'Welcome back!'
        })
        
        // Enhanced redirection logic with retry mechanism
        const redirect = async (attempts = 0) => {
          try {
            // Verify auth state
            const authCheck = await fetch('/api/auth/check')
            const authState = await authCheck.json()
            
            if (!authState.authenticated && attempts < 3) {
              // Retry after delay with exponential backoff
              setTimeout(() => redirect(attempts + 1), Math.pow(2, attempts) * 1000)
              return
            }
            
            if (data.user.role === 'admin') {
              window.location.replace('/admin/dashboard')
            } else {
              window.location.replace('/student/dashboard')
            }
          } catch (err) {
            console.error('Auth check failed:', err)
            if (attempts < 3) {
              setTimeout(() => redirect(attempts + 1), Math.pow(2, attempts) * 1000)
            } else {
              // Final fallback
              window.location.replace(data.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard')
            }
          }
        }
        
        // Start redirection process with initial delay
        setTimeout(() => redirect(), 1000)
      } else {
        toast({
          title: 'Login failed',
          description: data.error || 'Invalid credentials',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Login failed',
        description: 'Network error. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
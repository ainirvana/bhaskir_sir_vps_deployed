'use client'

import { useState, useEffect } from 'react'
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

  // Pre-fill demo credentials
  useEffect(() => {
    setEmail('admin@eduplatform.com')
    setPassword('admin123')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Attempting login with:', { email, password: '***' })
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })

      const data = await response.json()
      console.log('Login response:', { status: response.status, data })

      if (response.ok && data.success) {
        // Store user data
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('userEmail', data.user.email)
        localStorage.setItem('userRole', data.user.role)
        
        console.log('Auth state changed: User logged in')
        console.log('Stored user email in localStorage:', data.user.email)
        
        toast({
          title: 'Login successful',
          description: `Welcome back, ${data.user.full_name || data.user.email}!`
        })
        
        // Force a small delay to ensure cookies are set
        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = '/admin/dashboard'
          } else {
            window.location.href = '/student/dashboard'
          }
        }, 500)
        
      } else {
        console.log('Auth state changed: No user')
        toast({
          title: 'Login failed',
          description: data.error || 'Invalid credentials',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      console.log('Auth state changed: No user')
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
        <CardTitle>Admin Login</CardTitle>
        <CardDescription>Enter your admin credentials to access the dashboard</CardDescription>
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
              placeholder="admin@eduplatform.com"
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
              placeholder="admin123"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          
          <div className="text-center text-sm text-gray-600 mt-4">
            <p>Demo Credentials:</p>
            <p><strong>Email:</strong> admin@eduplatform.com</p>
            <p><strong>Password:</strong> admin123</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
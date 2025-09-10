"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'student' | 'professor';
  requiredRoles?: Array<'admin' | 'student' | 'professor'>;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If no user, redirect to login
    if (!user) {
      router.push(redirectTo);
      return;
    }

    // If user exists but no profile yet, wait
    if (user && !userProfile) {
      return;
    }

    // Check role requirements
    if (userProfile) {
      const allowedRoles = requiredRoles || (requiredRole ? [requiredRole] : []);
      
      if (allowedRoles.length > 0 && !allowedRoles.includes(userProfile.role)) {
        // Redirect based on user's actual role
        if (userProfile.role === 'admin' || userProfile.role === 'professor') {
          router.push('/admin/dashboard');
        } else if (userProfile.role === 'student') {
          router.push('/student/dashboard');
        } else {
          router.push('/auth/login');
        }
        return;
      }
    }
  }, [user, userProfile, loading, requiredRole, requiredRoles, redirectTo, router]);

  // Show loading while checking authentication
  if (loading || (user && !userProfile)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no user, don't render anything (redirect will happen)
  if (!user) {
    return null;
  }

  // If user doesn't have required role, don't render anything (redirect will happen)
  if (userProfile) {
    const allowedRoles = requiredRoles || (requiredRole ? [requiredRole] : []);
    if (allowedRoles.length > 0 && !allowedRoles.includes(userProfile.role)) {
      return null;
    }
  }

  return <>{children}</>;
}

// Convenience components for specific roles
export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'professor']}>
      {children}
    </ProtectedRoute>
  );
}

export function StudentProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="student">
      {children}
    </ProtectedRoute>
  );
}
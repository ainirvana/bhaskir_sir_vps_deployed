"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface SimpleProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'student' | 'professor';
}

export function SimpleProtectedRoute({ children, requiredRole }: SimpleProtectedRouteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('user');
      
      if (!userData) {
        router.push('/auth/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      if (requiredRole && parsedUser.role !== requiredRole) {
        if (parsedUser.role === 'admin' || parsedUser.role === 'professor') {
          router.push('/admin/dashboard');
        } else {
          router.push('/student/dashboard');
        }
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [requiredRole, router]);

  if (loading) {
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

  return <>{children}</>;
}

export function SimpleAdminProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <SimpleProtectedRoute requiredRole="admin">
      {children}
    </SimpleProtectedRoute>
  );
}

export function SimpleStudentProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <SimpleProtectedRoute requiredRole="student">
      {children}
    </SimpleProtectedRoute>
  );
}
"use client";

import { ReactNode } from 'react';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'student';
  requiredRoles?: Array<'admin' | 'student'>;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
}

export function RoleGuard({
  children,
  requiredRole,
  requiredRoles,
  fallback,
  showAccessDenied = true
}: RoleGuardProps) {
  const { loading, hasAccess, userProfile } = useRoleGuard({
    requiredRole,
    requiredRoles,
    allowUnauthenticated: false
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showAccessDenied) {
      return (
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="text-center py-8">
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-muted-foreground">
              Required role: {requiredRole || requiredRoles?.join(', ') || 'Authenticated user'}
              <br />
              Your role: {userProfile?.role || 'Not authenticated'}
            </p>
          </CardContent>
        </Card>
      );
    }

    return null;
  }

  return <>{children}</>;
}

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback }: AdminOnlyProps) {
  return (
    <RoleGuard requiredRole="admin" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

interface StudentOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function StudentOnly({ children, fallback }: StudentOnlyProps) {
  return (
    <RoleGuard requiredRole="student" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

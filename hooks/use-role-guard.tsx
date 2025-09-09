"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface UseRoleGuardOptions {
  requiredRole?: 'admin' | 'student';
  requiredRoles?: Array<'admin' | 'student'>;
  redirectTo?: string;
  allowUnauthenticated?: boolean;
}

export function useRoleGuard({
  requiredRole,
  requiredRoles,
  redirectTo = '/auth/login',
  allowUnauthenticated = false
}: UseRoleGuardOptions = {}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("Role guard check:", { loading, user: !!user, userProfile: !!userProfile, role: userProfile?.role, requiredRole, allowUnauthenticated })
    
    if (loading) return;

    // If we have a user but no profile yet, wait for profile to load
    if (user && !userProfile) {
      console.log("Role guard: User exists but profile still loading, waiting...")
      return;
    }

    // Check authentication
    if (!user && !allowUnauthenticated) {
      console.log("Role guard: No user found, redirecting to login")
      // Add a small delay to prevent redirect loops
      setTimeout(() => {
        router.push(redirectTo);
      }, 100);
      return;
    }

    // Check role requirements
    if (user && userProfile) {
      const allowedRoles = requiredRoles || (requiredRole ? [requiredRole] : []);
      
      if (allowedRoles.length > 0 && !allowedRoles.includes(userProfile.role)) {
        console.log("Role guard: User role not allowed, redirecting based on role")
        // Redirect based on user role
        if (userProfile.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/student/dashboard');
        }
        return;
      }
      
      console.log("Role guard: Access granted")
    }
  }, [user, userProfile, loading, requiredRole, requiredRoles, redirectTo, allowUnauthenticated, router]);

  return {
    user,
    userProfile,
    loading,
    isAdmin: userProfile?.role === 'admin',
    isStudent: userProfile?.role === 'student',
    hasAccess: loading ? false : (
      allowUnauthenticated || 
      (user && userProfile && (
        !requiredRole && !requiredRoles?.length ||
        requiredRole && userProfile.role === requiredRole ||
        requiredRoles && requiredRoles.includes(userProfile.role)
      ))
    )
  };
}

export function useAdminOnly() {
  return useRoleGuard({ requiredRole: 'admin' });
}

export function useStudentOnly() {
  return useRoleGuard({ requiredRole: 'student' });
}

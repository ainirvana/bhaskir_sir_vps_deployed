import { cookies } from 'next/headers';
import { createServerClient } from './supabase-server';
import type { User } from '@/types/user';

export async function getAuthSession() {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const userRole = cookieStore.get('user-role')?.value;
  const userEmail = cookieStore.get('user-email')?.value;

  if (!authToken || !userRole || !userEmail) {
    return null;
  }

  try {
    const supabase = createServerClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (error || !user) {
      return null;
    }

    // Validate session
    const isValidSession = await validateSession(authToken, user);
    if (!isValidSession) {
      return null;
    }

    return {
      user,
      token: authToken,
      role: userRole
    };
  } catch (error) {
    console.error('Auth session error:', error);
    return null;
  }
}

async function validateSession(token: string, user: User): Promise<boolean> {
  // Add additional session validation logic here
  // For example, check token expiry, validate against a sessions table, etc.
  return true;
}
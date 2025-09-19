import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getAuthSession } from '@/lib/auth-session';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();

    // No session found
    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        error: 'No valid session found'
      }, { status: 401 });
    }

    // Verify user still exists and is active
    const supabase = createServerClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ 
        authenticated: false,
        error: 'User not found'
      }, { status: 401 });
    }

    // Session is valid
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
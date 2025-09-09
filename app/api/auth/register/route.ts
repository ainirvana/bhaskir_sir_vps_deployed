import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, email, fullName, password } = body

    // Validate required fields
    if (!token || !email || !fullName || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify invitation token
    const { data: invitation, error: tokenError } = await supabase
      .from('student_invitations')
      .select('*')
      .eq('invite_code', token)
      .eq('email', email)
      .eq('is_registered', false)
      .eq('is_password_reset', false) // Only signup tokens, not reset tokens
      .single()

    if (tokenError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired registration token' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create user account
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        firebase_uid: email, // Use email as firebase_uid for simplicity
        email: email.toLowerCase().trim(),
        full_name: fullName.trim(),
        role: 'student',
        password: password, // In production, hash this password
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Mark invitation as used
    const { error: updateError } = await supabase
      .from('student_invitations')
      .update({ 
        is_registered: true,
        updated_at: new Date().toISOString()
      })
      .eq('invite_code', token)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      // Don't fail the registration if this fails
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
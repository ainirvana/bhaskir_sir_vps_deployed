import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userRole = cookieStore.get('user-role')?.value

    // Check if user is admin
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const roleFilter = searchParams.get('role') || ''

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        created_at,
        last_login,
        is_active
      `)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (roleFilter) {
      query = query.eq('role', roleFilter)
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Get paginated results
    const { data: users, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userRole = cookieStore.get('user-role')?.value

    // Check if user is admin
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, updates } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Update user
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      user: data[0],
      message: 'User updated successfully' 
    })

  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userRole = cookieStore.get('user-role')?.value

    // Check if user is admin
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Soft delete by deactivating user
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deactivated successfully' 
    })

  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate user' },
      { status: 500 }
    )
  }
}

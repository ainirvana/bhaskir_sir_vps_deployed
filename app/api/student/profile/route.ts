import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    
    // Get logged-in email from request headers (set by frontend)
    const loggedInEmail = request.headers.get('x-user-email')
    console.log('Getting student profile for email:', loggedInEmail)
    
    // Get all students from student_invitations
    const { data: allStudents } = await supabase
      .from('student_invitations')
      .select('*')
    
    console.log('All students in database:', allStudents)
    
    let targetStudent = null
    
    // If we have logged-in email, find matching student
    if (loggedInEmail) {
      targetStudent = allStudents?.find(s => s.email === loggedInEmail)
      console.log('Found student by email match:', targetStudent)
    }
    
    // If no match found, use first student as fallback
    if (!targetStudent && allStudents && allStudents.length > 0) {
      targetStudent = allStudents[0]
      console.log('Using first student as fallback:', targetStudent)
    }
    
    if (targetStudent) {
      console.log('Returning student data:', {
        id: targetStudent.student_id,
        name: targetStudent.full_name,
        email: targetStudent.email
      })
      
      return NextResponse.json({ 
        success: true, 
        student: {
          id: targetStudent.student_id,
          name: targetStudent.full_name,
          email: targetStudent.email
        }
      })
    }

    console.log('No students found, returning default')
    return NextResponse.json({ 
      success: true, 
      student: { id: 'student_1', name: 'Student', email: loggedInEmail }
    })

  } catch (error) {
    console.error('Student profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch student profile' }, { status: 500 })
  }
}
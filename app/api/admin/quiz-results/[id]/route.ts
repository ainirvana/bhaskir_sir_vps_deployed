import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getServerSupabase()
    
    const { data: submissions, error } = await supabase
      .from('quiz_submissions')
      .select('student_id, score, percentage, submitted_at')
      .eq('quiz_id', id)
      .order('submitted_at', { ascending: false })
    
    // Get student names from student_invitations table (where admin adds students)
    const { data: studentInvitations } = await supabase
      .from('student_invitations')
      .select('student_id, full_name, email')
    
    // Also check users table for registered students
    const { data: registeredStudents } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'student')
    
    const formattedSubmissions = submissions?.map(sub => {
      // First try to find in student_invitations (admin-added data)
      let student = studentInvitations?.find(s => s.student_id === sub.student_id)
      
      // If not found, try registered users
      if (!student) {
        const registeredStudent = registeredStudents?.find(s => s.id === sub.student_id)
        if (registeredStudent) {
          student = {
            student_id: registeredStudent.id,
            full_name: registeredStudent.full_name,
            email: registeredStudent.email
          }
        }
      }
      
      return {
        ...sub,
        student_name: student?.full_name || `Student ${sub.student_id.split('_')[1] || '1'}`,
        student_email: student?.email || ''
      }
    }) || []

    if (error) throw error

    return NextResponse.json({ success: true, submissions: formattedSubmissions })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
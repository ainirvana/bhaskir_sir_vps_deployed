import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { quiz_id, answers, score, total_questions, percentage } = await request.json()
    const supabase = getServerSupabase()
    
    // Get logged-in email from request headers
    const loggedInEmail = request.headers.get('x-user-email')
    console.log('Quiz submission for email:', loggedInEmail)
    
    // Get student info from email
    const { data: studentInfo } = await supabase
      .from('student_invitations')
      .select('student_id, full_name')
      .eq('email', loggedInEmail)
      .single()
    
    const studentId = studentInfo?.student_id || 'student_1'
    console.log('Using student ID for submission:', studentId, 'Name:', studentInfo?.full_name)
    
    const { data, error } = await supabase
      .from('quiz_submissions')
      .insert({
        quiz_id,
        student_id: studentId,
        answers,
        score,
        total_questions,
        percentage,
        submitted_at: new Date().toISOString()
      })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, submission: data[0] })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 })
  }
}
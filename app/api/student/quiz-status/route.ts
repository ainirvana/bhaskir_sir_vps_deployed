import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const studentEmail = 'niket@example.com' // This would come from auth session in real app
    
    // Get student info from email
    const { data: studentInfo } = await supabase
      .from('student_invitations')
      .select('student_id, full_name')
      .eq('email', studentEmail)
      .single()
    
    const studentId = studentInfo?.student_id || 'student_1'
    
    const { data: allQuizzes } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    
    const { data: submissions } = await supabase
      .from('quiz_submissions')
      .select('quiz_id, percentage, submitted_at')
      .eq('student_id', studentId)
    
    const quizzes = allQuizzes?.map(quiz => {
      const submission = submissions?.find(s => s.quiz_id === quiz.id)
      const questionsCount = quiz.questions_count || quiz.quiz_data?.questions?.length || 0
      
      if (submission) {
        return {
          ...quiz,
          questions_count: questionsCount,
          status: 'submitted',
          score: submission.percentage,
          submitted_at: submission.submitted_at
        }
      } else if (quiz.is_expired) {
        return {
          ...quiz,
          questions_count: questionsCount,
          status: 'missed',
          expires_at: quiz.published_at
        }
      } else {
        return {
          ...quiz,
          questions_count: questionsCount,
          status: 'active'
        }
      }
    }) || []

    return NextResponse.json({ success: true, quizzes })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quiz status' }, { status: 500 })
  }
}
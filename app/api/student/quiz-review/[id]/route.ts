import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServerSupabase()
    const studentId = 'student_1'
    
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', params.id)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const { data: submission } = await supabase
      .from('quiz_submissions')
      .select('answers, score, percentage, submitted_at')
      .eq('quiz_id', params.id)
      .eq('student_id', studentId)
      .single()

    return NextResponse.json({
      success: true,
      quiz,
      submission
    })

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quiz review' }, { status: 500 })
  }
}
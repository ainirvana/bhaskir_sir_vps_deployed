import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServerSupabase()
    
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', params.id)
      .eq('is_published', true)
      .eq('is_expired', false)

      .single()

    if (error || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Check if student already submitted
    const { data: submission } = await supabase
      .from('quiz_submissions')
      .select('id')
      .eq('quiz_id', params.id)
      .eq('student_id', 'student_1')
      .single()

    return NextResponse.json({
      success: true,
      quiz,
      alreadySubmitted: !!submission
    })

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 })
  }
}
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

    // Ensure quiz_data has proper structure with consistent correct answer mapping
    if (quiz.quiz_data && quiz.quiz_data.questions) {
      quiz.quiz_data.questions = quiz.quiz_data.questions.map((q: any, index: number) => {
        // Get correct answer index, ensuring it's a valid number
        let correctIndex = q.correctAnswerIndex;
        if (correctIndex === undefined || correctIndex === null) {
          correctIndex = q.correctAnswer;
        }
        
        // Convert string to number if needed
        if (typeof correctIndex === 'string') {
          correctIndex = parseInt(correctIndex, 10);
        }
        
        // Default to 0 if still invalid
        if (typeof correctIndex !== 'number' || isNaN(correctIndex)) {
          correctIndex = 0;
        }
        
        // Ensure options array exists and is valid
        const options = q.options || q.answers || [];
        
        return {
          ...q,
          id: q.id || `q_${index}`,
          options: options,
          answers: options, // Keep both for compatibility
          correctAnswerIndex: correctIndex,
          correctAnswer: correctIndex,
          point: q.point || 10
        };
      });
    }

    // Get student email from headers
    const studentEmail = request.headers.get('x-user-email')
    let studentId = 'student_1' // Default fallback
    
    if (studentEmail) {
      try {
        const { data: studentInfo, error: studentError } = await supabase
          .from('student_invitations')
          .select('student_id')
          .eq('email', studentEmail)
          .single()
        
        if (!studentError && studentInfo?.student_id) {
          studentId = studentInfo.student_id
        } else {
          console.log(`Student not found for email ${studentEmail}, using default ID`)
        }
      } catch (error) {
        console.error('Error fetching student info:', error)
      }
    }

    // Check if student already submitted
    const { data: submission } = await supabase
      .from('quiz_submissions')
      .select('id')
      .eq('quiz_id', params.id)
      .eq('student_id', studentId)
      .single()

    return NextResponse.json({
      success: true,
      quiz,
      alreadySubmitted: !!submission
    })

  } catch (error) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 })
  }
}
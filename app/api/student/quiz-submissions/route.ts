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
    let studentId = 'student_1' // Default fallback
    let studentName = 'Unknown Student'
    
    if (loggedInEmail) {
      try {
        const { data: studentInfo, error: studentError } = await supabase
          .from('student_invitations')
          .select('student_id, full_name')
          .eq('email', loggedInEmail)
          .single()
        
        if (!studentError && studentInfo) {
          studentId = studentInfo.student_id || studentId
          studentName = studentInfo.full_name || studentName
        }
      } catch (error) {
        console.error('Error fetching student info:', error)
      }
    }
    
    console.log('Using student ID for submission:', studentId, 'Name:', studentName)
    
    // Validate the submission data
    if (!quiz_id || !answers || score === undefined || total_questions === undefined) {
      return NextResponse.json({ error: 'Missing required submission data' }, { status: 400 })
    }
    
    // Ensure score and percentage are valid numbers
    const validScore = Math.max(0, Math.min(total_questions, score || 0))
    const validPercentage = total_questions > 0 ? Math.round((validScore / total_questions) * 100) : 0
    
    // Check if student already submitted this quiz
    const { data: existingSubmission } = await supabase
      .from('quiz_submissions')
      .select('id')
      .eq('quiz_id', quiz_id)
      .eq('student_id', studentId)
      .single()
    
    if (existingSubmission) {
      return NextResponse.json({ error: 'Quiz already submitted' }, { status: 409 })
    }
    
    const { data, error } = await supabase
      .from('quiz_submissions')
      .insert({
        quiz_id,
        student_id: studentId,
        answers,
        score: validScore,
        total_questions,
        percentage: validPercentage,
        submitted_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Database error during quiz submission:', error)
      throw error
    }

    console.log(`Quiz submitted successfully: ${validScore}/${total_questions} (${validPercentage}%)`)
    return NextResponse.json({ 
      success: true, 
      submission: data[0],
      calculatedScore: validScore,
      calculatedPercentage: validPercentage
    })
  } catch (error) {
    console.error('Error submitting quiz:', error)
    return NextResponse.json({ 
      error: 'Failed to submit quiz', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    
    console.log('Fetching quiz results...')
    
    // Get all quizzes (not just published ones for debugging)
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, quiz_data, is_published, created_at')
      .order('created_at', { ascending: false })
    
    console.log('Quizzes found:', quizzes?.length || 0)
    console.log('Published quizzes:', quizzes?.filter(q => q.is_published)?.length || 0)
    
    if (quizzesError) {
      console.error('Quizzes fetch error:', quizzesError)
      return NextResponse.json({ error: 'Failed to fetch quizzes', details: quizzesError }, { status: 500 })
    }
    
    // Get all submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('quiz_submissions')
      .select('quiz_id, score, percentage, student_id')
    
    console.log('Submissions found:', submissions?.length || 0)
    
    if (submissionsError) {
      console.error('Submissions fetch error:', submissionsError)
      // Return quizzes with 0 submissions if table doesn't exist
      const publishedQuizzes = quizzes?.filter(q => q.is_published) || []
      const formattedResults = publishedQuizzes.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        questions_count: quiz.quiz_data?.questions?.length || 0,
        total_submissions: 0,
        average_score: 0,
        created_at: quiz.created_at
      }))
      
      console.log('Returning results without submissions:', formattedResults.length)
      return NextResponse.json({ success: true, results: formattedResults })
    }

    // Filter only published quizzes
    const publishedQuizzes = quizzes?.filter(q => q.is_published) || []
    
    // Group submissions by quiz_id and calculate stats
    const formattedResults = publishedQuizzes.map(quiz => {
      const quizSubmissions = submissions?.filter(sub => sub.quiz_id === quiz.id) || []
      const questionsCount = quiz.quiz_data?.questions?.length || 0
      
      console.log(`Quiz ${quiz.title}: ${quizSubmissions.length} submissions`)
      
      return {
        id: quiz.id,
        title: quiz.title,
        questions_count: questionsCount,
        total_submissions: quizSubmissions.length,
        average_score: quizSubmissions.length > 0 
          ? Math.round(quizSubmissions.reduce((sum, sub) => sum + sub.percentage, 0) / quizSubmissions.length)
          : 0,
        created_at: quiz.created_at
      }
    })

    console.log('Final results:', formattedResults.length)
    return NextResponse.json({ success: true, results: formattedResults })
  } catch (error) {
    console.error('Quiz results API error:', error)
    return NextResponse.json({ error: 'Failed to fetch quiz results', details: error.message }, { status: 500 })
  }
}
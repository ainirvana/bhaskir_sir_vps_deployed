import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching quizzes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quizzes' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Error in quizzes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { title, questions, article_ids, isPublished } = body;
    
    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Invalid quiz data' },
        { status: 400 }
      );
    }
    
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        title,
        quiz_data: { questions },
        article_ids: article_ids || [],
        is_published: isPublished || false,
        questions_count: questions.length,
        difficulty: 'medium',
        time_limit: 30
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating quiz:', error);
      return NextResponse.json(
        { error: 'Failed to create quiz' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Error in quiz creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { id, updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }
    
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .update({
        ...updates,
        published_at: updates.is_published ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating quiz:', error);
      return NextResponse.json(
        { error: 'Failed to update quiz' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Error in quiz update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching quiz:', error);
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Error in quiz API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    const body = await request.json();
    const { title, questions, article_ids } = body;
    
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .update({
        title,
        questions,
        article_ids: article_ids || [],
        updated_at: new Date().toISOString()
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting quiz:', error);
      return NextResponse.json(
        { error: 'Failed to delete quiz' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in quiz deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
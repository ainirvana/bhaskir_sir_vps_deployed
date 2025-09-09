import { NextRequest, NextResponse } from 'next/server';
import { getQuizById } from '@/app/actions/content-management';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    const result = await getQuizById(id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Quiz not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching quiz:', error);
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
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('quizzes')
      .update({
        title: body.title,
        description: body.description,
        quiz_data: body.quiz_data,
        article_ids: body.article_ids || [],
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

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating quiz:', error);
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
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    
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
    console.error('Error deleting quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
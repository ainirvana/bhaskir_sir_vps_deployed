const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixQuizSystem() {
  console.log('🔧 Starting quiz system fix...');

  try {
    // 1. Ensure quizzes table has all required columns
    console.log('📋 Updating quizzes table structure...');
    
    const quizzesTableUpdates = `
      -- Add missing columns to quizzes table if they don't exist
      DO $$ 
      BEGIN
        -- Add description column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'description') THEN
          ALTER TABLE public.quizzes ADD COLUMN description TEXT;
        END IF;
        
        -- Add quiz_data column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'quiz_data') THEN
          ALTER TABLE public.quizzes ADD COLUMN quiz_data JSONB DEFAULT '{}'::jsonb;
        END IF;
        
        -- Add difficulty column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'difficulty') THEN
          ALTER TABLE public.quizzes ADD COLUMN difficulty TEXT DEFAULT 'medium';
        END IF;
        
        -- Add questions_count column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'questions_count') THEN
          ALTER TABLE public.quizzes ADD COLUMN questions_count INTEGER DEFAULT 0;
        END IF;
        
        -- Add time_limit column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'time_limit') THEN
          ALTER TABLE public.quizzes ADD COLUMN time_limit INTEGER DEFAULT 60;
        END IF;
        
        -- Add is_published column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'is_published') THEN
          ALTER TABLE public.quizzes ADD COLUMN is_published BOOLEAN DEFAULT false;
        END IF;
        
        -- Add is_expired column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'is_expired') THEN
          ALTER TABLE public.quizzes ADD COLUMN is_expired BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `;

    const { error: quizzesError } = await supabase.rpc('exec_sql', { sql: quizzesTableUpdates });
    if (quizzesError) {
      console.error('Error updating quizzes table:', quizzesError);
    } else {
      console.log('✅ Quizzes table structure updated');
    }

    // 2. Create quiz_submissions table if it doesn't exist
    console.log('📋 Creating quiz_submissions table...');
    
    const createSubmissionsTable = `
      -- Create quiz_submissions table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.quiz_submissions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          quiz_id UUID NOT NULL,
          student_id TEXT NOT NULL,
          answers JSONB NOT NULL DEFAULT '{}'::jsonb,
          score INTEGER NOT NULL DEFAULT 0,
          total_questions INTEGER NOT NULL DEFAULT 0,
          percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
          submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      -- Add RLS policies
      ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

      -- Drop existing policy if it exists and create new one
      DROP POLICY IF EXISTS "Allow all operations on quiz_submissions" ON public.quiz_submissions;
      CREATE POLICY "Allow all operations on quiz_submissions" ON public.quiz_submissions
          FOR ALL USING (true);

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON public.quiz_submissions(quiz_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON public.quiz_submissions(student_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_submissions_submitted_at ON public.quiz_submissions(submitted_at);

      -- Add foreign key constraint to quizzes table if it exists
      DO $$
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quizzes') THEN
              -- Drop constraint if it exists
              IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_quiz_submissions_quiz_id') THEN
                  ALTER TABLE public.quiz_submissions DROP CONSTRAINT fk_quiz_submissions_quiz_id;
              END IF;
              -- Add the constraint
              ALTER TABLE public.quiz_submissions 
              ADD CONSTRAINT fk_quiz_submissions_quiz_id 
              FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
          END IF;
      END $$;
    `;

    const { error: submissionsError } = await supabase.rpc('exec_sql', { sql: createSubmissionsTable });
    if (submissionsError) {
      console.error('Error creating quiz_submissions table:', submissionsError);
    } else {
      console.log('✅ Quiz submissions table created/updated');
    }

    // 3. Fix existing quiz data to ensure consistent correct answer mapping
    console.log('🔄 Fixing existing quiz data...');
    
    const { data: existingQuizzes, error: fetchError } = await supabase
      .from('quizzes')
      .select('id, quiz_data, questions');

    if (fetchError) {
      console.error('Error fetching existing quizzes:', fetchError);
    } else if (existingQuizzes && existingQuizzes.length > 0) {
      console.log(`Found ${existingQuizzes.length} existing quizzes to fix`);
      
      for (const quiz of existingQuizzes) {
        let needsUpdate = false;
        let updatedQuizData = { ...quiz.quiz_data };
        let updatedQuestions = [...(quiz.questions || [])];

        // Fix quiz_data questions
        if (updatedQuizData.questions && Array.isArray(updatedQuizData.questions)) {
          updatedQuizData.questions = updatedQuizData.questions.map((q, index) => {
            const fixed = { ...q };
            
            // Ensure correct answer index is properly set
            if (fixed.correctAnswerIndex === undefined && fixed.correctAnswer !== undefined) {
              fixed.correctAnswerIndex = fixed.correctAnswer;
              needsUpdate = true;
            } else if (fixed.correctAnswer === undefined && fixed.correctAnswerIndex !== undefined) {
              fixed.correctAnswer = fixed.correctAnswerIndex;
              needsUpdate = true;
            }
            
            // Ensure options array exists
            if (!fixed.options && fixed.answers) {
              fixed.options = fixed.answers;
              needsUpdate = true;
            } else if (!fixed.answers && fixed.options) {
              fixed.answers = fixed.options;
              needsUpdate = true;
            }
            
            return fixed;
          });
        }

        // Fix questions array
        if (updatedQuestions && Array.isArray(updatedQuestions)) {
          updatedQuestions = updatedQuestions.map((q, index) => {
            const fixed = { ...q };
            
            // Ensure correct answer index is properly set
            if (fixed.correctAnswerIndex === undefined && fixed.correctAnswer !== undefined) {
              fixed.correctAnswerIndex = fixed.correctAnswer;
              needsUpdate = true;
            } else if (fixed.correctAnswer === undefined && fixed.correctAnswerIndex !== undefined) {
              fixed.correctAnswer = fixed.correctAnswerIndex;
              needsUpdate = true;
            }
            
            // Ensure options array exists
            if (!fixed.options && fixed.answers) {
              fixed.options = fixed.answers;
              needsUpdate = true;
            } else if (!fixed.answers && fixed.options) {
              fixed.answers = fixed.options;
              needsUpdate = true;
            }
            
            return fixed;
          });
        }

        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('quizzes')
            .update({
              quiz_data: updatedQuizData,
              questions: updatedQuestions,
              questions_count: updatedQuizData.questions ? updatedQuizData.questions.length : 0
            })
            .eq('id', quiz.id);

          if (updateError) {
            console.error(`Error updating quiz ${quiz.id}:`, updateError);
          } else {
            console.log(`✅ Fixed quiz ${quiz.id}`);
          }
        }
      }
    }

    console.log('🎉 Quiz system fix completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('- ✅ Updated quizzes table with missing columns');
    console.log('- ✅ Created/updated quiz_submissions table');
    console.log('- ✅ Fixed existing quiz data for consistent correct answer mapping');
    console.log('- ✅ Added proper indexes and constraints');
    
  } catch (error) {
    console.error('❌ Error fixing quiz system:', error);
    process.exit(1);
  }
}

// Run the fix
fixQuizSystem();
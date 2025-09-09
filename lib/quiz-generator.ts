import { toast } from "@/components/ui/use-toast";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
  articleIds: string[];
  createdAt: string;
}

export interface GenerateQuizOptions {
  title: string;
  articleIds: string[];
  questionsPerArticle: number;
}

export async function generateQuiz(options: GenerateQuizOptions): Promise<void> {
  try {
    console.log('Starting quiz generation with options:', options);
    
    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });
    
    console.log('Quiz generation response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Quiz generation failed:', errorData);
      throw new Error(errorData.error || 'Failed to generate quiz');
    }
    
    // Handle JSON response
    const quizData = await response.json();
    console.log('Quiz generation successful:', quizData);
    
    // Validate quiz data structure
    if (!quizData.id || !quizData.quizTitle || !quizData.questions || !Array.isArray(quizData.questions)) {
      console.error('Invalid quiz data structure:', quizData);
      throw new Error('Invalid quiz data structure received from server');
    }
    
    // Convert quiz format for admin interface
    const adminQuizData = {
      id: quizData.id,
      title: quizData.quizTitle,
      questions: quizData.questions.map((q: any, index: number) => ({
        id: `q_${index}_${Date.now()}`,
        question: q.question,
        options: q.answers || [],
        correctAnswerIndex: q.correctAnswer || 0,
        explanation: q.explanation || ''
      })),
      articleIds: options.articleIds,
      createdAt: new Date().toISOString()
    };
    
    // Try to save to database first
    try {
      const saveResponse = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: adminQuizData.title,
          questions: adminQuizData.questions,
          article_ids: adminQuizData.articleIds
        }),
      });
      
      if (saveResponse.ok) {
        const { quiz } = await saveResponse.json();
        console.log('Quiz saved to database with ID:', quiz.id);
        // Update the ID to use database ID
        quizData.id = quiz.id;
        adminQuizData.id = quiz.id;
      } else {
        throw new Error('Database save failed');
      }
    } catch (error) {
      console.error('Failed to save to database, using localStorage fallback:', error);
    }
    
    // Always save to localStorage as backup
    const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes') || '[]');
    savedQuizzes.push(adminQuizData);
    localStorage.setItem('savedQuizzes', JSON.stringify(savedQuizzes));
    console.log('Quiz saved to localStorage with ID:', quizData.id);
    
    toast({
      title: "Quiz Generated",
      description: `Successfully generated quiz with ${quizData.questions.length} questions.`,
      variant: "default"
    });
    
    // Redirect to the admin quiz builder page after a short delay
    setTimeout(() => {
      console.log('Redirecting to admin quiz builder:', `/admin/quizzes/${quizData.id}`);
      window.location.href = `/admin/quizzes/${quizData.id}`;
    }, 1000);
    
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw error;
  }
}

// Helper function to download the quiz as PDF
export async function downloadQuizAsPdf(quizId: string): Promise<void> {
  try {
    // Get quiz data from localStorage
    const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes') || '[]');
    const quiz = savedQuizzes.find((q: any) => q.id === quizId);
    
    if (!quiz) {
      throw new Error('Quiz not found');
    }
    
    const encodedQuizData = encodeURIComponent(JSON.stringify(quiz));
    const response = await fetch(`/api/quizzes/${quizId}/download?quizData=${encodedQuizData}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error('Failed to download quiz');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Create a link element to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_${quizId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Download Complete",
      description: "Quiz PDF has been downloaded.",
      variant: "default"
    });
    
  } catch (error) {
    console.error('Error downloading quiz:', error);
    toast({
      title: "Download Failed",
      description: "Failed to download the quiz. Please try again.",
      variant: "destructive"
    });
  }
}

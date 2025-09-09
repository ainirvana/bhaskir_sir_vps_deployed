'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  quiz_data: {
    questions: Question[];
  };
}

interface Submission {
  answers: { [key: number]: number };
  score: number;
  percentage: number;
  submitted_at: string;
}

export default function QuizReviewPage() {
  const params = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadQuizReview(params.id as string);
    }
  }, [params.id]);

  const loadQuizReview = async (id: string) => {
    try {
      const response = await fetch(`/api/student/quiz-review/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setQuiz(data.quiz);
        setSubmission(data.submission);
      }
    } catch (error) {
      console.error('Error loading quiz review:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">Quiz not found</h3>
            <Button asChild>
              <Link href="/student">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/student">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{quiz.title}</CardTitle>
          <CardDescription>
            {submission ? 'Your Quiz Results' : 'Quiz Questions & Answers'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">{quiz.difficulty}</Badge>
            <span className="text-sm text-muted-foreground">
              {quiz.quiz_data?.questions?.length || 0} questions
            </span>
            {submission && (
              <div className="ml-auto text-right">
                <div className="text-2xl font-bold text-green-600">{submission.percentage}%</div>
                <div className="text-sm text-muted-foreground">
                  {submission.score}/{quiz.quiz_data?.questions?.length || 0} correct
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {quiz.quiz_data?.questions && quiz.quiz_data.questions.length > 0 ? (
          quiz.quiz_data.questions.map((question, index) => (
            <Card key={index} className={submission ? `border-l-4 ${
              submission.answers[index] === question.correctAnswerIndex 
                ? 'border-l-green-500' 
                : 'border-l-red-500'
            }` : 'border-l-4 border-l-blue-500'}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-2 mb-2">
                  {submission && (
                    submission.answers[index] === question.correctAnswerIndex ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )
                  )}
                  <div className="flex-1">
                    <p className="font-medium mb-3">Q{index + 1}. {question.question}</p>
                    
                    <div className="space-y-2 mb-3">
                      {question.options?.map((option, optionIndex) => (
                        <div 
                          key={optionIndex} 
                          className={`p-2 rounded border ${
                            optionIndex === question.correctAnswerIndex 
                              ? 'bg-green-50 border-green-200' 
                              : submission && submission.answers[index] === optionIndex && optionIndex !== question.correctAnswerIndex
                              ? 'bg-red-50 border-red-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                            <span>{option}</span>
                            {optionIndex === question.correctAnswerIndex && (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                            )}
                            {submission && submission.answers[index] === optionIndex && optionIndex !== question.correctAnswerIndex && (
                              <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                            )}
                          </div>
                        </div>
                      )) || []}
                    </div>

                    {submission && (
                      <div className="text-sm space-y-1 mb-2">
                        <p>
                          <span className="font-medium">Your answer:</span> {
                            submission.answers[index] !== undefined 
                              ? `${String.fromCharCode(65 + submission.answers[index])}. ${question.options?.[submission.answers[index]] || 'Invalid'}`
                              : 'Not answered'
                          }
                        </p>
                        <p className="text-green-600">
                          <span className="font-medium">Correct answer:</span> {String.fromCharCode(65 + question.correctAnswerIndex)}. {question.options?.[question.correctAnswerIndex] || 'Invalid'}
                        </p>
                      </div>
                    )}

                    {question.explanation && (
                      <div className="text-sm text-muted-foreground mt-2 p-2 bg-blue-50 rounded">
                        <span className="font-medium">Explanation:</span> {question.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No questions available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
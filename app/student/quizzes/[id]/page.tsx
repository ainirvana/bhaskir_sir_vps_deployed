'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Brain, Clock, CheckCircle, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id?: string;
  question: string;
  options?: string[];
  answers?: string[]; // For compatibility with react-quiz-component
  correctAnswerIndex?: number;
  correctAnswer?: number; // For compatibility with react-quiz-component
  explanation?: string;
  point?: number;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions_count: number;
  time_limit: number;
  quiz_data: {
    questions: Question[];
  };
}

export default function StudentQuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadQuiz(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    if (quizStarted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (quizStarted && timeLeft === 0) {
      handleSubmitQuiz();
    }
  }, [timeLeft, quizStarted]);

  const loadQuiz = async (id: string) => {
    try {
      const loggedInEmail = localStorage.getItem('userEmail')
      const response = await fetch(`/api/student/quizzes/${id}`, {
        headers: {
          'x-user-email': loggedInEmail || ''
        }
      });
      const data = await response.json();
      
      if (data.success) {
        if (data.alreadySubmitted) {
          router.push('/student/quizzes');
          return;
        }
        setQuiz(data.quiz);
        if (data.quiz.quiz_data && data.quiz.quiz_data.questions) {
          setTimeLeft(data.quiz.quiz_data.questions.length * 60);
        }
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
  };

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const handleSubmitQuiz = async () => {
    try {
      const results = calculateScore();
      const loggedInEmail = localStorage.getItem('userEmail')
      await fetch('/api/student/quiz-submissions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': loggedInEmail || ''
        },
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': loggedInEmail || ''
        },
        body: JSON.stringify({
          quiz_id: quiz?.id,
          answers,
          score: results.score,
          total_questions: results.total,
          percentage: results.percentage
        })
      });
      setShowResults(true);
      setQuizStarted(false);
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const calculateScore = () => {
    if (!quiz || !quiz.quiz_data || !quiz.quiz_data.questions) return { score: 0, total: 0, percentage: 0 };
    
    let correct = 0;
    const total = quiz.quiz_data.questions.length;
    
    quiz.quiz_data.questions.forEach((question, index) => {
      // Get the correct answer index (handle both formats, ensure it's a number)
      let correctAnswerIndex = question.correctAnswerIndex;
      if (correctAnswerIndex === undefined || correctAnswerIndex === null) {
        correctAnswerIndex = question.correctAnswer;
      }
      
      // Convert to number if it's a string
      if (typeof correctAnswerIndex === 'string') {
        correctAnswerIndex = parseInt(correctAnswerIndex, 10);
      }
      
      // Ensure we have a valid number
      if (typeof correctAnswerIndex !== 'number' || isNaN(correctAnswerIndex)) {
        console.warn(`Invalid correct answer index for question ${index}:`, correctAnswerIndex);
        return; // Skip this question
      }
      
      // Only count as correct if answer exists and matches correct answer
      if (answers[index] !== undefined && answers[index] === correctAnswerIndex) {
        correct++;
      }
    });
    
    return {
      score: correct,
      total,
      percentage: Math.round((correct / total) * 100)
    };
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
            <p className="text-muted-foreground mb-4">The quiz you're looking for doesn't exist or isn't published.</p>
            <Button asChild>
              <Link href="/student/quizzes">Back to Quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults) {
    const results = calculateScore();
    
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Quiz Results</CardTitle>
            <CardDescription>{quiz.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {results.percentage}%
              </div>
              <p className="text-muted-foreground">
                {results.score} out of {results.total} questions correct
              </p>
            </div>
            
            <div className="space-y-4">
              {quiz.quiz_data?.questions?.map((question, index) => {
                // Get the correct answer index (handle both formats, ensure it's a number)
                let correctAnswerIndex = question.correctAnswerIndex;
                if (correctAnswerIndex === undefined || correctAnswerIndex === null) {
                  correctAnswerIndex = question.correctAnswer;
                }
                
                // Convert to number if it's a string
                if (typeof correctAnswerIndex === 'string') {
                  correctAnswerIndex = parseInt(correctAnswerIndex, 10);
                }
                
                // Get the options array (handle both formats)
                const questionOptions = question.options || question.answers || [];
                
                // Ensure we have valid data
                const hasValidCorrectAnswer = typeof correctAnswerIndex === 'number' && 
                  !isNaN(correctAnswerIndex) && 
                  correctAnswerIndex >= 0 && 
                  correctAnswerIndex < questionOptions.length;
                
                const isCorrect = hasValidCorrectAnswer && answers[index] === correctAnswerIndex;
                
                return (
                  <Card key={index} className={`border-l-4 ${
                    isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                  }`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2 mb-2">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{question.question}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">Your answer:</span> {
                                answers[index] !== undefined && questionOptions[answers[index]]
                                  ? questionOptions[answers[index]]
                                  : answers[index] !== undefined 
                                    ? `Option ${answers[index] + 1} (Invalid)`
                                    : 'Not answered'
                              }
                            </p>
                            <p className="text-sm text-green-600">
                              <span className="font-medium">Correct answer:</span> {
                                hasValidCorrectAnswer
                                  ? questionOptions[correctAnswerIndex]
                                  : `Invalid correct answer (${correctAnswerIndex})`
                              }
                            </p>
                            {question.explanation && (
                              <p className="text-sm text-muted-foreground mt-2">
                                <span className="font-medium">Explanation:</span> {question.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/student/quizzes">Back to Quizzes</Link>
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/quizzes">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
            </div>
            <CardTitle className="text-2xl">{quiz.title}</CardTitle>
            {quiz.description && (
              <CardDescription>{quiz.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-muted-foreground" />
                <span>{quiz.quiz_data?.questions?.length || 0} Questions</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>{quiz.quiz_data?.questions?.length || 0} Minutes (1 min/question)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={
                  quiz.difficulty === 'easy' ? 'secondary' : 
                  quiz.difficulty === 'medium' ? 'default' : 'destructive'
                }>
                  {quiz.difficulty}
                </Badge>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Instructions:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• You have {quiz.quiz_data?.questions?.length || 0} minutes to complete this quiz (1 minute per question)</li>
                <li>• Each question has only one correct answer</li>
                <li>• You can navigate between questions using the Next/Previous buttons</li>
                <li>• Your progress will be saved automatically</li>
                <li>• Click "Submit Quiz" when you're ready to see your results</li>
              </ul>
            </div>
            
            <Button onClick={startQuiz} className="w-full" size="lg">
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = quiz.quiz_data?.questions?.[currentQuestion];
  const progress = ((currentQuestion + 1) / (quiz.quiz_data?.questions?.length || 1)) * 100;
  
  if (!currentQ) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">No questions available</h3>
            <Button asChild>
              <Link href="/student/quizzes">Back to Quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {quiz.quiz_data?.questions?.length || 0}
          </span>
          <Progress value={progress} className="w-32" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span className={timeLeft < 300 ? 'text-red-500 font-medium' : ''}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQ.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={answers[currentQuestion] !== undefined ? answers[currentQuestion].toString() : ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion, parseInt(value))}
          >
            {(currentQ.options || currentQ.answers || []).map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentQuestion === (quiz.quiz_data?.questions?.length || 1) - 1 ? (
              <Button onClick={handleSubmitQuiz}>
                Submit Quiz
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion(Math.min((quiz.quiz_data?.questions?.length || 1) - 1, currentQuestion + 1))}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
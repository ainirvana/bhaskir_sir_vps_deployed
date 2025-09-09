"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, RefreshCcw, CheckCircle, XCircle, Clock, Award } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  answers: string[];
  correctAnswer: string | number;
  explanation?: string;
  point?: number;
}

interface QuizData {
  id: string;
  quizTitle: string;
  quizSynopsis?: string;
  questions: QuizQuestion[];
  createdAt?: string;
}

interface QuizViewerProps {
  quizId: string;
}

interface QuizResult {
  numberOfQuestions: number;
  numberOfCorrectAnswers: number;
  numberOfIncorrectAnswers: number;
  correctPoints: number;
  totalPoints: number;
  userAnswers: Array<{
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    point: number;
  }>;
}

export default function QuizViewer({ quizId }: QuizViewerProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult | null>(null);
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);

  useEffect(() => {
    // Try to load quiz from localStorage
    try {
      console.log('Loading quiz with ID:', quizId);
      const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes') || '[]');
      console.log('All saved quizzes:', savedQuizzes);
      
      const foundQuiz = savedQuizzes.find((q: any) => q.id === quizId);
      console.log('Found quiz:', foundQuiz);
      
      if (foundQuiz) {
        setQuiz(foundQuiz);
        setTimeStarted(new Date());
        console.log('Quiz loaded successfully:', foundQuiz.quizTitle);
      } else {
        console.error('Quiz not found with ID:', quizId);
        toast({
          title: "Quiz not found",
          description: `The requested quiz could not be found. Available quiz IDs: ${savedQuizzes.map((q: any) => q.id).join(', ')}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error loading quiz:", error);
      toast({
        title: "Error",
        description: "Failed to load quiz data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  // Timer effect
  useEffect(() => {
    if (timeStarted && !showResults) {
      const interval = setInterval(() => {
        setTimeElapsed(Math.floor((new Date().getTime() - timeStarted.getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timeStarted, showResults]);

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = () => {
    if (!selectedAnswer) {
      toast({
        title: "Please select an answer",
        description: "You must select an answer before proceeding",
        variant: "destructive"
      });
      return;
    }

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = selectedAnswer;
    setUserAnswers(newAnswers);
    setSelectedAnswer('');

    if (currentQuestion < quiz!.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz completed, calculate results
      calculateResults(newAnswers);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(userAnswers[currentQuestion - 1] || '');
    }
  };

  const calculateResults = (answers: string[]) => {
    if (!quiz) return;

    let correctCount = 0;
    let totalPoints = 0;
    let correctPoints = 0;
    
    const detailedResults = quiz.questions.map((question, index) => {
      const userAnswer = answers[index];
      const correctAnswer = typeof question.correctAnswer === 'number' 
        ? question.answers[question.correctAnswer] 
        : question.correctAnswer;
      const isCorrect = userAnswer === correctAnswer;
      const point = question.point || 10;
      
      if (isCorrect) {
        correctCount++;
        correctPoints += point;
      }
      totalPoints += point;

      return {
        question: question.question,
        userAnswer,
        correctAnswer,
        isCorrect,
        point
      };
    });

    const results: QuizResult = {
      numberOfQuestions: quiz.questions.length,
      numberOfCorrectAnswers: correctCount,
      numberOfIncorrectAnswers: quiz.questions.length - correctCount,
      correctPoints,
      totalPoints,
      userAnswers: detailedResults
    };

    setQuizResults(results);
    setShowResults(true);

    // Save results to localStorage
    try {
      const savedResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
      const resultWithQuizInfo = {
        quizId,
        quizTitle: quiz.quizTitle,
        results,
        completedAt: new Date().toISOString(),
        timeElapsed
      };
      savedResults.push(resultWithQuizInfo);
      localStorage.setItem('quizResults', JSON.stringify(savedResults));
      
      toast({
        title: "Quiz completed!",
        description: `You scored ${correctPoints}/${totalPoints} points!`,
      });
    } catch (error) {
      console.error("Error saving quiz results:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setUserAnswers([]);
    setSelectedAnswer('');
    setShowResults(false);
    setQuizResults(null);
    setTimeStarted(new Date());
    setTimeElapsed(0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="text-center py-8">
          <h2 className="text-xl font-semibold mb-4">Quiz Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The quiz you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/quizzes">Back to Quizzes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showResults && quizResults) {
    const percentage = Math.round((quizResults.numberOfCorrectAnswers / quizResults.numberOfQuestions) * 100);
    
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/quizzes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Link>
          </Button>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">
              <Award className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              Quiz Results
            </CardTitle>
            <CardDescription className="text-lg">
              {quiz.quizTitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {quizResults.numberOfCorrectAnswers}
                </div>
                <div className="text-sm text-green-600">Correct</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {quizResults.numberOfIncorrectAnswers}
                </div>
                <div className="text-sm text-red-600">Incorrect</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  <Clock className="h-5 w-5 inline mr-1" />
                  {formatTime(timeElapsed)}
                </div>
                <div className="text-sm text-blue-600">Time Taken</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {quizResults.correctPoints} / {quizResults.totalPoints} points
              </div>
              <div className="text-xl text-muted-foreground">
                {percentage}% correct
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Question Review</h3>
              {quizResults.userAnswers.map((answer, index) => (
                <Card key={index} className={cn(
                  "border-l-4",
                  answer.isCorrect ? "border-l-green-500 bg-green-50" : "border-l-red-500 bg-red-50"
                )}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {answer.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-2">
                          Question {index + 1}: {answer.question}
                        </p>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">Your answer:</span>{" "}
                            <span className={answer.isCorrect ? "text-green-600" : "text-red-600"}>
                              {answer.userAnswer}
                            </span>
                          </p>
                          {!answer.isCorrect && (
                            <p>
                              <span className="font-medium">Correct answer:</span>{" "}
                              <span className="text-green-600">{answer.correctAnswer}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {answer.isCorrect ? answer.point : 0}/{answer.point} pts
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <Button asChild variant="outline">
                <Link href="/quizzes">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Quizzes
                </Link>
              </Button>
              <Button onClick={restartQuiz} variant="outline">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/quizzes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quizzes
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <CardTitle className="text-2xl">{quiz.quizTitle}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(timeElapsed)}
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">{question.question}</h3>
            
            <div className="space-y-3">
              {question.answers.map((answer, index) => (
                <Card 
                  key={index}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    selectedAnswer === answer 
                      ? "ring-2 ring-primary bg-primary/5" 
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => handleAnswerSelect(answer)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        selectedAnswer === answer 
                          ? "border-primary bg-primary" 
                          : "border-gray-300"
                      )}>
                        {selectedAnswer === answer && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="text-sm font-medium">{answer}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            
            <Button 
              onClick={handleNextQuestion}
              disabled={!selectedAnswer}
            >
              {currentQuestion === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

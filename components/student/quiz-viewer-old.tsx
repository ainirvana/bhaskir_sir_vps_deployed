"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Download, RefreshCcw } from "lucide-react";
import Link from "next/link";
import Quiz from 'react-quiz-component';

interface QuizViewerProps {
  quizId: string;
}

export default function QuizViewer({ quizId }: QuizViewerProps) {
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quizResults, setQuizResults] = useState<any>(null);
  
  useEffect(() => {
    // Try to load quiz from localStorage for now
    // In a production app, this would come from your database
    try {
      const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes') || '[]');
      const foundQuiz = savedQuizzes.find((q: any) => q.id === quizId);
      
      if (foundQuiz) {
        setQuiz(foundQuiz);
      } else {
        toast({
          title: "Quiz not found",
          description: "The requested quiz could not be found",
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

  const handleQuizComplete = (results: any) => {
    console.log('Quiz completed:', results);
    setQuizResults(results);
    
    // Save results to localStorage
    try {
      const savedResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
      const resultWithQuizInfo = {
        quizId,
        quizTitle: quiz?.quizTitle,
        results,
        completedAt: new Date().toISOString()
      };
      savedResults.push(resultWithQuizInfo);
      localStorage.setItem('quizResults', JSON.stringify(savedResults));
      
      toast({
        title: "Quiz completed!",
        description: `You scored ${results.correctPoints || results.numberOfCorrectAnswers} points!`,
      });
    } catch (error) {
      console.error("Error saving quiz results:", error);
    }
  };

  const renderCustomResultPage = (obj: any) => {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Quiz Results</CardTitle>
          <CardDescription className="text-center">
            {quiz?.quizTitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {obj.numberOfCorrectAnswers}
              </div>
              <div className="text-sm text-green-600">Correct</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {obj.numberOfIncorrectAnswers}
              </div>
              <div className="text-sm text-red-600">Incorrect</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold">
              Final Score: {obj.correctPoints || (obj.numberOfCorrectAnswers * 10)} / {obj.totalPoints || (obj.numberOfQuestions * 10)} points
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {Math.round(((obj.numberOfCorrectAnswers / obj.numberOfQuestions) * 100))}% correct
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link href="/quizzes">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quizzes
              </Link>
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retake Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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

      <Quiz
        quiz={quiz}
        shuffle={false}
        shuffleAnswer={false}
        showDefaultResult={false}
        customResultPage={renderCustomResultPage}
        onComplete={handleQuizComplete}
        showInstantFeedback={true}
        continueTillCorrect={false}
        enableProgressBar={true}
      />
    </div>
  );
}
    }
  }, [quizId]);
  
  // Handle answer selection
  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };
    // Submit quiz and calculate score
  const handleSubmitQuiz = () => {
    if (!quiz) return;
    
    let correct = 0;
    for (let i = 0; i < quiz.questions.length; i++) {
      if (userAnswers[i] === quiz.questions[i].correctAnswerIndex) {
        correct++;
      }
    }
    
    const quizResult = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      score: correct,
      totalQuestions: quiz.questions.length,
      timestamp: new Date().toISOString(),
      answers: userAnswers
    };
    
    // Save result to localStorage
    try {
      const savedResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
      savedResults.push(quizResult);
      localStorage.setItem('quizResults', JSON.stringify(savedResults));
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
    
    setScore({
      correct,
      total: quiz.questions.length
    });
    
    setShowResults(true);
    
    toast({
      title: "Quiz Submitted",
      description: `You scored ${correct} out of ${quiz.questions.length}`,
      variant: "default"
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Reset quiz
  const handleResetQuiz = () => {
    setUserAnswers(new Array(quiz.questions.length).fill(-1));
    setShowResults(false);
    setScore({ correct: 0, total: 0 });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin mr-2 text-2xl">⏳</div>
        <p>Loading quiz...</p>
      </div>
    );
  }
  
  if (!quiz) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Quiz not found</h2>
        <p>Sorry, the requested quiz could not be found.</p>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">{quiz.title}</CardTitle>
          <CardDescription>
            {showResults ? (
              <div className="mt-2">
                <div className="text-lg font-medium">
                  Your score: {score.correct} out of {score.total} ({Math.round((score.correct / score.total) * 100)}%)
                </div>
                {score.correct / score.total >= 0.8 ? (
                  <p className="text-green-600 mt-1">Excellent work!</p>
                ) : score.correct / score.total >= 0.6 ? (
                  <p className="text-amber-600 mt-1">Good job! Keep learning.</p>
                ) : (
                  <p className="text-red-600 mt-1">You might want to review these articles again.</p>
                )}
              </div>
            ) : (
              <span>
                This quiz contains {quiz.questions.length} questions based on {quiz.articleIds.length} articles.
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="space-y-8">
        {quiz.questions.map((question: QuizQuestion, qIndex: number) => (
          <Card key={qIndex} className={showResults ? (userAnswers[qIndex] === question.correctAnswerIndex ? "border-green-500" : "border-red-500") : ""}>
            <CardHeader>
              <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
              <p>{question.question}</p>
            </CardHeader>
            
            <CardContent>
              <RadioGroup 
                value={userAnswers[qIndex].toString()} 
                onValueChange={(value) => handleAnswerSelect(qIndex, parseInt(value))}
                disabled={showResults}
              >
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className={`flex items-start space-x-2 p-2 rounded ${
                    showResults && oIndex === question.correctAnswerIndex ? "bg-green-100" : ""
                  } ${
                    showResults && userAnswers[qIndex] === oIndex && oIndex !== question.correctAnswerIndex ? "bg-red-100" : ""
                  }`}>
                    <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                    <Label htmlFor={`q${qIndex}-o${oIndex}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              {showResults && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">Explanation:</h4>
                  <p>{question.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
        <Button 
          asChild
          variant="outline"
          size="lg"
        >
          <Link href="/quizzes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Link>
        </Button>

        {!showResults ? (
          <Button 
            onClick={handleSubmitQuiz} 
            disabled={userAnswers.includes(-1)}
            size="lg"
          >
            Submit Quiz
          </Button>
        ) : (
          <>
            <Button 
              onClick={handleResetQuiz}
              variant="outline"
              size="lg"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
            
            <Button 
              onClick={() => downloadQuizAsPdf(quizId)}
              variant="secondary"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

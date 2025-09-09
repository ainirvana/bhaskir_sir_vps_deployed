"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Trophy } from "lucide-react";

export default function QuizzesPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Quizzes</h1>
        <Button variant="outline" asChild>
          <Link href="/quizzes/results">
            View Quiz Results
          </Link>
        </Button>
      </div>
      
      <div>
        <QuizList />
      </div>
    </div>
  );
}

function QuizList() {
  // In a real application, you would fetch this data from your backend
  const [quizzes, setQuizzes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Load quizzes from localStorage
    try {
      const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes') || '[]');
      setQuizzes(savedQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  if (loading) {
    return <div className="text-center p-8">Loading quizzes...</div>;
  }
  
  if (quizzes.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardHeader>
          <CardTitle>No Quizzes Found</CardTitle>
          <CardDescription>
            You haven&apos;t created any quizzes yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Go to the articles section and select articles to generate a quiz.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/articles">Browse Articles</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {quizzes.map((quiz) => (
        <QuizCard key={quiz.id} quiz={quiz} />
      ))}
    </div>
  );
}

function QuizCard({ quiz }: { quiz: any }) {
  const formattedDate = new Date(quiz.createdAt).toLocaleDateString();
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="line-clamp-2">{quiz.title}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {formattedDate}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <p className="text-muted-foreground mb-2">
          {quiz.totalQuestions} questions from {quiz.articleIds.length} articles
        </p>
        
        {quiz.articleTitles && quiz.articleTitles.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-1">Based on:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4">
              {quiz.articleTitles.slice(0, 3).map((title: string, index: number) => (
                <li key={index} className="line-clamp-1">{title}</li>
              ))}
              {quiz.articleTitles.length > 3 && (
                <li className="text-sm text-muted-foreground">
                  +{quiz.articleTitles.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-4">
        <Button asChild className="w-full flex items-center gap-2">
          <Link href={`/quizzes/${quiz.id}`}>
            <FileText className="h-4 w-4" />
            Take Quiz
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

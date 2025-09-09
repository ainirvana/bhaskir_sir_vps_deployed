"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { ArrowRight, Clock, Trophy } from 'lucide-react';
import Link from "next/link";

interface QuizResult {
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  timestamp: string;
}

export default function QuizResultsList() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load quiz results from localStorage
    // In a production app, this would come from your database
    try {
      const savedResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
      setResults(savedResults);
    } catch (error) {
      console.error('Error loading quiz results:', error);
      toast({
        title: "Error",
        description: "Failed to load your quiz results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);
  
  if (loading) {
    return <div className="text-center p-8">Loading your quiz results...</div>;
  }
  
  if (results.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardHeader>
          <CardTitle>No Quiz Results</CardTitle>
          <CardDescription>
            You haven't taken any quizzes yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Take quizzes to track your progress and see your performance history.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/quizzes">Browse Quizzes</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Your Quiz Results</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader>
              <CardTitle className="line-clamp-2">{result.quizTitle}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {new Date(result.timestamp).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-grow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Score:</span>
                <span className="flex items-center text-lg font-bold">
                  <Trophy className="h-5 w-5 text-amber-500 mr-2" />
                  {result.score}/{result.totalQuestions}
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({Math.round((result.score / result.totalQuestions) * 100)}%)
                  </span>
                </span>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/quizzes/${result.quizId}`}>
                  Retake Quiz <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface QuizStatus {
  id: string;
  title: string;
  difficulty: string;
  questions_count: number;
  status: 'active' | 'submitted' | 'missed';
  score?: number;
  submitted_at?: string;
  expires_at?: string;
}

export default function StudentDashboard() {
  const [quizzes, setQuizzes] = useState<QuizStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const response = await fetch('/api/student/quiz-status');
      const data = await response.json();
      if (data.success) {
        setQuizzes(data.quizzes || []);
      }
    } catch (error) {
      console.error('Error loading quiz status:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeQuizzes = quizzes.filter(q => q.status === 'active');
  const submittedQuizzes = quizzes.filter(q => q.status === 'submitted');
  const missedQuizzes = quizzes.filter(q => q.status === 'missed');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Track your quiz progress and performance</p>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Active Quizzes ({activeQuizzes.length})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Submitted ({submittedQuizzes.length})
          </TabsTrigger>
          <TabsTrigger value="missed" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Missed ({missedQuizzes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeQuizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{quiz.difficulty}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {quiz.questions_count} questions • {quiz.questions_count} min
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <Link href={`/student/quizzes/${quiz.id}`}>
                      Start Quiz
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {activeQuizzes.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active quizzes</h3>
                  <p className="text-muted-foreground">Check back later for new quizzes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="submitted">
          <div className="space-y-4">
            {submittedQuizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{quiz.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{quiz.questions_count} questions</span>
                        <span>Submitted: {new Date(quiz.submitted_at!).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{quiz.score}%</div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {submittedQuizzes.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No submitted quizzes</h3>
                  <p className="text-muted-foreground">Complete some quizzes to see your results here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="missed">
          <div className="space-y-4">
            {missedQuizzes.map((quiz) => (
              <Card key={quiz.id} className="border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{quiz.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{quiz.questions_count} questions</span>
                        <span>Expired: {new Date(quiz.expires_at!).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge variant="destructive">Missed</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {missedQuizzes.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No missed quizzes</h3>
                  <p className="text-muted-foreground">Great job staying on top of your quizzes!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Users, Award, Eye } from 'lucide-react';

interface QuizResult {
  id: string;
  title: string;
  total_submissions: number;
  average_score: number;
  questions_count: number;
  created_at: string;
}

interface StudentSubmission {
  student_id: string;
  student_name: string;
  score: number;
  percentage: number;
  submitted_at: string;
}

export default function AdminResultsPage() {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizResults();
  }, []);

  const loadQuizResults = async () => {
    try {
      console.log('Loading quiz results...');
      const response = await fetch('/api/admin/quiz-results');
      const data = await response.json();
      console.log('Quiz results response:', data);
      
      if (data.success) {
        console.log('Setting quiz results:', data.results);
        setQuizResults(data.results);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Error loading quiz results:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuizSubmissions = async (quizId: string) => {
    try {
      const response = await fetch(`/api/admin/quiz-results/${quizId}`);
      const data = await response.json();
      console.log('Frontend received submissions:', data.submissions);
      if (data.success) {
        setSubmissions(data.submissions);
        setSelectedQuiz(quizId);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  if (selectedQuiz) {
    const quiz = quizResults.find(q => q.id === selectedQuiz);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => setSelectedQuiz(null)}>
            Back to Results
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{quiz?.title}</CardTitle>
            <CardDescription>Individual student submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{submissions.length}</div>
                <div className="text-sm text-muted-foreground">Total Submissions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{quiz?.average_score.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Average Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{quiz?.questions_count}</div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Submitted At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission, index) => {
                  console.log('Rendering submission:', submission);
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{submission.student_name || 'No Name'}</div>
                          <div className="text-sm text-muted-foreground">{submission.student_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>{submission.score}/{quiz?.questions_count}</TableCell>
                      <TableCell>{submission.percentage}%</TableCell>
                      <TableCell>{new Date(submission.submitted_at).toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quiz Results</h1>
        <p className="text-muted-foreground">View quiz performance and student submissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : quizResults.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No quiz results</h3>
              <p className="text-muted-foreground">Publish some quizzes to see results here</p>
            </CardContent>
          </Card>
        ) : (
          quizResults.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                <CardDescription>
                  {quiz.questions_count} questions • {quiz.total_submissions} submissions
                  <br />
                  Created: {new Date(quiz.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{submissions.length} students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{quiz.average_score.toFixed(1)}% avg</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => loadQuizSubmissions(quiz.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
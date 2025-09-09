"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Trash2, Eye } from "lucide-react";

export default function QuizDebugPage() {
  const [savedQuizzes, setSavedQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const quizzes = JSON.parse(localStorage.getItem('savedQuizzes') || '[]');
      setSavedQuizzes(quizzes);
      console.log('All saved quizzes:', quizzes);
    } catch (error) {
      console.error('Error loading saved quizzes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAllQuizzes = () => {
    localStorage.removeItem('savedQuizzes');
    setSavedQuizzes([]);
    console.log('All quizzes cleared');
  };

  const deleteQuiz = (quizId: string) => {
    const updatedQuizzes = savedQuizzes.filter(q => q.id !== quizId);
    localStorage.setItem('savedQuizzes', JSON.stringify(updatedQuizzes));
    setSavedQuizzes(updatedQuizzes);
    console.log('Quiz deleted:', quizId);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Quiz Debug Console</h1>
        <Button variant="destructive" onClick={clearAllQuizzes}>
          Clear All Quizzes
        </Button>
      </div>

      {savedQuizzes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-xl font-semibold mb-4">No Quizzes Found</h2>
            <p className="text-muted-foreground mb-4">
              No quizzes are saved in localStorage. Generate a quiz first.
            </p>
            <Button asChild>
              <Link href="/articles/generate-presentation">
                Generate a Quiz
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {savedQuizzes.map((quiz, index) => (
            <Card key={quiz.id || index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{quiz.quizTitle || 'Untitled Quiz'}</span>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/quizzes/${quiz.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteQuiz(quiz.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {quiz.quizSynopsis}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <strong>ID:</strong> {quiz.id}
                  </div>
                  <div>
                    <strong>Questions:</strong> {quiz.questions?.length || 0}
                  </div>
                  <div>
                    <strong>Articles:</strong> {quiz.articleIds?.length || 0}
                  </div>
                  <div>
                    <strong>Created:</strong> {
                      quiz.createdAt 
                        ? new Date(quiz.createdAt).toLocaleDateString()
                        : 'Unknown'
                    }
                  </div>
                </div>
                
                {quiz.questions && quiz.questions.length > 0 && (
                  <div className="mt-4">
                    <details>
                      <summary className="cursor-pointer font-medium">
                        Preview Questions ({quiz.questions.length})
                      </summary>
                      <div className="mt-2 space-y-2">
                        {quiz.questions.slice(0, 3).map((question: any, qIndex: number) => (
                          <div key={qIndex} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="font-medium">Q{qIndex + 1}: {question.question}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Answers: {question.answers?.join(' | ') || 'No answers'}
                            </div>
                          </div>
                        ))}
                        {quiz.questions.length > 3 && (
                          <div className="text-xs text-gray-500">
                            ... and {quiz.questions.length - 3} more questions
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}
                
                <div className="mt-4">
                  <details>
                    <summary className="cursor-pointer font-medium">
                      Raw JSON Data
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(quiz, null, 2)}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

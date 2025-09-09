'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Eye, 
  Edit3,
  FileText,
  CheckCircle,
  XCircle,
  ArrowLeft
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  articleIds: string[];
  createdAt: string;
}

export default function AdminQuizBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      // First try to load from database
      const response = await fetch(`/api/quizzes/${quizId}`);
      if (response.ok) {
        const quizData = await response.json();
        console.log('Loaded quiz data:', quizData);
        
        // Try multiple sources for questions
        let questions = [];
        if (quizData.quiz_data?.questions) {
          questions = quizData.quiz_data.questions;
        } else if (quizData.questions) {
          questions = quizData.questions;
        } else if (Array.isArray(quizData.quiz_data)) {
          questions = quizData.quiz_data;
        }
        
        console.log('Extracted questions:', questions);
        
        const questionsWithIds = questions.map((q: any, index: number) => ({
          ...q,
          id: q.id || `q_${index}_${Date.now()}`,
          options: q.options || q.answers || ['', '', '', ''],
          correctAnswerIndex: q.correctAnswerIndex ?? q.correctAnswer ?? 0
        }));
        
        console.log('Final questions with IDs:', questionsWithIds);
        
        setQuiz({
          id: quizData.id,
          title: quizData.title,
          questions: questionsWithIds,
          articleIds: quizData.article_ids || [],
          createdAt: quizData.created_at
        });
      } else {
        // Fallback to localStorage
        const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes') || '[]');
        const foundQuiz = savedQuizzes.find((q: Quiz) => q.id === quizId);
        
        if (foundQuiz) {
          const questionsWithIds = (foundQuiz.questions || []).map((q: any, index: number) => ({
            ...q,
            id: q.id || `q_${index}_${Date.now()}`
          }));
          setQuiz({ 
            ...foundQuiz, 
            questions: questionsWithIds,
            articleIds: foundQuiz.articleIds || []
          });
        } else {
          // Create empty quiz if not found
          setQuiz({
            id: quizId,
            title: 'New Quiz',
            questions: [],
            articleIds: [],
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      // Always create empty quiz on error
      setQuiz({
        id: quizId,
        title: 'New Quiz',
        questions: [],
        articleIds: [],
        createdAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const saveQuiz = async () => {
    if (!quiz) return;
    
    try {
      setSaving(true);
      
      // Prepare quiz data for database
      const quizData = {
        title: quiz.title,
        description: `Quiz with ${quiz.questions.length} questions`,
        quiz_data: {
          questions: quiz.questions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswerIndex,
            explanation: q.explanation
          }))
        },
        article_ids: quiz.articleIds || []
      };
      
      // Try to update quiz in database first
      let response = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quizData),
      });
      
      // If update fails (quiz doesn't exist), try to create it
      if (!response.ok) {
        response = await fetch('/api/quizzes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quizData),
        });
      }
      
      if (response.ok) {
        toast({
          title: "Quiz saved",
          description: "Your changes have been saved successfully.",
          variant: "default"
        });
      } else {
        throw new Error('Database save failed');
      }
    } catch (error) {
      // Fallback to localStorage on error
      try {
        const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes') || '[]');
        const existingIndex = savedQuizzes.findIndex((q: Quiz) => q.id === quiz.id);
        
        if (existingIndex >= 0) {
          savedQuizzes[existingIndex] = quiz;
        } else {
          savedQuizzes.push(quiz);
        }
        
        localStorage.setItem('savedQuizzes', JSON.stringify(savedQuizzes));
        
        toast({
          title: "Quiz saved",
          description: "Saved to local storage (database error).",
          variant: "default"
        });
      } catch (localError) {
        toast({
          title: "Save failed",
          description: "Failed to save quiz changes.",
          variant: "destructive"
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const addNewQuestion = () => {
    if (!quiz) return;
    
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: ''
    };
    
    setQuiz({
      ...quiz,
      questions: [...(quiz.questions || []), newQuestion]
    });
    setEditingQuestion(newQuestion.id);
  };

  const deleteQuestion = (questionId: string) => {
    if (!quiz) return;
    
    setQuiz({
      ...quiz,
      questions: (quiz.questions || []).filter(q => q.id !== questionId)
    });
    
    if (editingQuestion === questionId) {
      setEditingQuestion(null);
    }
  };

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    if (!quiz) return;
    
    setQuiz({
      ...quiz,
      questions: (quiz.questions || []).map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    });
  };

  const downloadQuizPDF = async () => {
    if (!quiz) return;
    
    try {
      const response = await fetch(`/api/quizzes/${quiz.id}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(quiz.title || 'quiz').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Quiz Downloaded",
        description: "Quiz has been downloaded as PDF.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export quiz.",
        variant: "destructive"
      });
    }
  };

  const previewQuiz = () => {
    if (!quiz) return;
    window.open(`/quizzes/${quiz.id}`, '_blank');
  };

  if (loading || !initialized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz && initialized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Quiz Not Found</h1>
          <Button onClick={() => router.push('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  if (!quiz) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/admin/quizzes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Quiz Builder</h1>
            <p className="text-gray-600">Edit and manage your quiz questions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={previewQuiz}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={downloadQuizPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={saveQuiz} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Quiz Title */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quiz Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input
                id="quiz-title"
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <Label>Questions</Label>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  {(quiz.questions || []).length} question{(quiz.questions || []).length !== 1 ? 's' : ''}
                </Badge>
                <Button size="sm" onClick={addNewQuestion}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {(quiz.questions || []).map((question, index) => (
          <Card key={question.id} className={editingQuestion === question.id ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingQuestion(
                      editingQuestion === question.id ? null : question.id
                    )}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteQuestion(question.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingQuestion === question.id ? (
                <div className="space-y-4">
                  <div>
                    <Label>Question</Label>
                    <Textarea
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                      placeholder="Enter your question"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label>Options</Label>
                    <div className="space-y-2 mt-2">
                      {(question.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                              {String.fromCharCode(65 + optionIndex)}
                            </div>
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(question.options || [])];
                                newOptions[optionIndex] = e.target.value;
                                updateQuestion(question.id, { options: newOptions });
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant={question.correctAnswerIndex === optionIndex ? "default" : "outline"}
                            onClick={() => updateQuestion(question.id, { correctAnswerIndex: optionIndex })}
                          >
                            {question.correctAnswerIndex === optionIndex ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Explanation</Label>
                    <Textarea
                      value={question.explanation}
                      onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                      placeholder="Explain why this is the correct answer"
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{question.question || 'No question text'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(question.options || []).map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`flex items-center gap-2 p-2 rounded border ${
                          question.correctAnswerIndex === optionIndex
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-white border flex items-center justify-center text-sm font-medium">
                          {String.fromCharCode(65 + optionIndex)}
                        </div>
                        <span className="text-sm">{option || 'No option text'}</span>
                        {question.correctAnswerIndex === optionIndex && (
                          <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                  {question.explanation && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {(quiz.questions || []).length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-600 mb-4">Add your first question to get started</p>
              <Button onClick={addNewQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
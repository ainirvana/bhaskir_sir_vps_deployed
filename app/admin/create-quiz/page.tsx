"use client";

import { useState } from 'react';
import { AdminOnly } from '@/components/auth/role-guard';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Globe, 
  FileQuestion,
  Lightbulb,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { saveQuiz } from '@/app/actions/content-management';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizData {
  title: string;
  description: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  questions: QuizQuestion[];
  isPublished: boolean;
}

export default function CreateQuizPage() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [quiz, setQuiz] = useState<QuizData>({
    title: '',
    description: '',
    subject: '',
    difficulty: 'medium',
    timeLimit: 30,
    questions: [],
    isPublished: false
  });

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      difficulty: 'medium'
    };
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
  };

  const deleteQuestion = (questionId: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? { ...q, options: q.options.map((opt, idx) => idx === optionIndex ? value : opt) }
          : q
      )
    }));
  };

  const handleSave = async (publish: boolean = false) => {
    if (!quiz.title || !quiz.description || quiz.questions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and add at least one question.",
        variant: "destructive"
      });
      return;
    }

    // Validate questions
    for (const question of quiz.questions) {
      if (!question.question || question.options.some(opt => !opt) || !question.explanation) {
        toast({
          title: "Question Validation Error",
          description: "All questions must have a question text, all options filled, and an explanation.",
          variant: "destructive"
        });
        return;
      }
    }

    setSaving(true);
    try {
      const quizToSave = {
        ...quiz,
        isPublished: publish,
        createdBy: userProfile?.id || ''
      };

      await saveQuiz(quizToSave);
      
      toast({
        title: publish ? "Quiz Published!" : "Quiz Saved!",
        description: publish 
          ? "Your quiz has been saved and published. Students can now access it."
          : "Your quiz has been saved as a draft. You can publish it later from the Content Management page.",
        variant: "default"
      });

      // Reset form
      setQuiz({
        title: '',
        description: '',
        subject: '',
        difficulty: 'medium',
        timeLimit: 30,
        questions: [],
        isPublished: false
      });

    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminOnly>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <FileQuestion className="h-8 w-8 text-primary" />
                  Create New Quiz
                </h1>
                <p className="text-muted-foreground">
                  Design an interactive quiz for your students
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button 
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <Globe className="h-4 w-4 mr-2" />
                Save & Publish
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quiz Settings */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Settings</CardTitle>
                  <CardDescription>Configure your quiz details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Quiz Title *</Label>
                    <Input
                      id="title"
                      value={quiz.title}
                      onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter quiz title..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={quiz.description}
                      onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this quiz covers..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={quiz.subject}
                      onChange={(e) => setQuiz(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., Current Affairs, Science..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={quiz.difficulty}
                      onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                        setQuiz(prev => ({ ...prev, difficulty: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="1"
                      max="180"
                      value={quiz.timeLimit}
                      onChange={(e) => setQuiz(prev => ({ 
                        ...prev, 
                        timeLimit: parseInt(e.target.value) || 30 
                      }))}
                    />
                  </div>

                  {/* Quiz Stats */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Questions</span>
                      <Badge variant="secondary">{quiz.questions.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Estimated Time</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.ceil(quiz.questions.length * 1.5)} min
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Questions */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Questions</CardTitle>
                      <CardDescription>Add and configure quiz questions</CardDescription>
                    </div>
                    <Button onClick={addQuestion}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {quiz.questions.length === 0 ? (
                    <div className="text-center py-12">
                      <FileQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start building your quiz by adding questions
                      </p>
                      <Button onClick={addQuestion}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Question
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {quiz.questions.map((question, index) => (
                        <Card key={question.id} className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Q{index + 1}</Badge>
                              <Badge className={getDifficultyColor(question.difficulty)}>
                                {question.difficulty}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteQuestion(question.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <Label>Question *</Label>
                              <Textarea
                                value={question.question}
                                onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                                placeholder="Enter your question..."
                                rows={2}
                              />
                            </div>

                            <div>
                              <Label>Answer Options *</Label>
                              <div className="space-y-2">
                                {question.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={question.correctAnswer === optionIndex}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          updateQuestion(question.id, { correctAnswer: optionIndex });
                                        }
                                      }}
                                    />
                                    <Input
                                      value={option}
                                      onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                      placeholder={`Option ${optionIndex + 1}...`}
                                      className="flex-1"
                                    />
                                    {question.correctAnswer === optionIndex && (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Label>Explanation *</Label>
                              <Textarea
                                value={question.explanation}
                                onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                                placeholder="Explain why this answer is correct..."
                                rows={2}
                              />
                            </div>

                            <div>
                              <Label>Difficulty</Label>
                              <Select
                                value={question.difficulty}
                                onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                                  updateQuestion(question.id, { difficulty: value })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tips */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Quiz Creation Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Clear Questions</h4>
                    <p className="text-sm text-muted-foreground">
                      Write clear, unambiguous questions that test specific knowledge
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Detailed Explanations</h4>
                    <p className="text-sm text-muted-foreground">
                      Provide explanations to help students learn from their mistakes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Balanced Difficulty</h4>
                    <p className="text-sm text-muted-foreground">
                      Mix easy, medium, and hard questions for comprehensive assessment
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Realistic Time Limits</h4>
                    <p className="text-sm text-muted-foreground">
                      Allow approximately 1-2 minutes per question
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminOnly>
  );
}

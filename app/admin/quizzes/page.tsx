'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit3, 
  Eye, 
  Download, 
  Trash2,
  FileQuestion,
  Calendar,
  Users,
  Globe,
  Lock
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getQuizzesForManagement, deleteQuiz } from '@/app/actions/content-management';

interface Quiz {
  id: string;
  title: string;
  description?: string;
  quiz_data: any;
  article_ids: string[];
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

export default function AdminQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const result = await getQuizzesForManagement();
      if (result.success) {
        setQuizzes(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load quizzes.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast({
        title: "Error",
        description: "Failed to load quizzes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteQuiz(quizId);
      if (result.success) {
        toast({
          title: "Quiz deleted",
          description: "The quiz has been deleted successfully.",
          variant: "default"
        });
        await loadQuizzes(); // Reload the list
      } else {
        toast({
          title: "Delete failed",
          description: result.error || "Failed to delete the quiz.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete the quiz.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadPDF = async (quizId: string) => {
    try {
      const response = await fetch(`/api/quizzes/${quizId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Find the quiz to get its title for filename
      const quiz = quizzes.find(q => q.id === quizId);
      const filename = quiz ? `${quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : `quiz_${quizId}.pdf`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Downloaded",
        description: "Quiz PDF has been downloaded successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Download failed",
        description: "Failed to download quiz PDF.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quizzes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quiz Management</h1>
          <p className="text-gray-600">Create, edit, and manage your quizzes</p>
        </div>
        <Button onClick={() => router.push('/admin/create-quiz')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Quiz
        </Button>
      </div>

      {/* Quizzes Grid */}
      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes yet</h3>
            <p className="text-gray-600 mb-4">Create your first quiz from articles</p>
            <Button onClick={() => router.push('/admin/create-quiz')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/admin/quizzes/${quiz.id}`)}
                      title="Edit Quiz"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`/quizzes/${quiz.id}`, '_blank')}
                      title="Preview Quiz"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadPDF(quiz.id)}
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      title="Delete Quiz"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileQuestion className="h-4 w-4" />
                      <span>{quiz.quiz_data?.questions?.length || 0} questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    {quiz.is_published ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Globe className="h-3 w-3 mr-1" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Lock className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/admin/quizzes/${quiz.id}`)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/quizzes/${quiz.id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPDF(quiz.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
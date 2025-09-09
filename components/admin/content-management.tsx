"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  Eye, 
  EyeOff, 
  Trash2, 
  Download,
  CheckCircle,
  XCircle,
  Globe,
  Lock,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import {
  getArticlesForManagement,
  getQuizzesForManagement,
  publishArticles,
  unpublishArticles,
  publishQuiz,
  unpublishQuiz,
  deleteQuiz,
  type ContentPublishingData,
  type QuizData
} from '@/app/actions/content-management';

export default function ContentManagement() {
  const { userProfile } = useAuth();
  
  // Articles state
  const [articles, setArticles] = useState<ContentPublishingData[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [articleFilters, setArticleFilters] = useState({
    search: '',
    source: 'all',
    dateFrom: '',
    dateTo: '',
    publishedOnly: undefined as boolean | undefined
  });
  
  // Quizzes state
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [quizFilters, setQuizFilters] = useState({
    search: '',
    publishedOnly: 'all' as string
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('articles');
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadArticles(), loadQuizzes()]);
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async () => {
    try {
      // Convert string filters to the expected types
      const filterData = {
        ...articleFilters,
        source: articleFilters.source === 'all' ? '' : articleFilters.source
      };
      const result = await getArticlesForManagement(filterData);
      if (result.success) {
        setArticles(result.data);
      } else {
        toast({
          title: "Error loading articles",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  };

  const loadQuizzes = async () => {
    try {
      // Convert string filters to the expected types
      const filterData = {
        search: quizFilters.search,
        publishedOnly: quizFilters.publishedOnly === 'all' ? undefined : quizFilters.publishedOnly === 'true'
      };
      const result = await getQuizzesForManagement(filterData);
      if (result.success) {
        setQuizzes(result.data);
      } else {
        toast({
          title: "Error loading quizzes",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
    }
  };

  const handleBulkPublish = async () => {
    if (selectedArticles.length === 0) {
      toast({
        title: "No articles selected",
        description: "Please select articles to publish",
        variant: "destructive"
      });
      return;
    }

    setBulkActionInProgress(true);
    try {
      const result = await publishArticles(selectedArticles, userProfile!.id);
      if (result.success) {
        toast({
          title: "Articles published",
          description: `${selectedArticles.length} articles have been published`
        });
        setSelectedArticles([]);
        await loadArticles();
      } else {
        toast({
          title: "Error publishing articles",
          description: result.error,
          variant: "destructive"
        });
      }
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const handleBulkUnpublish = async () => {
    if (selectedArticles.length === 0) {
      toast({
        title: "No articles selected",
        description: "Please select articles to unpublish",
        variant: "destructive"
      });
      return;
    }

    setBulkActionInProgress(true);
    try {
      const result = await unpublishArticles(selectedArticles);
      if (result.success) {
        toast({
          title: "Articles unpublished",
          description: `${selectedArticles.length} articles have been unpublished`
        });
        setSelectedArticles([]);
        await loadArticles();
      } else {
        toast({
          title: "Error unpublishing articles",
          description: result.error,
          variant: "destructive"
        });
      }
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const handleQuizPublish = async (quizId: string) => {
    try {
      const result = await publishQuiz(quizId, userProfile!.id);
      if (result.success) {
        toast({
          title: "Quiz published",
          description: "Quiz is now available to students"
        });
        await loadQuizzes();
      } else {
        toast({
          title: "Error publishing quiz",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error publishing quiz:', error);
    }
  };

  const handleQuizUnpublish = async (quizId: string) => {
    try {
      const result = await unpublishQuiz(quizId);
      if (result.success) {
        toast({
          title: "Quiz unpublished",
          description: "Quiz is no longer available to students"
        });
        await loadQuizzes();
      } else {
        toast({
          title: "Error unpublishing quiz",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error unpublishing quiz:', error);
    }
  };

  const handleQuizDelete = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteQuiz(quizId);
      if (result.success) {
        toast({
          title: "Quiz deleted",
          description: "Quiz has been permanently deleted"
        });
        await loadQuizzes();
      } else {
        toast({
          title: "Error deleting quiz",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  const handleSelectAllArticles = (checked: boolean) => {
    if (checked) {
      setSelectedArticles(articles.map(a => a.id));
    } else {
      setSelectedArticles([]);
    }
  };

  const handleSelectArticle = (articleId: string, checked: boolean) => {
    if (checked) {
      setSelectedArticles(prev => [...prev, articleId]);
    } else {
      setSelectedArticles(prev => prev.filter(id => id !== articleId));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">
            Manage and publish articles and quizzes for students
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Articles ({articles.length})
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Quizzes ({quizzes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Articles Management</CardTitle>
              <CardDescription>
                Manage which articles are visible to students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="article-search">Search</Label>
                  <Input
                    id="article-search"
                    placeholder="Search articles..."
                    value={articleFilters.search}
                    onChange={(e) => setArticleFilters({...articleFilters, search: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="source-filter">Source</Label>
                  <Select
                    value={articleFilters.source}
                    onValueChange={(value) => setArticleFilters({...articleFilters, source: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      <SelectItem value="Drishti IAS">Drishti IAS</SelectItem>
                      <SelectItem value="GKToday">GKToday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date-from">From Date</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={articleFilters.dateFrom}
                    onChange={(e) => setArticleFilters({...articleFilters, dateFrom: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="date-to">To Date</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={articleFilters.dateTo}
                    onChange={(e) => setArticleFilters({...articleFilters, dateTo: e.target.value})}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadArticles} className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedArticles.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedArticles.length} articles selected
                  </span>
                  <Button
                    onClick={handleBulkPublish}
                    disabled={bulkActionInProgress}
                    size="sm"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Publish Selected
                  </Button>
                  <Button
                    onClick={handleBulkUnpublish}
                    disabled={bulkActionInProgress}
                    variant="outline"
                    size="sm"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Unpublish Selected
                  </Button>
                </div>
              )}

              {/* Articles Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedArticles.length === articles.length && articles.length > 0}
                          onCheckedChange={handleSelectAllArticles}
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Published</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedArticles.includes(article.id)}
                            onCheckedChange={(checked) => handleSelectArticle(article.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="max-w-sm">
                            <div className="font-medium truncate">{article.title}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(article as any).source_name || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {article.is_published ? (
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
                        </TableCell>
                        <TableCell>
                          {format(new Date(article.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {article.published_at ? format(new Date(article.published_at), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Management</CardTitle>
              <CardDescription>
                Manage and publish quizzes for students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quiz Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quiz-search">Search</Label>
                  <Input
                    id="quiz-search"
                    placeholder="Search quizzes..."
                    value={quizFilters.search}
                    onChange={(e) => setQuizFilters({...quizFilters, search: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="quiz-status">Status</Label>
                  <Select
                    value={quizFilters.publishedOnly}
                    onValueChange={(value) => setQuizFilters({
                      ...quizFilters, 
                      publishedOnly: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All quizzes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All quizzes</SelectItem>
                      <SelectItem value="true">Published only</SelectItem>
                      <SelectItem value="false">Drafts only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadQuizzes} className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>

              {/* Quizzes Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quizzes.map((quiz) => (
                      <TableRow key={quiz.id}>
                        <TableCell>
                          <div className="max-w-sm">
                            <div className="font-medium truncate">{quiz.title}</div>
                            {quiz.description && (
                              <div className="text-sm text-muted-foreground truncate">
                                {quiz.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {quiz.quiz_data?.questions?.length || 0} questions
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          {format(new Date(quiz.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {quiz.is_published ? (
                              <Button
                                onClick={() => handleQuizUnpublish(quiz.id)}
                                variant="outline"
                                size="sm"
                              >
                                <EyeOff className="h-3 w-3 mr-1" />
                                Unpublish
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleQuizPublish(quiz.id)}
                                size="sm"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Publish
                              </Button>
                            )}
                            <Button
                              onClick={() => window.open(`/api/quizzes/${quiz.id}/download`, '_blank')}
                              variant="outline"
                              size="sm"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                            <Button
                              onClick={() => handleQuizDelete(quiz.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

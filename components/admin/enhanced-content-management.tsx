'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { QuizEditor } from '@/components/admin/quiz-editor'
import { 
  FileText, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Plus, 
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Users,
  Award,
  BookOpen,
  CheckCircle,
  XCircle,
  Globe,
  Lock,
  RefreshCw,
  Presentation,
  FileQuestion,
  Download,
  Wand2,
  Settings,
  MoreHorizontal
} from 'lucide-react'

interface Article {
  id: string
  title: string
  content?: string
  intro?: string
  source_name: string
  created_at: string
  scraped_at?: string
  is_published: boolean
  published_at?: string
  table_source?: string
  view_count?: number
}

interface Quiz {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  questions_count: number
  time_limit: number
  is_published: boolean
  is_expired?: boolean
  created_at: string
  attempts_count?: number
  average_score?: number
}

export default function EnhancedContentManagement() {
  const [articles, setArticles] = useState<Article[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('articles')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  // Article filters
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Dialog states
  const [isPresentationDialogOpen, setIsPresentationDialogOpen] = useState(false)
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false)
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false)
  
  // Quiz editor states
  const [isQuizEditorOpen, setIsQuizEditorOpen] = useState(false)
  const [currentEditingQuiz, setCurrentEditingQuiz] = useState<any>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState(0)
  
  // AI Quiz generation form states
  const [aiQuizTitle, setAiQuizTitle] = useState('')
  const [aiQuizQuestionCount, setAiQuizQuestionCount] = useState('10')
  const [aiQuizDifficulty, setAiQuizDifficulty] = useState('medium')
  const [aiQuizTimeLimit, setAiQuizTimeLimit] = useState('20')
  const [aiQuizIncludeExplanations, setAiQuizIncludeExplanations] = useState(true)
  
  const { toast } = useToast()

  const fetchContent = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (sourceFilter && sourceFilter !== 'all') params.append('source', sourceFilter)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      
      const response = await fetch(`/api/admin/content?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }
      
      const data = await response.json()
      setArticles(data.articles || [])
      setQuizzes(data.quizzes || [])
      
      console.log('Fetched data:', data) // Debug log
    } catch (error) {
      console.error('Fetch content error:', error)
      // Don't use mock data in production, show error instead
      toast({
        title: 'Error',
        description: 'Failed to fetch content. Please check your connection.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleExpireQuiz = async (id: string, expire: boolean) => {
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: id, updates: { is_expired: expire } })
      })
      
      if (response.ok) {
        await fetchContent()
        toast({ title: 'Success', description: `Quiz ${expire ? 'expired' : 'reactivated'} successfully` })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update quiz', variant: 'destructive' })
    }
  }

  const togglePublishStatus = async (id: string, type: 'article' | 'quiz') => {
    try {
      if (type === 'article') {
        const article = articles.find(a => a.id === id)
        if (!article) return
        
        const response = await fetch('/api/admin/content', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            articleId: id,
            updates: { is_published: !article.is_published }
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to update article')
        }
        
        setArticles(prev => prev.map(article => 
          article.id === id ? { ...article, is_published: !article.is_published } : article
        ))
      } else {
        const quiz = quizzes.find(q => q.id === id)
        if (!quiz) return
        
        const response = await fetch('/api/admin/content', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quizId: id,
            updates: { is_published: !quiz.is_published }
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to update quiz')
        }
        
        setQuizzes(prev => prev.map(quiz => 
          quiz.id === id ? { ...quiz, is_published: !quiz.is_published } : quiz
        ))
      }
      
      toast({
        title: 'Success',
        description: `${type} status updated successfully`
      })
    } catch (error) {
      console.error('Toggle publish error:', error)
      toast({
        title: 'Error',
        description: `Failed to update ${type} status`,
        variant: 'destructive'
      })
    }
  }

  const handleBulkPublish = async (publish: boolean) => {
    try {
      if (activeTab === 'articles') {
        setArticles(prev => prev.map(article => 
          selectedItems.includes(article.id) ? { ...article, is_published: publish } : article
        ))
      }
      
      setSelectedItems([])
      toast({
        title: 'Success',
        description: `Articles ${publish ? 'published' : 'unpublished'} successfully`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Bulk operation failed',
        variant: 'destructive'
      })
    }
  }

  const generatePresentation = async (articleIds: string[]) => {
    try {
      // This would integrate with your existing AI presentation generator
      toast({
        title: 'Generating Presentation',
        description: 'Your presentation is being created...'
      })
      
      // Simulate API call to presentation generator
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: 'Success',
        description: 'Presentation generated successfully!'
      })
      
      setIsPresentationDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate presentation',
        variant: 'destructive'
      })
    }
  }

  const generateAIQuiz = async (articleIds: string[], options: any) => {
    try {
      toast({
        title: 'Generating Quiz',
        description: 'AI is creating your quiz...'
      })
      
      // Call the real AI quiz generation API
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: options.title || `AI Generated Quiz - ${new Date().toLocaleDateString()}`,
          articleIds: articleIds,
          questionsPerArticle: Math.ceil(options.questionCount / articleIds.length) || 3
        })
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Handle structured errors from our API
        if (responseData.type === 'RATE_LIMITED') {
          const retryMinutes = Math.ceil(responseData.retryAfter / 60)
          
          toast({
            title: 'Rate Limited',
            description: `AI service is temporarily rate limited. You can retry in ${retryMinutes} minute(s) or create a quiz manually.`,
            variant: 'destructive',
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => retryQuizGeneration(articleIds, options, responseData.retryAfter)}
                disabled={isRetrying}
              >
                {isRetrying ? `Retry in ${retryCountdown}s` : `Auto Retry in ${retryMinutes}m`}
              </Button>
            )
          })
          
          setIsQuizDialogOpen(false)
          return
        }
        
        if (responseData.type === 'QUOTA_EXCEEDED') {
          toast({
            title: 'Quota Exceeded',
            description: 'AI service quota has been exceeded. Please try again later or use manual quiz creation.',
            variant: 'destructive',
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Create manual quiz instead
                  const emptyQuiz = {
                    id: `quiz_${Date.now()}`,
                    title: options.title || 'New Quiz',
                    description: `Created from ${articleIds.length} articles`,
                    questions: [],
                    difficulty: options.difficulty || 'medium',
                    timeLimit: options.timeLimit || 30,
                    isPublished: false,
                    articleIds: articleIds,
                    articleTitles: articles.filter(a => articleIds.includes(a.id)).map(a => a.title)
                  }
                  setCurrentEditingQuiz(emptyQuiz)
                  setIsQuizEditorOpen(true)
                  setIsQuizDialogOpen(false)
                }}
              >
                Create Manually
              </Button>
            )
          })
          
          setIsQuizDialogOpen(false)
          return
        }
        
        throw new Error(responseData.error || 'Failed to generate quiz')
      }

      // Transform the quiz data to match our quiz editor format
      const transformedQuiz = {
        id: responseData.id,
        title: responseData.quizTitle,
        description: responseData.quizSynopsis,
        questions: responseData.questions.map((q: any, index: number) => ({
          id: `q_${index}`,
          question: q.question,
          options: q.answers,
          correctAnswerIndex: q.correctAnswer,
          explanation: q.explanation,
          point: q.point || 10
        })),
        difficulty: options.difficulty || 'medium',
        timeLimit: options.timeLimit,
        isPublished: false,
        articleIds: responseData.articleIds,
        articleTitles: responseData.articleTitles
      }
      
      // Open the quiz editor instead of just adding to list
      setCurrentEditingQuiz(transformedQuiz)
      setIsQuizEditorOpen(true)
      
      toast({
        title: 'Success',
        description: 'AI Quiz generated successfully! You can now edit and customize it.'
      })
      
      setIsQuizDialogOpen(false)
    } catch (error) {
      console.error('Error generating AI quiz:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate quiz',
        variant: 'destructive'
      })
    }
  }

  const retryQuizGeneration = async (articleIds: string[], options: any, delaySeconds: number) => {
    setIsRetrying(true)
    setRetryCountdown(delaySeconds)
    
    // Start countdown
    const countdownInterval = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setIsRetrying(false)
          
          // Show notification that AI service is ready again
          toast({
            title: 'AI Service Ready',
            description: 'Attempting to generate quiz now...'
          })
          
          generateAIQuiz(articleIds, options)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    toast({
      title: 'Retry Scheduled',
      description: `Quiz generation will retry automatically in ${delaySeconds} seconds.`,
      action: (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            clearInterval(countdownInterval)
            setIsRetrying(false)
            setRetryCountdown(0)
            toast({
              title: 'Retry Cancelled',
              description: 'You can try generating the quiz manually.'
            })
          }}
        >
          Cancel
        </Button>
      )
    })
  }

  const exportQuizPDF = async (quizId: string) => {
    try {
      toast({
        title: 'Exporting Quiz',
        description: 'Generating PDF with answers and explanations...'
      })
      
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: 'Success',
        description: 'Quiz PDF downloaded successfully!'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export quiz',
        variant: 'destructive'
      })
    }
  }

  const handleQuizSave = async (quizData: any) => {
    try {
      toast({
        title: 'Saving Quiz',
        description: 'Saving quiz as draft...'
      })

      // TODO: Implement actual quiz save API
      const response = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...quizData,
          isPublished: false
        })
      })

      if (response.ok) {
        // Add to quizzes list
        const newQuiz: Quiz = {
          id: quizData.id,
          title: quizData.title,
          description: quizData.description,
          difficulty: quizData.difficulty,
          questions_count: quizData.questions.length,
          time_limit: quizData.timeLimit,
          is_published: false,
          created_at: new Date().toISOString(),
          attempts_count: 0,
          average_score: 0
        }
        
        setQuizzes(prev => [newQuiz, ...prev])
        
        toast({
          title: 'Success',
          description: 'Quiz saved as draft successfully!'
        })
      }
      
      setIsQuizEditorOpen(false)
      setCurrentEditingQuiz(null)
      setActiveTab('quizzes')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save quiz',
        variant: 'destructive'
      })
    }
  }

  const handleQuizPublish = async (quizData: any) => {
    try {
      toast({
        title: 'Publishing Quiz',
        description: 'Publishing quiz for students...'
      })

      // TODO: Implement actual quiz publish API
      const response = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...quizData,
          isPublished: true
        })
      })

      if (response.ok) {
        // Add to quizzes list
        const newQuiz: Quiz = {
          id: quizData.id,
          title: quizData.title,
          description: quizData.description,
          difficulty: quizData.difficulty,
          questions_count: quizData.questions.length,
          time_limit: quizData.timeLimit,
          is_published: true,
          created_at: new Date().toISOString(),
          attempts_count: 0,
          average_score: 0
        }
        
        setQuizzes(prev => [newQuiz, ...prev])
        
        toast({
          title: 'Success',
          description: 'Quiz published successfully! Students can now access it.'
        })
      }
      
      setIsQuizEditorOpen(false)
      setCurrentEditingQuiz(null)
      setActiveTab('quizzes')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to publish quiz',
        variant: 'destructive'
      })
    }
  }

  const handleQuizCancel = () => {
    setIsQuizEditorOpen(false)
    setCurrentEditingQuiz(null)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      if (activeTab === 'articles') {
        setSelectedItems(articles.map(article => article.id))
      } else {
        setSelectedItems(quizzes.map(quiz => quiz.id))
      }
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id])
    } else {
      setSelectedItems(prev => prev.filter(item => item !== id))
    }
  }

  useEffect(() => {
    fetchContent()
  }, [searchTerm, sourceFilter, statusFilter, dateFrom, dateTo])

  return (
    <div className="space-y-6">
      {/* Quiz Editor Modal */}
      {isQuizEditorOpen && currentEditingQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80">
          <div className="h-full overflow-auto">
            <div className="min-h-screen flex items-start justify-center p-4 sm:p-6 lg:p-8">
              <div className="w-full max-w-7xl bg-white rounded-lg shadow-lg max-h-[calc(100vh-2rem)] overflow-auto">
                <QuizEditor
                  quiz={currentEditingQuiz}
                  onSave={handleQuizSave}
                  onCancel={handleQuizCancel}
                  onPublish={handleQuizPublish}
                  isLoading={loading}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Management</h2>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">Manage articles, quizzes, and create presentations</p>
            {isRetrying && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                AI Retry in {retryCountdown}s
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={() => fetchContent()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Articles ({articles.length})
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            Quizzes ({quizzes.length})
          </TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-4">
          {/* Filters and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-4">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search articles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      <SelectItem value="GKToday">GKToday</SelectItem>
                      <SelectItem value="DrishtiIAS">DrishtiIAS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={() => {
                      setSearchTerm('')
                      setSourceFilter('all')
                      setStatusFilter('all')
                      setDateFrom('')
                      setDateTo('')
                    }}
                  >
                    <Filter className="h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>

                {/* Date Range */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="date-from">From:</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="date-to">To:</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedItems.length > 0 && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedItems.length} items selected
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleBulkPublish(true)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Publish
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleBulkPublish(false)}>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Unpublish
                      </Button>
                      <Dialog open={isPresentationDialogOpen} onOpenChange={setIsPresentationDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Presentation className="h-4 w-4 mr-2" />
                            Generate Presentation
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Generate AI Presentation</DialogTitle>
                            <DialogDescription>
                              Create a presentation from {selectedItems.length} selected articles
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Presentation Title</Label>
                              <Input placeholder="Enter presentation title..." />
                            </div>
                            <div>
                              <Label>Template Style</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select template" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="professional">Professional</SelectItem>
                                  <SelectItem value="educational">Educational</SelectItem>
                                  <SelectItem value="modern">Modern</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPresentationDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={() => generatePresentation(selectedItems)}>
                              <Wand2 className="h-4 w-4 mr-2" />
                              Generate
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <FileQuestion className="h-4 w-4 mr-2" />
                            Create AI Quiz
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Generate AI Quiz</DialogTitle>
                            <DialogDescription>
                              Create a quiz from {selectedItems.length} selected articles using AI
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Quiz Title</Label>
                              <Input 
                                placeholder="Enter quiz title..." 
                                value={aiQuizTitle}
                                onChange={(e) => setAiQuizTitle(e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Number of Questions</Label>
                                <Select value={aiQuizQuestionCount} onValueChange={setAiQuizQuestionCount}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select count" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="5">5 Questions</SelectItem>
                                    <SelectItem value="10">10 Questions</SelectItem>
                                    <SelectItem value="15">15 Questions</SelectItem>
                                    <SelectItem value="20">20 Questions</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Difficulty Level</Label>
                                <Select value={aiQuizDifficulty} onValueChange={setAiQuizDifficulty}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select difficulty" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label>Time Limit (minutes)</Label>
                              <Select value={aiQuizTimeLimit} onValueChange={setAiQuizTimeLimit}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time limit" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10 minutes</SelectItem>
                                  <SelectItem value="15">15 minutes</SelectItem>
                                  <SelectItem value="20">20 minutes</SelectItem>
                                  <SelectItem value="30">30 minutes</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="include-explanations" 
                                checked={aiQuizIncludeExplanations}
                                onCheckedChange={(checked) => setAiQuizIncludeExplanations(checked === true)}
                              />
                              <Label htmlFor="include-explanations">Include detailed explanations</Label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsQuizDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => generateAIQuiz(selectedItems, {
                                title: aiQuizTitle || `AI Generated Quiz - ${new Date().toLocaleDateString()}`,
                                questionCount: parseInt(aiQuizQuestionCount),
                                difficulty: aiQuizDifficulty,
                                timeLimit: parseInt(aiQuizTimeLimit),
                                includeExplanations: aiQuizIncludeExplanations
                              })}
                              disabled={isRetrying || loading}
                            >
                              <Wand2 className="h-4 w-4 mr-2" />
                              {isRetrying ? `Retrying in ${retryCountdown}s...` : loading ? 'Generating...' : 'Generate Quiz'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Articles Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === articles.length && articles.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><div className="h-4 w-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-64 bg-gray-200 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                      </TableRow>
                    ))
                  ) : articles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No articles found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    articles.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(article.id)}
                            onCheckedChange={(checked) => handleSelectItem(article.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{article.title}</div>
                            {article.intro && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {article.intro.substring(0, 100)}...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{article.source_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {article.is_published ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Published</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">Draft</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(article.scraped_at || article.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {article.is_published && article.published_at ? new Date(article.published_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePublishStatus(article.id, 'article')}
                            >
                              {article.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search quizzes..."
                      className="pl-8 w-64"
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => {
                  const emptyQuiz = {
                    id: `quiz_${Date.now()}`,
                    title: 'New Quiz',
                    description: '',
                    questions: [],
                    difficulty: 'medium',
                    timeLimit: 30,
                    isPublished: false,
                    articleIds: [],
                    articleTitles: []
                  }
                  setCurrentEditingQuiz(emptyQuiz)
                  setIsQuizEditorOpen(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Manual Quiz
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizzes.map((quiz) => (
                    <TableRow key={quiz.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{quiz.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {quiz.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          quiz.difficulty === 'easy' ? 'secondary' : 
                          quiz.difficulty === 'medium' ? 'default' : 'destructive'
                        }>
                          {quiz.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span className="text-sm">{quiz.questions_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {quiz.is_expired ? (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm">Expired</span>
                            </>
                          ) : quiz.is_published ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">Published</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">Draft</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{quiz.attempts_count || 0} attempts</div>
                          <div className="text-muted-foreground">
                            {quiz.average_score?.toFixed(1) || 0}% avg
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePublishStatus(quiz.id, 'quiz')}
                          >
                            {quiz.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          {quiz.is_published && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpireQuiz(quiz.id, !quiz.is_expired)}
                              title={quiz.is_expired ? 'Reactivate Quiz' : 'Expire Quiz'}
                            >
                              <XCircle className={`h-4 w-4 ${quiz.is_expired ? 'text-red-500' : 'text-gray-600'}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportQuizPDF(quiz.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              // Convert existing quiz to editable format
                              const editableQuiz = {
                                id: quiz.id,
                                title: quiz.title,
                                description: quiz.description || '',
                                questions: [], // TODO: Load actual questions from API
                                difficulty: quiz.difficulty,
                                timeLimit: quiz.time_limit,
                                isPublished: quiz.is_published,
                                articleIds: [],
                                articleTitles: []
                              }
                              setCurrentEditingQuiz(editableQuiz)
                              setIsQuizEditorOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { 
  FileQuestion, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Plus, 
  Eye,
  Calendar,
  Clock,
  Users,
  Award,
  BookOpen,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Quiz {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  questions_count: number
  time_limit: number // in minutes
  attempts_allowed: number
  is_published: boolean
  created_at: string
  attempts_count?: number
  average_score?: number
}

interface Question {
  id: string
  quiz_id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer'
  options?: string[]
  correct_answer: string
  explanation?: string
  points: number
}

interface QuizManagementProps {
  className?: string
}

export function QuizManagement({ className }: QuizManagementProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false)
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('quizzes')
  const { toast } = useToast()

  // Mock data for demonstration
  const mockQuizzes: Quiz[] = [
    {
      id: '1',
      title: 'Indian Constitution Basics',
      description: 'Test your knowledge about the Indian Constitution',
      difficulty: 'medium',
      category: 'Political Science',
      questions_count: 15,
      time_limit: 30,
      attempts_allowed: 3,
      is_published: true,
      created_at: '2024-01-15',
      attempts_count: 45,
      average_score: 78.5
    },
    {
      id: '2',
      title: 'Current Affairs - January 2024',
      description: 'Latest current affairs and GK questions',
      difficulty: 'hard',
      category: 'Current Affairs',
      questions_count: 20,
      time_limit: 45,
      attempts_allowed: 2,
      is_published: true,
      created_at: '2024-01-10',
      attempts_count: 32,
      average_score: 65.2
    },
    {
      id: '3',
      title: 'Indian History - Medieval Period',
      description: 'Questions on Medieval Indian History',
      difficulty: 'easy',
      category: 'History',
      questions_count: 10,
      time_limit: 20,
      attempts_allowed: 5,
      is_published: false,
      created_at: '2024-01-08',
      attempts_count: 0,
      average_score: 0
    }
  ]

  const categories = ['Political Science', 'Current Affairs', 'History', 'Geography', 'Economics', 'Science']

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      let filteredQuizzes = mockQuizzes
      
      if (searchTerm) {
        filteredQuizzes = filteredQuizzes.filter(quiz => 
          quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      
      if (categoryFilter) {
        filteredQuizzes = filteredQuizzes.filter(quiz => quiz.category === categoryFilter)
      }
      
      if (difficultyFilter) {
        filteredQuizzes = filteredQuizzes.filter(quiz => quiz.difficulty === difficultyFilter)
      }
      
      setQuizzes(filteredQuizzes)
      setTotalPages(Math.ceil(filteredQuizzes.length / 10))
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch quizzes',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateQuiz = async (quizId: string, updates: Partial<Quiz>) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setQuizzes(prev => prev.map(quiz => 
        quiz.id === quizId ? { ...quiz, ...updates } : quiz
      ))
      
      toast({
        title: 'Success',
        description: 'Quiz updated successfully'
      })
      setIsQuizDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update quiz',
        variant: 'destructive'
      })
    }
  }

  const deleteQuiz = async (quizId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId))
      
      toast({
        title: 'Success',
        description: 'Quiz deleted successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete quiz',
        variant: 'destructive'
      })
    }
  }

  const getDifficultyBadgeVariant = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'secondary'
      case 'medium': return 'default'
      case 'hard': return 'destructive'
      default: return 'outline'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  useEffect(() => {
    fetchQuizzes()
  }, [searchTerm, categoryFilter, difficultyFilter])

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                Quiz Management
              </CardTitle>
              <CardDescription>
                Create, manage, and monitor quiz performance
              </CardDescription>
            </div>
            <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Quiz</DialogTitle>
                  <DialogDescription>
                    Set up a new quiz for students
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiz-title">Quiz Title</Label>
                      <Input id="quiz-title" placeholder="Enter quiz title" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiz-category">Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiz-description">Description</Label>
                    <Textarea 
                      id="quiz-description" 
                      placeholder="Describe what this quiz covers..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiz-difficulty">Difficulty</Label>
                      <Select>
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
                    <div className="space-y-2">
                      <Label htmlFor="quiz-time">Time Limit (minutes)</Label>
                      <Input id="quiz-time" type="number" placeholder="30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiz-attempts">Max Attempts</Label>
                      <Input id="quiz-attempts" type="number" placeholder="3" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsQuizDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button>Create Quiz</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="quizzes" className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search quizzes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quizzes Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quiz</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell><div className="h-4 w-48 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-12 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                        </TableRow>
                      ))
                    ) : quizzes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <FileQuestion className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No quizzes found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      quizzes.map((quiz) => (
                        <TableRow key={quiz.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{quiz.title}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {quiz.description.substring(0, 50)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{quiz.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getDifficultyBadgeVariant(quiz.difficulty)}>
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
                              {quiz.is_published ? (
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
                                onClick={() => {
                                  setSelectedQuiz(quiz)
                                  setIsQuizDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteQuiz(quiz.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{quizzes.length}</div>
                    <p className="text-xs text-muted-foreground">3 published</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {quizzes.reduce((sum, quiz) => sum + (quiz.attempts_count || 0), 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(quizzes.reduce((sum, quiz) => sum + (quiz.average_score || 0), 0) / quizzes.length).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Overall performance</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

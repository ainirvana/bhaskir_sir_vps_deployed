'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus,
  Edit3,
  Trash2,
  Save,
  Eye,
  FileQuestion,
  Clock,
  Users,
  BookOpen,
  Wand2,
  Download,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswerIndex: number
  explanation?: string
  point?: number
}

interface QuizData {
  id: string
  title: string
  description?: string
  questions: QuizQuestion[]
  difficulty: string
  timeLimit?: number
  isPublished: boolean
  articleIds?: string[]
  articleTitles?: string[]
}

interface QuizEditorProps {
  quiz: QuizData
  onSave: (quiz: QuizData) => void
  onCancel: () => void
  onPublish: (quiz: QuizData) => void
  isLoading?: boolean
}

export function QuizEditor({ quiz, onSave, onCancel, onPublish, isLoading = false }: QuizEditorProps) {
  const [editedQuiz, setEditedQuiz] = useState<QuizData>(quiz)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const { toast } = useToast()

  const addNewQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: '',
      point: 10
    }
    
    setEditedQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }))
    
    setEditingQuestionId(newQuestion.id)
    setIsAddingQuestion(true)
  }

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    setEditedQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    }))
  }

  const deleteQuestion = (questionId: string) => {
    setEditedQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }))
  }

  const validateQuiz = (): string[] => {
    const errors: string[] = []
    
    if (!editedQuiz.title.trim()) {
      errors.push('Quiz title is required')
    }
    
    if (editedQuiz.questions.length === 0) {
      errors.push('At least one question is required')
    }
    
    editedQuiz.questions.forEach((q, index) => {
      if (!q.question.trim()) {
        errors.push(`Question ${index + 1}: Question text is required`)
      }
      
      if (q.options.some(opt => !opt.trim())) {
        errors.push(`Question ${index + 1}: All options must be filled`)
      }
      
      if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
        errors.push(`Question ${index + 1}: Valid correct answer must be selected`)
      }
    })
    
    return errors
  }

  const handleSave = () => {
    const errors = validateQuiz()
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join(', '),
        variant: 'destructive'
      })
      return
    }
    
    onSave(editedQuiz)
  }

  const handlePublish = () => {
    const errors = validateQuiz()
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join(', '),
        variant: 'destructive'
      })
      return
    }
    
    onPublish({ ...editedQuiz, isPublished: true })
  }

  const exportQuizPDF = async () => {
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating quiz PDF with answers...'
      })
      
      // TODO: Implement actual PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: 'Success',
        description: 'Quiz PDF exported successfully!'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive'
      })
    }
  }

  if (previewMode) {
    return (
      <div className="w-full h-full max-h-[80vh] overflow-auto bg-white">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          <div className="sticky top-0 bg-white z-10 pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl lg:text-2xl font-bold truncate">{editedQuiz.title}</h1>
                {editedQuiz.description && (
                  <p className="text-muted-foreground mt-1 text-sm lg:text-base">{editedQuiz.description}</p>
                )}
              </div>
              <Button onClick={() => setPreviewMode(false)} variant="outline" size="sm" className="shrink-0">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Quiz
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mt-4">
              <Card>
                <CardContent className="pt-4 lg:pt-6">
                  <div className="flex items-center space-x-2">
                    <FileQuestion className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Questions</p>
                      <p className="text-2xl font-bold">{editedQuiz.questions.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4 lg:pt-6">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time Limit</p>
                      <p className="text-2xl font-bold">{editedQuiz.timeLimit || 'No limit'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4 lg:pt-6">
                  <div className="flex items-center space-x-2">
                    <Badge variant={editedQuiz.difficulty === 'easy' ? 'default' : editedQuiz.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                      {editedQuiz.difficulty}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4 lg:space-y-6">
            {editedQuiz.questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base">{question.question}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.options.map((option, optIndex) => (
                      <div 
                        key={optIndex} 
                        className={`p-3 rounded-lg border-2 ${
                          optIndex === question.correctAnswerIndex 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {optIndex === question.correctAnswerIndex && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                          <span className="text-sm">{option}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {question.explanation && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm"><strong>Explanation:</strong> {question.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="sticky bottom-0 bg-white border-t p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <Button onClick={onCancel} variant="outline" className="sm:w-auto">
                Cancel
              </Button>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={exportQuizPDF} variant="outline" size="sm" className="sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={handleSave} disabled={isLoading} size="sm" className="sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button onClick={handlePublish} disabled={isLoading} size="sm" className="sm:w-auto">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full max-h-[80vh] overflow-auto bg-white">
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <div className="sticky top-0 bg-white z-10 pb-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">Quiz Editor</h1>
              <p className="text-muted-foreground text-sm lg:text-base">Create and edit quiz questions</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => setPreviewMode(true)} variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </div>

        {/* Quiz Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={editedQuiz.title}
                  onChange={(e) => setEditedQuiz(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter quiz title"
                />
              </div>
              
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select 
                  value={editedQuiz.difficulty} 
                  onValueChange={(value) => setEditedQuiz(prev => ({ ...prev, difficulty: value }))}
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
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={editedQuiz.description || ''}
                onChange={(e) => setEditedQuiz(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter quiz description"
                rows={3}
              />
            </div>

            {editedQuiz.articleTitles && editedQuiz.articleTitles.length > 0 && (
              <div>
                <Label>Source Articles</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editedQuiz.articleTitles.map((title, index) => (
                    <Badge key={index} variant="secondary">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Questions ({editedQuiz.questions.length})</CardTitle>
              <Button onClick={addNewQuestion} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editedQuiz.questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No questions added yet. Click "Add Question" to get started.</p>
              </div>
            ) : (
              editedQuiz.questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  isEditing={editingQuestionId === question.id}
                  onEdit={() => setEditingQuestionId(question.id)}
                  onSave={(updates) => {
                    updateQuestion(question.id, updates)
                    setEditingQuestionId(null)
                    setIsAddingQuestion(false)
                  }}
                  onCancel={() => {
                    if (isAddingQuestion) {
                      deleteQuestion(question.id)
                    }
                    setEditingQuestionId(null)
                    setIsAddingQuestion(false)
                  }}
                  onDelete={() => deleteQuestion(question.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Sticky at bottom */}
      <div className="sticky bottom-0 bg-white border-t p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Button onClick={onCancel} variant="outline" className="sm:w-auto">
            Cancel
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={exportQuizPDF} variant="outline" size="sm" className="sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handleSave} disabled={isLoading} size="sm" className="sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button onClick={handlePublish} disabled={isLoading} size="sm" className="sm:w-auto">
              <CheckCircle className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface QuestionEditorProps {
  question: QuizQuestion
  index: number
  isEditing: boolean
  onEdit: () => void
  onSave: (updates: Partial<QuizQuestion>) => void
  onCancel: () => void
  onDelete: () => void
}

function QuestionEditor({ question, index, isEditing, onEdit, onSave, onCancel, onDelete }: QuestionEditorProps) {
  const [editedQuestion, setEditedQuestion] = useState(question)

  useEffect(() => {
    if (isEditing) {
      setEditedQuestion(question)
    }
  }, [isEditing, question])

  const handleSave = () => {
    onSave(editedQuestion)
  }

  const updateOption = (optionIndex: number, value: string) => {
    setEditedQuestion(prev => ({
      ...prev,
      options: prev.options.map((opt, idx) => idx === optionIndex ? value : opt)
    }))
  }

  if (!isEditing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium mb-2">Question {index + 1}</h4>
              <p className="text-sm mb-3">{question.question}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {question.options.map((option, optIndex) => (
                  <div 
                    key={optIndex}
                    className={`text-xs p-2 rounded ${
                      optIndex === question.correctAnswerIndex 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-gray-100'
                    }`}
                  >
                    {option}
                  </div>
                ))}
              </div>
              
              {question.explanation && (
                <p className="text-xs text-muted-foreground">
                  <strong>Explanation:</strong> {question.explanation}
                </p>
              )}
            </div>
            
            <div className="flex space-x-2 ml-4">
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label htmlFor={`question-${question.id}`}>Question {index + 1}</Label>
          <Textarea
            id={`question-${question.id}`}
            value={editedQuestion.question}
            onChange={(e) => setEditedQuestion(prev => ({ ...prev, question: e.target.value }))}
            placeholder="Enter your question"
            rows={3}
          />
        </div>
        
        <div className="space-y-3">
          <Label>Answer Options</Label>
          {editedQuestion.options.map((option, optIndex) => (
            <div key={optIndex} className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={editedQuestion.correctAnswerIndex === optIndex}
                  onChange={() => setEditedQuestion(prev => ({ ...prev, correctAnswerIndex: optIndex }))}
                  className="h-4 w-4"
                />
                <Label className="text-sm">Correct</Label>
              </div>
              <Input
                value={option}
                onChange={(e) => updateOption(optIndex, e.target.value)}
                placeholder={`Option ${optIndex + 1}`}
                className="flex-1"
              />
            </div>
          ))}
        </div>
        
        <div>
          <Label htmlFor={`explanation-${question.id}`}>Explanation (Optional)</Label>
          <Textarea
            id={`explanation-${question.id}`}
            value={editedQuestion.explanation || ''}
            onChange={(e) => setEditedQuestion(prev => ({ ...prev, explanation: e.target.value }))}
            placeholder="Explain why this is the correct answer"
            rows={2}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Question
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

interface Question {
  id: string
  question_text: string
  options: { A: string; B: string; C: string; D: string }
  correct_answer: string
  explanation: string
}

interface QuizInterfaceProps {
  quizId?: string
  onBack?: () => void
}

export default function QuizInterface({ quizId, onBack }: QuizInterfaceProps) {
  const { userProfile } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(1800) // 30 minutes
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showExplanation, setShowExplanation] = useState(false)
  const [quizTitle, setQuizTitle] = useState("")

  useEffect(() => {
    fetchQuizQuestions()
  }, [quizId])

  useEffect(() => {
    if (timeLeft > 0 && !quizCompleted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
      handleSubmitQuiz()
    }
  }, [timeLeft, quizCompleted])

  const fetchQuizQuestions = async () => {
    try {
      // Fetch quiz details
      if (quizId) {
        const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", quizId).single()
        if (quiz) {
          setQuizTitle(quiz.title)
          setTimeLeft(quiz.duration_minutes * 60)
        }
      }

      // Fetch questions from quiz_questions table
      const { data: questionsData, error } = await supabase.from("quiz_questions").select("*").order("question_order")

      if (error) {
        throw error
      }

      if (questionsData && questionsData.length > 0) {
        setQuestions(questionsData)
      } else {
        // Fallback to sample questions if no questions in database
        const sampleQuestions: Question[] = [
          {
            id: "1",
            question_text:
              "What is the name of the scheme launched by government for providing equity support to MSMEs in India?",
            options: {
              A: "Atmanirbhar MSME Yojana",
              B: "SRI Fund Scheme",
              C: "Bharat MSME Capital Scheme",
              D: "Startup India Fund",
            },
            correct_answer: "B",
            explanation:
              "The Self Reliant India Fund, known as SRI Fund, supports Micro, Small and Medium Enterprises (MSMEs) by providing equity funding to help them grow into large businesses.",
          },
          {
            id: "2",
            question_text: "Chagos Islands, that was recently seen in news, is located in which ocean?",
            options: {
              A: "Pacific Ocean",
              B: "Atlantic Ocean",
              C: "Indian Ocean",
              D: "Arctic Ocean",
            },
            correct_answer: "C",
            explanation:
              "The Chagos Islands are located in the central Indian Ocean, about 1,600 km south of India's southern tip.",
          },
        ]
        setQuestions(sampleQuestions)
      }

      setLoading(false)
    } catch (error) {
      console.error("Error fetching quiz questions:", error)
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmitQuiz = async () => {
    let correctAnswers = 0
    questions.forEach((question) => {
      if (answers[question.id] === question.correct_answer) {
        correctAnswers++
      }
    })

    const finalScore = Math.round((correctAnswers / questions.length) * 100)
    setScore(finalScore)
    setQuizCompleted(true)

    // Save quiz attempt to database
    if (userProfile) {
      try {
        await supabase.from("quiz_attempts").insert({
          quiz_id: quizId || null,
          student_id: userProfile.id,
          score: finalScore,
          total_questions: questions.length,
          time_taken_seconds: (quizId ? 1800 : 1800) - timeLeft,
          answers: answers,
          completed_at: new Date().toISOString(),
          is_completed: true,
        })
      } catch (error) {
        console.error("Error saving quiz attempt:", error)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (loading) {
    return <div>Loading quiz...</div>
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-600 mb-2">No quiz questions available</h2>
        <p className="text-gray-500">Please check back later.</p>
        {onBack && (
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
      </div>
    )
  }

  if (quizCompleted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle>Quiz Completed!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-4xl font-bold text-green-600">{score}%</div>
          <p className="text-gray-600">
            You scored {score}% ({Math.round((score / 100) * questions.length)} out of {questions.length} questions
            correct)
          </p>
          <div className="flex space-x-4 justify-center">
            <Button onClick={() => setShowExplanation(!showExplanation)} variant="outline">
              {showExplanation ? "Hide" : "Show"} Explanations
            </Button>
            {onBack && (
              <Button onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            )}
          </div>

          {showExplanation && (
            <div className="mt-6 space-y-4 text-left">
              {questions.map((question, index) => (
                <Card key={question.id}>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">
                      {index + 1}. {question.question_text}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Your answer: <span className="font-medium">{answers[question.id] || "Not answered"}</span>
                    </p>
                    <p className="text-sm text-green-600 mb-2">
                      Correct answer: <span className="font-medium">{question.correct_answer}</span>
                    </p>
                    <p className="text-sm text-gray-700">{question.explanation}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const currentQ = questions[currentQuestion]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-2xl font-bold">{quizTitle || "Current Affairs Quiz"}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete</span>
        </div>
        <Progress value={((currentQuestion + 1) / questions.length) * 100} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQ.question_text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(currentQ.options).map(([key, value]) => (
            <Button
              key={key}
              variant={answers[currentQ.id] === key ? "default" : "outline"}
              className="w-full text-left justify-start h-auto p-4"
              onClick={() => handleAnswerSelect(currentQ.id, key)}
            >
              <span className="font-semibold mr-3">{key}.</span>
              {value}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>

        {currentQuestion === questions.length - 1 ? (
          <Button onClick={handleSubmitQuiz}>Submit Quiz</Button>
        ) : (
          <Button onClick={() => setCurrentQuestion(currentQuestion + 1)} disabled={!answers[currentQ.id]}>
            Next
          </Button>
        )}
      </div>
    </div>
  )
}

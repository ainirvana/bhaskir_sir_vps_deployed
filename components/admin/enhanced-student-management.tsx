"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import {
  UserPlus,
  Copy,
  Trash2,
  Users,
  RotateCcw,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  addStudentInvitation,
  deleteStudentInvitation,
  updatePasswordResetRequest,
  regenerateInviteCode,
} from "@/app/actions/student-actions"

interface StudentInvitation {
  id: string
  email: string
  invite_code: string
  student_id: string
  full_name: string
  is_registered: boolean
  password_reset_requested: boolean
  created_at: string
}

interface Student {
  id: string
  email: string
  full_name: string
  student_id: string
  created_at: string
}

interface NewlyCreatedInvitation {
  id: string
  email: string
  invite_code: string
  student_id: string
  full_name: string
}

export default function EnhancedStudentManagement() {
  const { userProfile, resetPassword } = useAuth()
  const [invitations, setInvitations] = useState<StudentInvitation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [newlyCreatedInvitation, setNewlyCreatedInvitation] = useState<NewlyCreatedInvitation | null>(null)
  const [showCodes, setShowCodes] = useState<Record<string, boolean>>({})

  // Form state
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [studentId, setStudentId] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [invitationsResult, studentsResult] = await Promise.all([
        supabase.from("student_invitations").select("*").order("created_at", { ascending: false }),
        supabase.from("users").select("*").eq("role", "student").order("created_at", { ascending: false }),
      ])

      setInvitations(invitationsResult.data || [])
      setStudents(studentsResult.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!userProfile?.id) {
      toast({
        title: "Error",
        description: "User profile not found. Please log in again.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const result = await addStudentInvitation({
        email: email.trim(),
        fullName: fullName.trim(),
        studentId: studentId.trim(),
        invitedBy: userProfile.id,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // Set the newly created invitation for display
      setNewlyCreatedInvitation({
        id: result.invitation.id,
        email: result.invitation.email,
        invite_code: result.inviteCode,
        student_id: result.invitation.student_id,
        full_name: result.invitation.full_name,
      })

      // Reset form
      setEmail("")
      setFullName("")
      setStudentId("")
      setIsAddDialogOpen(false)
      setShowSuccessDialog(true)

      // Refresh data
      fetchData()

      toast({
        title: "Student added successfully!",
        description: `Invitation created with code: ${result.inviteCode}`,
      })
    } catch (error: any) {
      console.error("Error adding student:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add student. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyInviteCode = (code: string, studentName: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied!",
      description: `Invite code for ${studentName} copied to clipboard`,
    })
  }

  const copyInviteDetails = (invitation: StudentInvitation | NewlyCreatedInvitation) => {
    const details = `Student Registration Details:
Name: ${invitation.full_name}
Email: ${invitation.email}
Student ID: ${invitation.student_id}
Invite Code: ${invitation.invite_code}

Instructions:
1. Go to the student registration page
2. Enter your email: ${invitation.email}
3. Enter the 6-digit code: ${invitation.invite_code}
4. Create your password
5. Start learning!`

    navigator.clipboard.writeText(details)
    toast({
      title: "Complete details copied!",
      description: "All registration information copied to clipboard",
    })
  }

  const deleteInvitation = async (id: string) => {
    try {
      const result = await deleteStudentInvitation(id)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Student invitation deleted",
        description: "The invitation has been removed",
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handlePasswordReset = async (email: string, invitationId: string) => {
    try {
      // Send password reset email
      await resetPassword(email)

      // Mark as password reset requested
      const result = await updatePasswordResetRequest(invitationId)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Password reset email sent",
        description: `Password reset instructions sent to ${email}`,
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleRegenerateCode = async (invitationId: string, studentName: string) => {
    try {
      const result = await regenerateInviteCode(invitationId)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "New code generated",
        description: `New invite code for ${studentName}: ${result.newInviteCode}`,
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const toggleShowCode = (invitationId: string) => {
    setShowCodes((prev) => ({
      ...prev,
      [invitationId]: !prev[invitationId],
    }))
  }

  if (loading) {
    return <div>Loading student management...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Student Management</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="studentId">Student ID</Label>
                <Input id="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!email.trim() || !fullName.trim() || !studentId.trim() || isSubmitting}
              >
                {isSubmitting ? "Adding Student..." : "Add Student & Generate Code"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Dialog for New Invitation */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              Student Added Successfully!
            </DialogTitle>
          </DialogHeader>
          {newlyCreatedInvitation && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Share these details with the student:</strong>
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div>
                  <strong>Name:</strong> {newlyCreatedInvitation.full_name}
                </div>
                <div>
                  <strong>Email:</strong> {newlyCreatedInvitation.email}
                </div>
                <div>
                  <strong>Student ID:</strong> {newlyCreatedInvitation.student_id}
                </div>
                <div className="flex items-center space-x-2">
                  <strong>Invite Code:</strong>
                  <code className="bg-blue-100 px-3 py-1 rounded text-lg font-mono text-blue-800">
                    {newlyCreatedInvitation.invite_code}
                  </code>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => copyInviteCode(newlyCreatedInvitation.invite_code, newlyCreatedInvitation.full_name)}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
                <Button onClick={() => copyInviteDetails(newlyCreatedInvitation)} className="flex-1">
                  Copy All Details
                </Button>
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <strong>Instructions for student:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Go to the student registration page</li>
                  <li>Enter email: {newlyCreatedInvitation.email}</li>
                  <li>Enter the 6-digit code: {newlyCreatedInvitation.invite_code}</li>
                  <li>Create a password</li>
                  <li>Start learning!</li>
                </ol>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Student Invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No student invitations yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invitation.full_name}</div>
                          <div className="text-sm text-gray-500">{invitation.email}</div>
                          <div className="text-xs text-gray-400">ID: {invitation.student_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {showCodes[invitation.id] ? invitation.invite_code : "••••••"}
                          </code>
                          <Button size="sm" variant="ghost" onClick={() => toggleShowCode(invitation.id)}>
                            {showCodes[invitation.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyInviteCode(invitation.invite_code, invitation.full_name)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invitation.is_registered ? "default" : "secondary"}>
                          {invitation.is_registered ? "Registered" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {invitation.is_registered ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePasswordReset(invitation.email, invitation.id)}
                              title="Send password reset"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRegenerateCode(invitation.id, invitation.full_name)}
                                title="Generate new code"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyInviteDetails(invitation)}
                                title="Copy all details"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteInvitation(invitation.id)}
                                title="Delete invitation"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Active Students ({students.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No registered students yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.full_name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">How to Share Invitation Codes</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="space-y-2">
            <p>
              <strong>Option 1:</strong> Copy just the 6-digit code using the copy button
            </p>
            <p>
              <strong>Option 2:</strong> Copy all details including instructions for the student
            </p>
            <p>
              <strong>Option 3:</strong> Regenerate a new code if the original is lost
            </p>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="font-medium">Student Registration Process:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Student goes to registration page</li>
              <li>Enters their email address</li>
              <li>Enters the 6-digit invite code</li>
              <li>Creates their password</li>
              <li>Account is automatically created and linked</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

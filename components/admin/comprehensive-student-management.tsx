"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, UserPlus, Copy, Trash2, RefreshCw, Eye, EyeOff, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  addStudentInvitation,
  getStudentInvitations,
  getRegisteredStudents,
  deleteStudentInvitation,
  regenerateInviteCode,
} from "@/app/actions/student-actions"

interface StudentInvitation {
  id: string
  email: string
  invite_code: string
  student_id: string
  full_name: string
  is_registered: boolean
  created_at: string
}

interface Student {
  id: string
  email: string
  full_name: string
  student_id: string
  created_at: string
}

export default function ComprehensiveStudentManagement() {
  const { userProfile } = useAuth()
  const [invitations, setInvitations] = useState<StudentInvitation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCodes, setShowCodes] = useState<{ [key: string]: boolean }>({})
  const [newInvitation, setNewInvitation] = useState({
    email: "",
    fullName: "",
    studentId: "",
  })
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [lastCreatedCode, setLastCreatedCode] = useState<string>("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [invitationsResult, studentsResult] = await Promise.all([getStudentInvitations(), getRegisteredStudents()])

      if (invitationsResult.success) {
        setInvitations(invitationsResult.data)
      } else {
        console.error("Failed to load invitations:", invitationsResult.error)
      }

      if (studentsResult.success) {
        setStudents(studentsResult.data)
      } else {
        console.error("Failed to load students:", studentsResult.error)
      }
    } catch (error: any) {
      console.error("Error loading data:", error)
      setError("Failed to load data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile?.firebase_uid) {
      setError("User not authenticated")
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await addStudentInvitation({
        email: newInvitation.email,
        fullName: newInvitation.fullName,
        studentId: newInvitation.studentId,
        invitedBy: userProfile.firebase_uid,
      })

      if (result.success) {
        setLastCreatedCode(result.inviteCode || "")
        setShowSuccessDialog(true)
        setNewInvitation({ email: "", fullName: "", studentId: "" })
        await loadData()
      } else {
        setError(result.error || "Failed to create invitation")
      }
    } catch (error: any) {
      console.error("Error creating invitation:", error)
      setError("An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (invitationId: string) => {
    if (!confirm("Are you sure you want to delete this invitation?")) return

    try {
      const result = await deleteStudentInvitation(invitationId)
      if (result.success) {
        setSuccess("Invitation deleted successfully")
        await loadData()
      } else {
        setError(result.error || "Failed to delete invitation")
      }
    } catch (error: any) {
      console.error("Error deleting invitation:", error)
      setError("An unexpected error occurred")
    }
  }

  const handleRegenerate = async (invitationId: string) => {
    if (!confirm("Are you sure you want to regenerate this code?")) return

    try {
      const result = await regenerateInviteCode(invitationId)
      if (result.success) {
        setSuccess(`New code generated: ${result.newInviteCode}`)
        await loadData()
      } else {
        setError(result.error || "Failed to regenerate code")
      }
    } catch (error: any) {
      console.error("Error regenerating code:", error)
      setError("An unexpected error occurred")
    }
  }

  const copyToClipboard = async (text: string, type = "code") => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess(`${type} copied to clipboard!`)
    } catch (error) {
      console.error("Failed to copy:", error)
      setError("Failed to copy to clipboard")
    }
  }

  const toggleCodeVisibility = (invitationId: string) => {
    setShowCodes((prev) => ({
      ...prev,
      [invitationId]: !prev[invitationId],
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const pendingInvitations = invitations.filter((inv) => !inv.is_registered)
  const registeredInvitations = invitations.filter((inv) => inv.is_registered)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading student data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Invitations</p>
                <p className="text-2xl font-bold">{invitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Registered</p>
                <p className="text-2xl font-bold">{registeredInvitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{pendingInvitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Active Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="invitations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invitations">
            Student Invitations
            {pendingInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="students">
            Registered Students
            {students.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {students.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="add">Add Student</TabsTrigger>
        </TabsList>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Invitations</CardTitle>
                  <CardDescription>Manage student invitation codes and track registration status</CardDescription>
                </div>
                <Button onClick={loadData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No student invitations yet</p>
                  <p className="text-sm text-gray-400">Create your first invitation to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Info</TableHead>
                      <TableHead>Invitation Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invitation.full_name}</p>
                            <p className="text-sm text-gray-500">{invitation.email}</p>
                            <p className="text-xs text-gray-400">ID: {invitation.student_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {showCodes[invitation.id] ? invitation.invite_code : "••••••"}
                            </code>
                            <Button variant="ghost" size="sm" onClick={() => toggleCodeVisibility(invitation.id)}>
                              {showCodes[invitation.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(invitation.invite_code)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={invitation.is_registered ? "default" : "secondary"}>
                            {invitation.is_registered ? "Registered" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(invitation.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRegenerate(invitation.id)}
                              disabled={invitation.is_registered}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(invitation.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Students</CardTitle>
              <CardDescription>Students who have completed their registration</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No registered students yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.student_id}</TableCell>
                        <TableCell>{formatDate(student.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Student</CardTitle>
              <CardDescription>Create a new student invitation with a unique access code</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newInvitation.email}
                      onChange={(e) => setNewInvitation((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="student@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={newInvitation.fullName}
                      onChange={(e) => setNewInvitation((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    value={newInvitation.studentId}
                    onChange={(e) => setNewInvitation((prev) => ({ ...prev, studentId: e.target.value }))}
                    placeholder="STU001"
                    required
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Invitation...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Student Invitation
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Invitation Created!</DialogTitle>
            <DialogDescription>
              The invitation has been created successfully. Share this code with the student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Invitation Code:</p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <code className="text-2xl font-bold">{lastCreatedCode}</code>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => copyToClipboard(lastCreatedCode)} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>
              <Button
                onClick={() =>
                  copyToClipboard(
                    `Your student invitation code is: ${lastCreatedCode}\n\nPlease use this code to register at our platform.`,
                  )
                }
                variant="outline"
                className="flex-1"
              >
                Copy Instructions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { UserPlus, Copy, Trash2, Users, RotateCcw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  addStudentInvitation,
  deleteStudentInvitation,
  updatePasswordResetRequest,
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

export default function SimpleStudentManagement() {
  const { userProfile, resetPassword } = useAuth()
  const [invitations, setInvitations] = useState<StudentInvitation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const generateInviteCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
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

      toast({
        title: "Student added successfully!",
        description: `Invite code: ${result.inviteCode}. Share this code with the student.`,
      })

      // Reset form
      setEmail("")
      setFullName("")
      setStudentId("")
      setIsAddDialogOpen(false)

      // Refresh data
      fetchData()
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

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
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
                    <TableHead>Code</TableHead>
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
                            {invitation.invite_code}
                          </code>
                          <Button size="sm" variant="ghost" onClick={() => copyInviteCode(invitation.invite_code)}>
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
                        <div className="flex space-x-2">
                          {invitation.is_registered && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePasswordReset(invitation.email, invitation.id)}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          )}
                          {!invitation.is_registered && (
                            <Button size="sm" variant="destructive" onClick={() => deleteInvitation(invitation.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
    </div>
  )
}

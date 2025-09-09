"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { UserPlus, Copy, Trash2, Users, RotateCcw } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Invitation {
  id: string
  email: string
  invite_code: string
  student_id: string
  full_name: string
  is_registered: boolean
  is_password_reset: boolean
  created_at: string
}

interface Student {
  id: string
  email: string
  full_name: string
  created_at: string
}

export default function StudentManagement() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
      toast({
        title: "Error",
        description: "Failed to load student data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const inviteCode = generateCode()

      // Check if email already exists in invitations
      const { data: existingInvite } = await supabase
        .from("student_invitations")
        .select("id")
        .eq("email", email)
        .single()

      if (existingInvite) {
        throw new Error("An invitation for this email already exists")
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single()

      if (existingUser) {
        throw new Error("A user with this email already exists")
      }

      const { error } = await supabase.from("student_invitations").insert({
        email: email.trim(),
        invite_code: inviteCode,
        student_id: studentId.trim(),
        full_name: fullName.trim(),
        is_registered: false,
        is_password_reset: false
      })

      if (error) throw error

      const signupLink = `${window.location.origin}/auth/register?token=${inviteCode}&name=${encodeURIComponent(fullName)}&email=${encodeURIComponent(email)}`
      
      await navigator.clipboard.writeText(signupLink)
      
      toast({
        title: "Student invitation created!",
        description: "Signup link copied to clipboard. Share with student.",
      })

      // Reset form
      setEmail("")
      setFullName("")
      setStudentId("")
      setIsInviteDialogOpen(false)
      fetchData()

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const copyInvitationLink = async (invitation: Invitation) => {
    try {
      let link: string
      let description: string
      
      if (invitation.is_password_reset) {
        link = `${window.location.origin}/auth/reset-password?token=${invitation.invite_code}&email=${encodeURIComponent(invitation.email)}`
        description = "Password reset link copied to clipboard"
      } else {
        link = `${window.location.origin}/auth/register?token=${invitation.invite_code}&name=${encodeURIComponent(invitation.full_name)}&email=${encodeURIComponent(invitation.email)}`
        description = "Signup link copied to clipboard"
      }
      
      await navigator.clipboard.writeText(link)
      toast({
        title: "Copied!",
        description,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      })
    }
  }
  
  const generatePasswordResetLink = async (student: Student) => {
    try {
      const resetCode = generateCode()
      
      // Delete any existing invitations for this email
      await supabase
        .from("student_invitations")
        .delete()
        .eq('email', student.email)
      
      const { error } = await supabase.from("student_invitations").insert({
        email: student.email,
        invite_code: resetCode,
        student_id: `RESET_${student.id.substring(0, 8)}`,
        full_name: student.full_name,
        is_registered: false,
        is_password_reset: true
      })
      
      if (error) throw error
      
      const resetLink = `${window.location.origin}/auth/reset-password?token=${resetCode}&email=${encodeURIComponent(student.email)}`
      await navigator.clipboard.writeText(resetLink)
      
      toast({
        title: "Password reset link generated!",
        description: "Link copied to clipboard. Share with student.",
      })
      
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate reset link",
        variant: "destructive",
      })
    }
  }

  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("student_invitations")
        .delete()
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Invitation deleted",
        description: "The invitation has been removed",
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invitation",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">Manage student registrations and access</p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Student & Generate Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="student@example.com"
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="studentId">Student ID</Label>
                <Input 
                  id="studentId" 
                  value={studentId} 
                  onChange={(e) => setStudentId(e.target.value)} 
                  required 
                  placeholder="STU001"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Generate Signup Link"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                Pending Invitations
              </div>
              <Badge variant="secondary">{invitations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending invitations</p>
                <p className="text-sm">Create an invitation to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
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
                          <div className="text-sm text-muted-foreground">{invitation.email}</div>
                          <div className="text-xs text-muted-foreground">ID: {invitation.student_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invitation.is_password_reset ? "destructive" : "default"}>
                          {invitation.is_password_reset ? "Reset" : "Signup"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invitation.is_registered ? "default" : "secondary"}>
                          {invitation.is_registered ? "Used" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyInvitationLink(invitation)}
                            title={invitation.is_password_reset ? "Copy Reset Link" : "Copy Signup Link"}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          {!invitation.is_registered && (
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => deleteInvitation(invitation.id)}
                              title="Delete invitation"
                            >
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

        {/* Active Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Active Students
              </div>
              <Badge variant="secondary">{students.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No registered students</p>
                <p className="text-sm">Students will appear here after registration</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.full_name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(student.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generatePasswordResetLink(student)}
                          title="Generate password reset link"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset Password
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">How Student Registration Works</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="space-y-3">
            <div>
              <strong>1. Create Invitation:</strong> Add student details and generate a signup link
            </div>
            <div>
              <strong>2. Share Link:</strong> Send the generated link to the student via email or message
            </div>
            <div>
              <strong>3. Student Registration:</strong> Student clicks link, sets password, and creates account
            </div>
            <div>
              <strong>4. Password Reset:</strong> Generate reset links for existing students who forgot passwords
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
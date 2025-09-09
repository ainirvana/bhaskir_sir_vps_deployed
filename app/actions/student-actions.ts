"use server"

import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

interface CreateStudentInvitationData {
  email: string
  fullName: string
  studentId: string
  invitedBy: string
}

interface StudentInvitation {
  id: string
  email: string
  invite_code: string
  student_id: string
  full_name: string
  is_registered: boolean
  password_reset_requested?: boolean
  created_at: string
  invited_by?: string
}

interface Student {
  id: string
  email: string
  full_name: string
  student_id: string
  created_at: string
}

// Generate a 6-digit invitation code
function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function addStudentInvitation(data: CreateStudentInvitationData) {
  try {
    const supabase = createServerClient()

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from("student_invitations")
      .select("email")
      .eq("email", data.email.toLowerCase().trim())
      .single()

    if (existingEmail) {
      return {
        success: false,
        error: "A student with this email already exists",
      }
    }

    // Check if student ID already exists
    const { data: existingStudentId } = await supabase
      .from("student_invitations")
      .select("student_id")
      .eq("student_id", data.studentId.trim())
      .single()

    if (existingStudentId) {
      return {
        success: false,
        error: "A student with this ID already exists",
      }
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode()
    let codeExists = true
    let attempts = 0

    while (codeExists && attempts < 10) {
      const { data: existingCode } = await supabase
        .from("student_invitations")
        .select("invite_code")
        .eq("invite_code", inviteCode)
        .single()

      if (!existingCode) {
        codeExists = false
      } else {
        inviteCode = generateInviteCode()
        attempts++
      }
    }

    if (attempts >= 10) {
      return {
        success: false,
        error: "Failed to generate unique invite code. Please try again.",
      }
    }

    // Create the invitation
    const { data: invitation, error } = await supabase
      .from("student_invitations")
      .insert({
        email: data.email.toLowerCase().trim(),
        invite_code: inviteCode,
        student_id: data.studentId.trim(),
        full_name: data.fullName.trim(),
        invited_by: data.invitedBy,
        is_registered: false,
        password_reset_requested: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error creating invitation:", error)
      return {
        success: false,
        error: "Failed to create student invitation: " + error.message,
      }
    }

    revalidatePath("/admin/students")

    return {
      success: true,
      inviteCode: inviteCode,
      invitation: invitation,
    }
  } catch (error: any) {
    console.error("Error creating student invitation:", error)
    return {
      success: false,
      error: "An unexpected error occurred: " + error.message,
    }
  }
}

export async function getStudentInvitations(): Promise<{
  success: boolean
  data: StudentInvitation[]
  error?: string
}> {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("student_invitations")
      .select(`
        id,
        email,
        invite_code,
        student_id,
        full_name,
        is_registered,
        password_reset_requested,
        created_at,
        invited_by
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error fetching invitations:", error)
      return {
        success: false,
        data: [],
        error: "Failed to fetch student invitations: " + error.message,
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error: any) {
    console.error("Error fetching student invitations:", error)
    return {
      success: false,
      data: [],
      error: "An unexpected error occurred: " + error.message,
    }
  }
}

export async function getRegisteredStudents(): Promise<{
  success: boolean
  data: Student[]
  error?: string
}> {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        email,
        full_name,
        student_id,
        created_at
      `)
      .eq("role", "student")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error fetching students:", error)
      return {
        success: false,
        data: [],
        error: "Failed to fetch students: " + error.message,
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error: any) {
    console.error("Error fetching students:", error)
    return {
      success: false,
      data: [],
      error: "An unexpected error occurred: " + error.message,
    }
  }
}

export async function deleteStudentInvitation(invitationId: string) {
  try {
    const supabase = createServerClient()

    const { error } = await supabase.from("student_invitations").delete().eq("id", invitationId)

    if (error) {
      console.error("Database error deleting invitation:", error)
      return {
        success: false,
        error: "Failed to delete invitation: " + error.message,
      }
    }

    revalidatePath("/admin/students")

    return {
      success: true,
    }
  } catch (error: any) {
    console.error("Error deleting student invitation:", error)
    return {
      success: false,
      error: "An unexpected error occurred: " + error.message,
    }
  }
}

export async function regenerateInviteCode(invitationId: string) {
  try {
    const supabase = createServerClient()

    // Generate new unique invite code
    let newCode = generateInviteCode()
    let codeExists = true
    let attempts = 0

    while (codeExists && attempts < 10) {
      const { data: existingCode } = await supabase
        .from("student_invitations")
        .select("invite_code")
        .eq("invite_code", newCode)
        .single()

      if (!existingCode) {
        codeExists = false
      } else {
        newCode = generateInviteCode()
        attempts++
      }
    }

    if (attempts >= 10) {
      return {
        success: false,
        error: "Failed to generate unique invite code. Please try again.",
      }
    }

    const { data, error } = await supabase
      .from("student_invitations")
      .update({
        invite_code: newCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .select()
      .single()

    if (error) {
      console.error("Database error regenerating code:", error)
      return {
        success: false,
        error: "Failed to regenerate invite code: " + error.message,
      }
    }

    revalidatePath("/admin/students")

    return {
      success: true,
      newInviteCode: newCode,
      invitation: data,
    }
  } catch (error: any) {
    console.error("Error regenerating invite code:", error)
    return {
      success: false,
      error: "An unexpected error occurred: " + error.message,
    }
  }
}

export async function updatePasswordResetRequest(invitationId: string) {
  try {
    const supabase = createServerClient()

    const { error } = await supabase
      .from("student_invitations")
      .update({
        password_reset_requested: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)

    if (error) {
      console.error("Database error updating password reset request:", error)
      return {
        success: false,
        error: "Failed to update password reset request: " + error.message,
      }
    }

    revalidatePath("/admin/students")

    return {
      success: true,
    }
  } catch (error: any) {
    console.error("Error updating password reset request:", error)
    return {
      success: false,
      error: "An unexpected error occurred: " + error.message,
    }
  }
}

export async function checkInvitationByCode(inviteCode: string) {
  try {
    const supabase = createServerClient()

    console.log("Checking invitation by code:", inviteCode)

    const { data: invitation, error } = await supabase
      .from("student_invitations")
      .select("*")
      .eq("invite_code", inviteCode.trim())
      .eq("is_registered", false)
      .single()

    if (error) {
      console.error("Error checking invitation:", error)
      if (error.code === "PGRST116") {
        throw new Error("Invalid or expired invitation code")
      }
      throw new Error(error.message)
    }

    if (!invitation) {
      throw new Error("Invalid or expired invitation code")
    }

    console.log("Found valid invitation for:", invitation.email)
    return invitation
  } catch (error: any) {
    console.error("Error in checkInvitationByCode:", error)
    throw error
  }
}

export async function markInvitationAsRegistered(invitationId: string) {
  try {
    const supabase = createServerClient()

    const { error } = await supabase
      .from("student_invitations")
      .update({
        is_registered: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)

    if (error) {
      console.error("Database error marking invitation as registered:", error)
      return {
        success: false,
        error: "Failed to update invitation status: " + error.message,
      }
    }

    revalidatePath("/admin/students")

    return {
      success: true,
    }
  } catch (error: any) {
    console.error("Error marking invitation as registered:", error)
    return {
      success: false,
      error: "An unexpected error occurred: " + error.message,
    }
  }
}

export async function createUserAccount(userData: {
  email: string
  firebaseUid: string
  fullName: string
  studentId: string
}) {
  try {
    const supabase = createServerClient()

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        firebase_uid: userData.firebaseUid,
        email: userData.email.toLowerCase().trim(),
        full_name: userData.fullName.trim(),
        student_id: userData.studentId.trim(),
        role: "student",
      })
      .select()
      .single()

    if (error) {
      console.error("Database error creating user:", error)
      return {
        success: false,
        error: "Failed to create user account: " + error.message,
      }
    }

    return {
      success: true,
      user: user,
    }
  } catch (error: any) {
    console.error("Error creating user account:", error)
    return {
      success: false,
      error: "An unexpected error occurred: " + error.message,
    }
  }
}

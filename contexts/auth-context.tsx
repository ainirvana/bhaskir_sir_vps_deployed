"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  getAuth,
  onIdTokenChanged,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { supabase } from "@/lib/supabase"
import { checkInvitationByCode, markInvitationAsRegistered, createUserAccount } from "@/app/actions/student-actions"

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: "admin" | "professor" | "student"
  student_id?: string
  firebase_uid: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: "admin" | "professor" | "student") => Promise<void>
  signUpWithInvitation: (email: string, password: string, inviteCode: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  checkInvitation: (inviteCode: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// Cookie management functions
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; samesite=lax`
}

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    // Listen for auth state changes and token refresh
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email || "No user")
      setUser(firebaseUser)

      if (firebaseUser) {
        await fetchUserProfile(firebaseUser)
        // Set auth cookie for middleware
        const token = await firebaseUser.getIdToken()
        setCookie('firebase-auth-token', token, 7)
      } else {
        setUserProfile(null)
        // Clear auth cookies
        deleteCookie('firebase-auth-token')
        deleteCookie('user-role')
      }

      setLoading(false)
    })

    // Listen for token changes to refresh cookies
    const unsubscribeToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken(true) // Force refresh
        setCookie('firebase-auth-token', token, 7)
      }
    })

    return () => {
      unsubscribeAuth()
      unsubscribeToken()
    }
  }, [])

  const fetchUserProfile = async (firebaseUser: User) => {
    try {
      console.log("Fetching user profile for:", firebaseUser.email)

      // First try to find by firebase_uid
      let { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("firebase_uid", firebaseUser.uid)
        .single()

      if (error && error.code === "PGRST116") {
        // If not found by firebase_uid, try by email
        console.log("Profile not found by firebase_uid, trying email...")
        const { data: emailProfile, error: emailError } = await supabase
          .from("users")
          .select("*")
          .eq("email", firebaseUser.email!)
          .single()

        if (emailProfile && !emailError) {
          // Update the profile with firebase_uid
          console.log("Found profile by email, updating firebase_uid...")
          const { data: updatedProfile, error: updateError } = await supabase
            .from("users")
            .update({ firebase_uid: firebaseUser.uid })
            .eq("email", firebaseUser.email!)
            .select()
            .single()

          if (!updateError) {
            profile = updatedProfile
          }
        }
      }

      if (profile) {
        console.log("User profile loaded:", profile.email, profile.role)
        setUserProfile(profile)
        // Set role cookie for middleware
        setCookie('user-role', profile.role, 7)
      } else {
        console.log("No user profile found")
        // For demo purposes, create a profile for demo users
        if (firebaseUser.email?.includes("admin")) {
          const demoProfile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            full_name: "Demo Admin",
            role: "admin",
            firebase_uid: firebaseUser.uid,
          }
          
          // Try to create the profile in Supabase
          try {
            const { data: createdProfile, error: createError } = await supabase
              .from("users")
              .insert({
                email: firebaseUser.email,
                firebase_uid: firebaseUser.uid,
                full_name: "Demo Admin",
                role: "admin",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()

            if (!createError && createdProfile) {
              console.log("Created admin profile in database")
              setUserProfile(createdProfile)
              setCookie('user-role', 'admin', 7)
            } else {
              console.log("Using temporary admin profile")
              setUserProfile(demoProfile)
              setCookie('user-role', 'admin', 7)
            }
          } catch (error) {
            console.log("Using temporary admin profile")
            setUserProfile(demoProfile)
            setCookie('user-role', 'admin', 7)
          }
        } else if (firebaseUser.email?.includes("student")) {
          const demoProfile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            full_name: "Demo Student",
            role: "student",
            firebase_uid: firebaseUser.uid,
          }
          
          // Try to create the profile in Supabase
          try {
            const { data: createdProfile, error: createError } = await supabase
              .from("users")
              .insert({
                email: firebaseUser.email,
                firebase_uid: firebaseUser.uid,
                full_name: "Demo Student",
                role: "student",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()

            if (!createError && createdProfile) {
              console.log("Created student profile in database")
              setUserProfile(createdProfile)
              setCookie('user-role', 'student', 7)
            } else {
              console.log("Using temporary student profile")
              setUserProfile(demoProfile)
              setCookie('user-role', 'student', 7)
            }
          } catch (error) {
            console.log("Using temporary student profile")
            setUserProfile(demoProfile)
            setCookie('user-role', 'student', 7)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (signingIn) {
      console.log("Sign in already in progress, ignoring duplicate request")
      return
    }
    
    try {
      setSigningIn(true)
      console.log("Signing in user:", email)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      console.error("Sign in error:", error)
      throw new Error(error.message || "Failed to sign in")
    } finally {
      setSigningIn(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: "admin" | "professor" | "student") => {
    try {
      console.log("Creating new account:", email, role)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Create user profile in database
      const result = await createUserAccount({
        email: email,
        firebaseUid: userCredential.user.uid,
        fullName: fullName,
        studentId: role === "student" ? `STU${Date.now()}` : "",
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      console.log("Account created successfully")
    } catch (error: any) {
      console.error("Sign up error:", error)
      throw new Error(error.message || "Failed to create account")
    }
  }

  const signUpWithInvitation = async (email: string, password: string, inviteCode: string) => {
    try {
      console.log("Starting registration with invitation:", { email, inviteCode })

      // First verify the invitation
      const invitation = await checkInvitationByCode(inviteCode)

      if (!invitation) {
        throw new Error("Invalid invitation code")
      }

      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        throw new Error("Email does not match the invitation")
      }

      if (invitation.is_registered) {
        throw new Error("This invitation has already been used")
      }

      console.log("Invitation verified, creating Firebase account...")

      // Create Firebase account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      console.log("Firebase account created, creating user profile...")

      // Create user profile in database
      const userResult = await createUserAccount({
        email: invitation.email,
        firebaseUid: userCredential.user.uid,
        fullName: invitation.full_name,
        studentId: invitation.student_id,
      })

      if (!userResult.success) {
        throw new Error(userResult.error)
      }

      console.log("User profile created, marking invitation as registered...")

      // Mark invitation as registered
      const markResult = await markInvitationAsRegistered(invitation.id)

      if (!markResult.success) {
        console.error("Failed to mark invitation as registered:", markResult.error)
        // Don't throw here as the account was created successfully
      }

      console.log("Registration completed successfully")
    } catch (error: any) {
      console.error("Sign up with invitation error:", error)
      throw new Error(error.message || "Failed to register with invitation")
    }
  }

  const signOut = async () => {
    try {
      console.log("Signing out user")
      
      // Clear cookies before signing out
      deleteCookie('firebase-auth-token')
      deleteCookie('user-role')
      
      // Clear local state
      setUser(null)
      setUserProfile(null)
      
      // Sign out from Firebase
      await firebaseSignOut(auth)
      
      console.log("User signed out successfully")
    } catch (error: any) {
      console.error("Sign out error:", error)
      throw new Error(error.message || "Failed to sign out")
    }
  }

  const resetPassword = async (email: string) => {
    try {
      console.log("Sending password reset email to:", email)
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      console.error("Password reset error:", error)
      throw new Error(error.message || "Failed to send password reset email")
    }
  }

  const checkInvitation = async (inviteCode: string) => {
    try {
      console.log("Checking invitation code:", inviteCode)
      const invitation = await checkInvitationByCode(inviteCode)
      return invitation
    } catch (error: any) {
      console.error("Check invitation error:", error)
      throw new Error(error.message || "Invalid invitation code")
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signUpWithInvitation,
    signOut,
    resetPassword,
    checkInvitation,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

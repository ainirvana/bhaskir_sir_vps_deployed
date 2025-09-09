import { createClient } from "@supabase/supabase-js"

// Get environment variables directly (Next.js automatically loads them)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

// Client-side Supabase client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-application-name': 'educational-platform-client'
    }
  },
  db: {
    schema: 'public'
  }
})

// Create a Supabase client for server actions
// Singleton for server client
let _serverClient: any = null;

export function createServerClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables for server-side Supabase client')
  }

  if (!_serverClient) {
    _serverClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: { 
          'x-application-name': 'educational-platform-server',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      }
    });
  }

  return _serverClient;
}

// Server-side Supabase client singleton for admin operations
let _supabaseAdmin: any = null;

export const supabaseAdmin = (() => {
  if (typeof window !== 'undefined') return null;
  
  if (!_supabaseAdmin && supabaseServiceKey && supabaseUrl) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: { 
          'x-application-name': 'educational-platform-admin',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      }
    });
  }
  
  return _supabaseAdmin;
})()

// Helper to ensure server-side operations use the admin client
export function getServerSupabase() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerSupabase should only be called on the server side')
  }
  
  if (!supabaseServiceKey || !supabaseUrl) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL environment variables')
  }
  
  // Return the singleton admin client
  return supabaseAdmin || createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: { 
        'x-application-name': 'educational-platform-server'
      }
    }
  })
}

// Database initialization function for general availability checks
export async function initializeDatabase() {
  try {
    console.log("Initializing database connection...")

    // Test the connection with a simple query
    const { data, error } = await supabase.from("users").select('id').limit(1)

    if (error) {
      console.log("Tables might not exist yet, this is normal for first setup:", error.message)
      return true // Return true as tables will be created by manual setup
    }

    // Also check for slide-related tables
    const { error: slidesError } = await supabase.from("slides").select('id').limit(1)
    if (slidesError) {
      console.log("Slide tables might not exist yet, this is normal for first setup:", slidesError.message)
    }

    console.log("Database connection successful")
    return true
  } catch (error) {
    console.error("Database initialization error:", error)
    return false
  }
}

// Helper function to check if user is admin
export async function isUserAdmin(firebaseUid: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("users").select("role").eq("firebase_uid", firebaseUid).single()

    if (error || !data) {
      return false
    }

    return data.role === "admin"
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}

// Helper function to get user profile
export async function getUserProfile(firebaseUid: string) {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("firebase_uid", firebaseUid).single()

    if (error) {
      console.error("Error fetching user profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

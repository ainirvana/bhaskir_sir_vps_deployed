import { supabase } from "./supabase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "./firebase"

export async function seedDemoData() {
  try {
    console.log("Starting demo data seeding...")

    // Check if any admin exists
    const { data: existingAdmin } = await supabase.from("users").select("id").eq("role", "admin").limit(1).maybeSingle()

    // Only create demo admin if no admin exists
    if (!existingAdmin) {
      try {
        // Check if demo admin already exists in Supabase
        const { data: existingUser } = await supabase
          .from("users")
          .select("firebase_uid, email")
          .eq("email", "admin@eduplatform.com")
          .maybeSingle()

        if (!existingUser) {
          // Create Firebase user
          const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, "admin@eduplatform.com", "admin123")

          // Create Supabase profile
          const { error: profileError } = await supabase.from("users").insert([
            {
              firebase_uid: firebaseUser.uid,
              email: "admin@eduplatform.com",
              role: "admin",
              full_name: "Platform Administrator",
              student_id: null,
            },
          ])

          if (profileError) {
            console.error("Error creating admin profile:", profileError)
          } else {
            console.log("Created demo admin user")
          }
        }
      } catch (error: any) {
        if (error.code === "auth/email-already-in-use") {
          console.log("Demo admin already exists in Firebase")
        } else {
          console.error("Error creating demo admin:", error)
        }
      }
    } else {
      console.log("Admin already exists, skipping demo admin creation")
    }

    // Create sample content and slides (same as before)
    const { data: existingContent } = await supabase
      .from("scraped_content")
      .select("id")
      .eq("source_url", "https://www.gktoday.in/daily-current-affairs-quiz-may-24-2025/")
      .maybeSingle()

    if (!existingContent) {
      const sampleContent = {
        title: "Daily Current Affairs Quiz: May 24, 2025",
        content: {
          summary: "Current affairs quiz covering government schemes, geography, and recent developments",
          topics: ["Government Schemes", "Geography", "Science & Technology", "Current Events"],
        },
        source_url: "https://www.gktoday.in/daily-current-affairs-quiz-may-24-2025/",
        source_name: "GK Today",
        publish_date: "2025-05-24",
        topic_tags: ["current-affairs", "government", "geography", "science"],
        image_urls: [],
        content_type: "quiz",
        is_published: true,
      }

      const { data: contentData, error: contentError } = await supabase
        .from("scraped_content")
        .insert([sampleContent])
        .select()

      if (!contentError && contentData && contentData.length > 0) {
        const contentId = contentData[0].id

        const sampleQuestions = [
          {
            content_id: contentId,
            question_text:
              "What is the name of the scheme launched by government for providing equity support to MSMEs in India?",
            options: {
              A: "Atmanirbhar MSME Yojana",
              B: "SRI Fund Scheme",
              C: "Bharat MSME Capital Scheme",
              D: "Startup India Fund",
            },
            correct_answer: "B",
            correct_option: "SRI Fund Scheme",
            explanation:
              "The Self Reliant India Fund, known as SRI Fund, supports Micro, Small and Medium Enterprises (MSMEs) by providing equity funding to help them grow into large businesses.",
            question_order: 1,
          },
          {
            content_id: contentId,
            question_text: "Chagos Islands, that was recently seen in news, is located in which ocean?",
            options: {
              A: "Pacific Ocean",
              B: "Atlantic Ocean",
              C: "Indian Ocean",
              D: "Arctic Ocean",
            },
            correct_answer: "C",
            correct_option: "Indian Ocean",
            explanation:
              "The Chagos Islands are located in the central Indian Ocean, about 1,600 km south of India's southern tip.",
            question_order: 2,
          },
        ]

        await supabase.from("quiz_questions").insert(sampleQuestions)
        console.log("Sample questions created")
      }
    }

    // Create sample slides
    const { data: existingSlides } = await supabase.from("slides").select("id").limit(1).maybeSingle()

    if (!existingSlides) {
      const { data: adminUser } = await supabase.from("users").select("id").eq("role", "admin").limit(1).maybeSingle()

      const sampleSlides = [
        {
          title: "Introduction to Current Affairs",
          content: {
            type: "educational",
            sections: [
              {
                type: "introduction",
                content: "Welcome to our Current Affairs learning platform!",
              },
            ],
          },
          body_content: `Welcome to our Current Affairs learning platform!

This platform provides you with:
• Daily current affairs updates
• Interactive quizzes
• Comprehensive study materials
• Progress tracking

Stay updated with the latest developments in:
- Government policies and schemes
- International relations
- Science and technology
- Economic developments
- Social issues

Let's begin your learning journey!`,
          image_url: "/placeholder.svg?height=300&width=600",
          slide_order: 1,
          is_published: true,
          created_by: adminUser?.id,
        },
        {
          title: "Government Schemes - SRI Fund",
          content: {
            type: "educational",
            topic: "Government Schemes",
            scheme_name: "Self Reliant India (SRI) Fund",
          },
          body_content: `Self Reliant India (SRI) Fund

Key Features:
• Total fund size: Rs. 50,000 crore
• Government contribution: Rs. 10,000 crore
• Private sector contribution: Rs. 40,000 crore

Objective:
To provide equity support to Micro, Small and Medium Enterprises (MSMEs) and help them grow into large businesses.

Management:
Managed by NSIC Venture Capital Fund Limited (NVCFL), registered with SEBI as Category II Alternative Investment Fund.

Progress:
As of March 2025, Rs. 10,979 crore invested in 577 MSMEs.`,
          image_url: "/placeholder.svg?height=300&width=600",
          slide_order: 2,
          is_published: true,
          created_by: adminUser?.id,
        },
      ]

      await supabase.from("slides").insert(sampleSlides)
      console.log("Sample slides created")
    }

    console.log("Demo data seeding completed successfully!")
    return { success: true }
  } catch (error) {
    console.error("Error seeding demo data:", error)
    return { success: false, error }
  }
}

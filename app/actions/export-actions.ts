"use server"

import { createServerClient } from "@/lib/supabase"

export async function getDirectorySlides(directoryId: string) {
  const supabase = createServerClient()

  try {
    // Get directory info
    const { data: directory, error: dirError } = await supabase
      .from("slide_directories")
      .select("*")
      .eq("id", directoryId)
      .single()

    if (dirError) throw dirError

    // Get slides in directory
    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("*")
      .eq("directory_id", directoryId)
      .eq("is_published", true)
      .order("slide_order", { ascending: true })

    if (slidesError) throw slidesError

    return { success: true, directory, slides }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function generatePresentationData(directoryId: string) {
  const result = await getDirectorySlides(directoryId)

  if (!result.success) {
    return result
  }

  const { directory, slides } = result

  // Generate presentation metadata
  const presentationData = {
    title: directory.name,
    description: directory.description,
    totalSlides: slides.length,
    slides: slides.map((slide, index) => ({
      id: slide.id,
      title: slide.title,
      content: slide.body_content,
      imageUrl: slide.image_url,
      order: index + 1,
    })),
    createdAt: new Date().toISOString(),
  }

  return { success: true, data: presentationData }
}

import { createServerClient } from "@/lib/supabase"
import { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerClient()

  if (req.method === "POST") {
    try {
      const { name, description, createdBy } = req.body

      // Get the next directory order
      const { data: lastDirectory } = await supabase
        .from("slide_directories")
        .select("directory_order")
        .order("directory_order", { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextOrder = (lastDirectory?.directory_order || 0) + 1

      const { data: directory, error } = await supabase
        .from("slide_directories")
        .insert([
          {
            name: name.trim(),
            description: description.trim(),
            created_by: createdBy,
            directory_order: nextOrder,
            is_published: false,
          },
        ])
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return res.status(200).json({ success: true, directory })
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message })
    }
  } else if (req.method === "PUT") {
    try {
      const { directoryId, name, description, isPublished } = req.body

      const { data: directory, error } = await supabase
        .from("slide_directories")
        .update({
          name: name?.trim(),
          description: description?.trim(),
          is_published: isPublished,
          updated_at: new Date().toISOString(),
        })
        .eq("id", directoryId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return res.status(200).json({ success: true, directory })
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message })
    }
  } else if (req.method === "DELETE") {
    try {
      const { directoryId } = req.query

      // First delete all slides in the directory
      const { error: slidesDeletionError } = await supabase
        .from("slides")
        .delete()
        .eq("directory_id", directoryId)

      if (slidesDeletionError) {
        throw new Error(slidesDeletionError.message)
      }

      // Then delete the directory
      const { error: directoryDeletionError } = await supabase
        .from("slide_directories")
        .delete()
        .eq("id", directoryId)

      if (directoryDeletionError) {
        throw new Error(directoryDeletionError.message)
      }

      return res.status(200).json({ success: true })
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message })
    }
  }

  return res.status(405).json({ error: "Method not allowed" })
}

import { createServerClient } from "@/lib/supabase"
import { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerClient()
  if (req.method === "POST") {
    try {
      const { directoryId, title, content, type, createdBy } = req.body
      const bodyContent = typeof content === 'string' ? content : '';

      // Get the next slide order in this directory
      const { data: lastSlide } = await supabase
        .from("slides")
        .select("slide_order")
        .eq("directory_id", directoryId)
        .order("slide_order", { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextOrder = (lastSlide?.slide_order || 0) + 1

      const { data: slide, error } = await supabase
        .from("slides")
        .insert([
          {
            title: title.trim(),
            content,
            body_content: bodyContent,
            type,
            directory_id: directoryId,
            created_by: createdBy,
            slide_order: nextOrder,
          },
        ])
        .select()
        .single()

      if (error) throw new Error(error.message)

      return res.status(200).json({ success: true, slide })
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message })
    }  } else if (req.method === "PUT") {
    try {
      const { slideId, title, content, image_url } = req.body
      const bodyContent = typeof content === 'string' ? content : '';      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      
      if (title !== undefined) updateData.title = title.trim();
      if (content !== undefined) {
        updateData.content = content;
        updateData.body_content = bodyContent;
      }
      if (image_url !== undefined) updateData.image_url = image_url;

      const { data: slide, error } = await supabase
        .from("slides")
        .update(updateData)
        .eq("id", slideId)
        .select()
        .single()

      if (error) throw new Error(error.message)

      return res.status(200).json({ success: true, slide })
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message })
    }
  } else if (req.method === "DELETE") {
    try {
      const { slideId } = req.query

      const { error } = await supabase.from("slides").delete().eq("id", slideId)

      if (error) throw new Error(error.message)

      return res.status(200).json({ success: true })
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message })
    }
  }

  return res.status(405).json({ error: "Method not allowed" })
}

import { createServerClient } from "@/lib/supabase"
import { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const supabase = createServerClient()

  try {
    const { directoryId, slideOrders } = req.body

    if (!directoryId || !slideOrders || !Array.isArray(slideOrders)) {
      return res.status(400).json({ error: "Invalid request data" })
    }

    for (const slide of slideOrders) {
      const { error } = await supabase
        .from("slides")
        .update({ slide_order: slide.order })
        .eq("id", slide.id)
        .eq("directory_id", directoryId)

      if (error) {
        throw new Error(error.message)
      }
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message })
  }
}

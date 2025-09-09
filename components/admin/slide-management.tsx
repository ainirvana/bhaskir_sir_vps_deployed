"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Plus, Edit, Trash2, Eye, ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Slide {
  id: string
  title: string
  content: any
  body_content: string
  image_url: string
  slide_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export default function SlideManagement() {
  const { userProfile } = useAuth()
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [bodyContent, setBodyContent] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    fetchSlides()
  }, [])

  const fetchSlides = async () => {
    try {
      const { data, error } = await supabase.from("slides").select("*").order("slide_order", { ascending: true })

      if (error) {
        throw error
      }

      setSlides(data || [])
    } catch (error) {
      console.error("Error fetching slides:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setBodyContent("")
    setImageUrl("")
    setIsPublished(false)
    setEditingSlide(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Create structured content object
      const contentObject = {
        type: "educational",
        body: bodyContent,
        image: imageUrl,
        created_at: new Date().toISOString(),
        sections: [
          {
            type: "main_content",
            content: bodyContent,
          },
        ],
      }

      const slideData = {
        title,
        body_content: bodyContent,
        image_url: imageUrl || null,
        is_published: isPublished,
        content: contentObject, // Always provide a valid content object
        created_by: userProfile.id,
        slide_order: editingSlide ? editingSlide.slide_order : slides.length + 1,
      }

      if (editingSlide) {
        // Update existing slide
        const { error } = await supabase
          .from("slides")
          .update({
            ...slideData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingSlide.id)

        if (error) throw error

        toast({
          title: "Slide updated!",
          description: "The slide has been successfully updated.",
        })
      } else {
        // Create new slide
        const { error } = await supabase.from("slides").insert([slideData])

        if (error) throw error

        toast({
          title: "Slide created!",
          description: "The slide has been successfully created.",
        })
      }

      resetForm()
      setIsCreateDialogOpen(false)
      fetchSlides()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleEdit = (slide: Slide) => {
    setEditingSlide(slide)
    setTitle(slide.title)
    setBodyContent(slide.body_content || "")
    setImageUrl(slide.image_url || "")
    setIsPublished(slide.is_published)
    setIsCreateDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this slide?")) return

    try {
      const { error } = await supabase.from("slides").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Slide deleted",
        description: "The slide has been removed.",
      })

      fetchSlides()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("slides")
        .update({
          is_published: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Slide updated",
        description: `Slide ${!currentStatus ? "published" : "unpublished"} successfully.`,
      })

      fetchSlides()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Loading slides...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Slide Management</h1>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Slide
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSlide ? "Edit Slide" : "Create New Slide"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <Label htmlFor="bodyContent">Body Content</Label>
                <Textarea
                  id="bodyContent"
                  value={bodyContent}
                  onChange={(e) => setBodyContent(e.target.value)}
                  rows={8}
                  placeholder="Enter the main content of the slide..."
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                <Label htmlFor="published">Publish immediately</Label>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  {editingSlide ? "Update Slide" : "Create Slide"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setIsCreateDialogOpen(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Slides ({slides.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {slides.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No slides created yet. Create your first slide to get started!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slides.map((slide) => (
                  <TableRow key={slide.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {slide.image_url && <ImageIcon className="w-4 h-4 text-gray-400" />}
                        <span>{slide.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={slide.is_published ? "default" : "secondary"}>
                        {slide.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>{slide.slide_order}</TableCell>
                    <TableCell>{new Date(slide.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(slide)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePublished(slide.id, slide.is_published)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(slide.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

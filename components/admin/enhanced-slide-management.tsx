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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ImageIcon,
  FolderPlus,
  Folder,
  Play,
  ArrowUp,
  ArrowDown,
  FileImage,
  FileText,
  Presentation,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  createSlideDirectory,
  updateSlideDirectory,
  deleteSlideDirectory,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
} from "@/app/actions/slide-actions"
import DirectorySlideViewer from "./directory-slide-viewer"
import { generatePresentationData } from "@/app/actions/export-actions"
import ExportPanel from "./export-panel"
import { AISlideGenerator } from "./ai-slide-generator"

interface SlideDirectory {
  id: string
  name: string
  description: string
  is_published: boolean
  directory_order: number
  created_at: string
  slide_count?: number
}

interface Slide {
  id: string
  title: string
  body_content: string
  image_url: string
  slide_order: number
  is_published: boolean
  directory_id: string
  created_at: string
  updated_at: string
}

export default function EnhancedSlideManagement() {
  const { userProfile } = useAuth()
  const [directories, setDirectories] = useState<SlideDirectory[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
  const [selectedDirectory, setSelectedDirectory] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("directories")
  const [isExporting, setIsExporting] = useState(false)

  // Dialog states
  const [isDirectoryDialogOpen, setIsDirectoryDialogOpen] = useState(false)
  const [isSlideDialogOpen, setIsSlideDialogOpen] = useState(false)
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false)
  const [editingDirectory, setEditingDirectory] = useState<SlideDirectory | null>(null)
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null)

  // Form states
  const [directoryName, setDirectoryName] = useState("")
  const [directoryDescription, setDirectoryDescription] = useState("")
  const [directoryPublished, setDirectoryPublished] = useState(false)

  const [slideTitle, setSlideTitle] = useState("")
  const [slideBodyContent, setSlideBodyContent] = useState("")
  const [slideImageUrl, setSlideImageUrl] = useState("")
  const [slideDirectoryId, setSlideDirectoryId] = useState("")
  const [slidePublished, setSlidePublished] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [showDirectorySlides, setShowDirectorySlides] = useState(false)
  const [selectedDirectoryForView, setSelectedDirectoryForView] = useState<string>("")

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedDirectory) {
      fetchSlides(selectedDirectory)
    }
  }, [selectedDirectory])

  const fetchData = async () => {
    try {
      const { data: directoriesData, error: dirError } = await supabase
        .from("slide_directories")
        .select(`
          *,
          slides:slides(count)
        `)
        .order("directory_order", { ascending: true })

      if (dirError) throw dirError

      const directoriesWithCount =
        directoriesData?.map((dir) => ({
          ...dir,
          slide_count: dir.slides?.[0]?.count || 0,
        })) || []

      setDirectories(directoriesWithCount)

      if (directoriesWithCount.length > 0 && !selectedDirectory) {
        setSelectedDirectory(directoriesWithCount[0].id)
      }
    } catch (error) {
      console.error("Error fetching directories:", error)
      toast({
        title: "Error fetching directories",
        description: (error as Error).message || JSON.stringify(error),
      })
    } finally {
      setLoading(false
      )
    }
  }

  const fetchSlides = async (directoryId: string) => {
    try {
      const { data, error } = await supabase
        .from("slides")
        .select("*")
        .eq("directory_id", directoryId)
        .order("slide_order", { ascending: true })

      if (error) throw error
      setSlides(data || [])
    } catch (error) {
      console.error("Error fetching slides:", error)
      toast({
        title: "Error fetching slides",
        description: (error as Error).message || JSON.stringify(error),
      })
    }
  }

  const resetDirectoryForm = () => {
    setDirectoryName("")
    setDirectoryDescription("")
    setDirectoryPublished(false)
    setEditingDirectory(null)
  }

  const resetSlideForm = () => {
    setSlideTitle("")
    setSlideBodyContent("")
    setSlideImageUrl("")
    setSlideDirectoryId("")
    setSlidePublished(false)
    setImageFile(null)
    setEditingSlide(null)
  }

  const handleImageUpload = async (file: File): Promise<string> => {
    // For demo purposes, we'll use a placeholder URL
    // In a real app, you'd upload to a service like Vercel Blob, Cloudinary, etc.
    const placeholderUrl = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(file.name)}`
    return placeholderUrl
  }

  const handleDirectorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingDirectory) {
        const result = await updateSlideDirectory(editingDirectory.id, {
          name: directoryName,
          description: directoryDescription,
          isPublished: directoryPublished,
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: "Directory updated!",
          description: "The directory has been successfully updated.",
        })
      } else {
        const result = await createSlideDirectory({
          name: directoryName,
          description: directoryDescription,
          createdBy: userProfile?.id || "",
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: "Directory created!",
          description: "The directory has been successfully created.",
        })
      }

      resetDirectoryForm()
      setIsDirectoryDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleSlideSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let finalImageUrl = slideImageUrl

      // Handle image upload if file is selected
      if (imageFile) {
        finalImageUrl = await handleImageUpload(imageFile)
      }

      if (editingSlide) {
        const result = await updateSlide(editingSlide.id, {
          title: slideTitle,
          content: slideBodyContent,
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: "Slide updated!",
          description: "The slide has been successfully updated.",
        })
      } else {
        const result = await createSlide({
          title: slideTitle,
          content: slideBodyContent,
          type: "text",
          directoryId: slideDirectoryId || selectedDirectory,
          createdBy: userProfile?.id || "",
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: "Slide created!",
          description: "The slide has been successfully created.",
        })
      }

      resetSlideForm()
      setIsSlideDialogOpen(false)
      if (selectedDirectory) {
        fetchSlides(selectedDirectory)
      }
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleEditDirectory = (directory: SlideDirectory) => {
    setEditingDirectory(directory)
    setDirectoryName(directory.name)
    setDirectoryDescription(directory.description)
    setDirectoryPublished(directory.is_published)
    setIsDirectoryDialogOpen(true)
  }

  const handleEditSlide = (slide: Slide) => {
    setEditingSlide(slide)
    setSlideTitle(slide.title)
    setSlideBodyContent(slide.body_content || "")
    setSlideImageUrl(slide.image_url || "")
    setSlideDirectoryId(slide.directory_id)
    setSlidePublished(slide.is_published)
    setIsSlideDialogOpen(true)
  }

  const handleDeleteDirectory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this directory?")) return

    try {
      const result = await deleteSlideDirectory(id)
      if (!result.success) throw new Error(result.error)

      toast({
        title: "Directory deleted",
        description: "The directory has been removed.",
      })

      if (selectedDirectory === id) {
        setSelectedDirectory("")
        setSlides([])
      }
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteSlide = async (id: string) => {
    if (!confirm("Are you sure you want to delete this slide?")) return

    try {
      const result = await deleteSlide(id)
      if (!result.success) throw new Error(result.error)

      toast({
        title: "Slide deleted",
        description: "The slide has been removed.",
      })

      if (selectedDirectory) {
        fetchSlides(selectedDirectory)
      }
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const moveSlide = async (slideId: string, direction: "up" | "down") => {
    const currentIndex = slides.findIndex((s) => s.id === slideId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= slides.length) return

    const newSlides = [...slides]
    const [movedSlide] = newSlides.splice(currentIndex, 1)
    newSlides.splice(newIndex, 0, movedSlide)

    // Update slide orders
    const slideOrders = newSlides.map((slide, index) => ({
      id: slide.id,
      order: index + 1,
    }))

    try {
      const result = await reorderSlides(selectedDirectory, slideOrders)
      if (!result.success) throw new Error(result.error)

      setSlides(
        newSlides.map((slide, index) => ({
          ...slide,
          slide_order: index + 1,
        })),
      )

      toast({
        title: "Slide moved",
        description: "The slide order has been updated.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleViewDirectorySlides = (directoryId: string) => {
    setSelectedDirectoryForView(directoryId)
    setShowDirectorySlides(true)
  }

  const handleQuickExportPDF = async (directoryId: string) => {
    setIsExporting(true)
    try {
      const result = await generatePresentationData(directoryId)
      if (!result.success) throw new Error((result as any).error || 'Export failed')

      const pdfContent = generatePDFContent((result as any).data)
      downloadFile(pdfContent, `${(result as any).data.title}.html`, "text/html")

      toast({
        title: "Export successful",
        description: "Directory exported as PDF-ready HTML",
      })
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleQuickExportPPTX = async (directoryId: string) => {
    setIsExporting(true)
    try {
      const result = await generatePresentationData(directoryId)
      if (!result.success) throw new Error((result as any).error || 'Export failed')

      const pptxContent = generatePPTXContent((result as any).data)
      downloadFile(pptxContent, `${(result as any).data.title}-presentation.html`, "text/html")

      toast({
        title: "Export successful",
        description: "Directory exported as PowerPoint-compatible HTML",
      })
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Add the helper functions from directory-slide-viewer.tsx
  const generatePDFContent = (data: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${data.title}</title>
    <style>
        @page { size: A4; margin: 1in; }
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .slide { page-break-after: always; margin-bottom: 2em; }
        .slide:last-child { page-break-after: avoid; }
        .slide-title { font-size: 24px; font-weight: bold; margin-bottom: 1em; color: #333; }
        .slide-content { font-size: 14px; white-space: pre-wrap; }
        .slide-image { max-width: 100%; height: auto; margin: 1em 0; }
        .cover { text-align: center; padding: 2em; }
        .cover h1 { font-size: 36px; margin-bottom: 0.5em; }
        .cover p { font-size: 18px; color: #666; }
        @media print {
            .slide { page-break-after: always; }
        }
    </style>
</head>
<body>
    <div class="slide cover">
        <h1>${data.title}</h1>
        <p>${data.description || ""}</p>
        <p>Total Slides: ${data.totalSlides}</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
    </div>
    
    ${data.slides
      .map(
        (slide: any) => `
    <div class="slide">
        <h2 class="slide-title">${slide.title}</h2>
        ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title}" class="slide-image" />` : ""}
        <div class="slide-content">${slide.content}</div>
    </div>
    `,
      )
      .join("")}
</body>
</html>
  `
  }

  const generatePPTXContent = (data: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${data.title} - PowerPoint Compatible</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
        .presentation { max-width: 1024px; margin: 0 auto; }
        .slide { 
            width: 100%; 
            min-height: 600px; 
            border: 2px solid #ddd; 
            margin-bottom: 30px; 
            padding: 40px; 
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .slide-title { 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 30px; 
            color: #1f4e79;
            border-bottom: 3px solid #1f4e79;
            padding-bottom: 10px;
        }
        .slide-content { 
            font-size: 18px; 
            line-height: 1.8; 
            white-space: pre-wrap; 
        }
        .slide-image { 
            max-width: 80%; 
            height: auto; 
            margin: 20px auto; 
            display: block;
            border-radius: 8px;
        }
        .cover { 
            text-align: center; 
            background: linear-gradient(135deg, #1f4e79 0%, #4472c4 100%);
            color: white;
        }
        .cover h1 { 
            font-size: 48px; 
            margin-bottom: 20px; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .cover p { 
            font-size: 24px; 
            margin-bottom: 15px; 
        }
    </style>
</head>
<body>
    <div class="presentation">
        <div class="slide cover">
            <h1>${data.title}</h1>
            <p>${data.description || ""}</p>
            <p>Total Slides: ${data.totalSlides}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        ${data.slides
          .map(
            (slide: any, index: number) => `
        <div class="slide">
            <h2 class="slide-title">${slide.title}</h2>
            ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title}" class="slide-image" />` : ""}
            <div class="slide-content">${slide.content}</div>
        </div>
        `,
          )
          .join("")}
    </div>
</body>
</html>
  `
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div>Loading slide management...</div>
  }

  if (showDirectorySlides && selectedDirectoryForView) {
    return (
      <DirectorySlideViewer
        directoryId={selectedDirectoryForView}
        onBack={() => {
          setShowDirectorySlides(false)
          setSelectedDirectoryForView("")
          fetchData()
        }}
        onEditSlide={handleEditSlide}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Enhanced Slide Management</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setIsSlideshowOpen(true)} variant="outline">
            <Play className="w-4 h-4 mr-2" />
            Preview Slideshow
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="directories">Directories</TabsTrigger>
          <TabsTrigger value="slides">Slides</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="directories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Slide Directories</h2>
            <div className="flex gap-2">
              <AISlideGenerator
                onSuccess={() => {
                  fetchData()
                }}
              />
              <Dialog
                open={isDirectoryDialogOpen}
                onOpenChange={(open) => {
                  setIsDirectoryDialogOpen(open)
                  if (!open) resetDirectoryForm()
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Create Directory
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDirectory ? "Edit Directory" : "Create New Directory"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDirectorySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="directoryName">Directory Name</Label>
                    <Input
                      id="directoryName"
                      value={directoryName}
                      onChange={(e) => setDirectoryName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="directoryDescription">Description</Label>
                    <Textarea
                      id="directoryDescription"
                      value={directoryDescription}
                      onChange={(e) => setDirectoryDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="directoryPublished"
                      checked={directoryPublished}
                      onCheckedChange={setDirectoryPublished}
                    />
                    <Label htmlFor="directoryPublished">Publish directory</Label>
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit" className="flex-1">
                      {editingDirectory ? "Update Directory" : "Create Directory"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetDirectoryForm()
                        setIsDirectoryDialogOpen(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Slides</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {directories.map((directory) => (
                    <TableRow key={directory.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Folder className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{directory.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{directory.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{directory.slide_count} slides</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={directory.is_published ? "default" : "secondary"}>
                          {directory.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewDirectorySlides(directory.id)}>
                            <Eye className="w-3 h-3" />
                          </Button>

                          {/* Add export buttons directly in the table */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickExportPDF(directory.id)}
                            disabled={directory.slide_count === 0}
                            className="bg-red-50 hover:bg-red-100"
                            title="Export as PDF"
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickExportPPTX(directory.id)}
                            disabled={directory.slide_count === 0}
                            className="bg-blue-50 hover:bg-blue-100"
                            title="Export as PPTX"
                          >
                            <Presentation className="w-3 h-3" />
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => handleEditDirectory(directory)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteDirectory(directory.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slides" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Slides</h2>
              <Select value={selectedDirectory} onValueChange={setSelectedDirectory}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select directory" />
                </SelectTrigger>
                <SelectContent>
                  {directories.map((dir) => (
                    <SelectItem key={dir.id} value={dir.id}>
                      {dir.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog
              open={isSlideDialogOpen}
              onOpenChange={(open) => {
                setIsSlideDialogOpen(open)
                if (!open) resetSlideForm()
              }}
            >
              <DialogTrigger asChild>
                <Button disabled={!selectedDirectory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Slide
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingSlide ? "Edit Slide" : "Create New Slide"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSlideSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="slideTitle">Title</Label>
                    <Input
                      id="slideTitle"
                      value={slideTitle}
                      onChange={(e) => setSlideTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slideDirectory">Directory</Label>
                    <Select value={slideDirectoryId || selectedDirectory} onValueChange={setSlideDirectoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select directory" />
                      </SelectTrigger>
                      <SelectContent>
                        {directories.map((dir) => (
                          <SelectItem key={dir.id} value={dir.id}>
                            {dir.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Image</Label>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Label htmlFor="slideImageUrl" className="text-sm">
                          Image URL
                        </Label>
                        <Input
                          id="slideImageUrl"
                          type="url"
                          value={slideImageUrl}
                          onChange={(e) => setSlideImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="imageFile" className="text-sm">
                          Or Upload Image
                        </Label>
                        <Input
                          id="imageFile"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>
                    {(slideImageUrl || imageFile) && (
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <FileImage className="w-4 h-4" />
                        <span>Image will be included in slide</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="slideBodyContent">Content</Label>
                    <Textarea
                      id="slideBodyContent"
                      value={slideBodyContent}
                      onChange={(e) => setSlideBodyContent(e.target.value)}
                      rows={8}
                      placeholder="Enter the main content of the slide..."
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="slidePublished" checked={slidePublished} onCheckedChange={setSlidePublished} />
                    <Label htmlFor="slidePublished">Publish immediately</Label>
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit" className="flex-1">
                      {editingSlide ? "Update Slide" : "Create Slide"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetSlideForm()
                        setIsSlideDialogOpen(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {selectedDirectory ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Slides in {directories.find((d) => d.id === selectedDirectory)?.name} ({slides.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {slides.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No slides in this directory yet. Create your first slide!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slides.map((slide, index) => (
                        <TableRow key={slide.id}>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-mono">{slide.slide_order}</span>
                              <div className="flex flex-col">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0"
                                  onClick={() => moveSlide(slide.id, "up")}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0"
                                  onClick={() => moveSlide(slide.id, "down")}
                                  disabled={index === slides.length - 1}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
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
                          <TableCell>{new Date(slide.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditSlide(slide)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteSlide(slide.id)}>
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
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a directory to view and manage slides</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="export" className="space-y-4">
          <ExportPanel directories={directories.map(dir => ({
            ...dir,
            slide_count: dir.slide_count || 0
          }))} />
        </TabsContent>
      </Tabs>

      {showDirectorySlides && selectedDirectoryForView && (
        <DirectorySlideViewer
          directoryId={selectedDirectoryForView}
          onBack={() => {
            setShowDirectorySlides(false)
            setSelectedDirectoryForView("")
          }}
          onEditSlide={handleEditSlide}
        />
      )}

      {/* Slideshow Modal */}
      {isSlideshowOpen && <SlideshowModal directoryId={selectedDirectory} onClose={() => setIsSlideshowOpen(false)} />}
    </div>
  )
}

// Slideshow Modal Componentmponent
function SlideshowModal({ directoryId, onClose }: { directoryId: string; onClose: () => void }) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    fetchSlides()
  }, [directoryId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && slides.length > 0) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      }, 5000) // 5 seconds per slide
    }
    return () => clearInterval(interval)
  }, [isPlaying, slides.length])

  const fetchSlides = async () => {
    try {
      const { data, error } = await supabase
        .from("slides")
        .select("*")
        .eq("directory_id", directoryId)
        .eq("is_published", true)
        .order("slide_order", { ascending: true })

      if (error) throw error
      setSlides(data || [])
    } catch (error) {
      console.error("Error fetching slides:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-white">Loading slideshow...</div>
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg text-center">
          <p className="mb-4">No published slides in this directory</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    )
  }

  const slide = slides[currentSlide]

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Slideshow Header */}
      <div className="bg-black bg-opacity-50 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            <Play className="w-4 h-4" />
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <span className="text-sm">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
          ✕ Close
        </Button>
      </div>

      {/* Slide Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="p-8">
            <h1 className="text-4xl font-bold mb-6 text-center">{slide.title}</h1>

            {slide.image_url && (
              <div className="mb-6 text-center">
                <img
                  src={slide.image_url || "/placeholder.svg"}
                  alt={slide.title}
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}

            <div className="prose max-w-none text-lg leading-relaxed">
              <div className="whitespace-pre-wrap">{slide.body_content}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Slideshow Controls */}
      <div className="bg-black bg-opacity-50 text-white p-4 flex justify-center items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="text-white hover:bg-white hover:bg-opacity-20"
        >
          ← Previous
        </Button>

        <div className="flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full ${index === currentSlide ? "bg-white" : "bg-white bg-opacity-50"}`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className="text-white hover:bg-white hover:bg-opacity-20"
        >
          Next →
        </Button>
      </div>
    </div>
  )
}

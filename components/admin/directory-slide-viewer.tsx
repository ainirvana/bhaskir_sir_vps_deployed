"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Play, FileText, Presentation, Edit, Trash2, ImageIcon, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { generatePresentationData } from "@/app/actions/export-actions"
import { deleteSlide, reorderSlides } from "@/app/actions/slide-actions"

interface SlideDirectory {
  id: string
  name: string
  description: string
  is_published: boolean
  created_at: string
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

interface DirectorySlideViewerProps {
  directoryId: string
  onBack: () => void
  onEditSlide?: (slide: Slide) => void
}

export default function DirectorySlideViewer({ directoryId, onBack, onEditSlide }: DirectorySlideViewerProps) {
  const [directory, setDirectory] = useState<SlideDirectory | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchDirectoryAndSlides()
  }, [directoryId])

  const fetchDirectoryAndSlides = async () => {
    try {
      const [directoryResult, slidesResult] = await Promise.all([
        supabase.from("slide_directories").select("*").eq("id", directoryId).single(),
        supabase.from("slides").select("*").eq("directory_id", directoryId).order("slide_order", { ascending: true }),
      ])

      // Handle PostgrestError explicitly
      if (directoryResult.error) {
        throw new Error(directoryResult.error.message || 'Unknown error');
      }
      if (slidesResult.error) {
        throw new Error(slidesResult.error.message || 'Unknown error');
      }

      setDirectory(directoryResult.data)
      setSlides(slidesResult.data || [])
    } catch (error) {
      console.error("Error fetching directory and slides:", error)
      toast({
        title: "Error",
        description: "Failed to load directory and slides",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSlide = async (slideId: string) => {
    if (!confirm("Are you sure you want to delete this slide?")) return

    try {
      const result = await deleteSlide(slideId)
      if (!result.success) throw new Error(result.error)

      toast({
        title: "Slide deleted",
        description: "The slide has been removed.",
      })

      fetchDirectoryAndSlides()
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
      const result = await reorderSlides(directoryId, slideOrders)
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

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const result = await generatePresentationData(directoryId)
      if (!result.success) {
        if ('error' in result) {
          throw new Error(result.error);
        } else {
          throw new Error('Unknown error occurred');
        }
      }

      // Generate PDF content
      if ('data' in result) {
        const pdfContent = generatePDFContent(result.data)
        downloadFile(pdfContent, `${directory?.name || "slides"}.html`, "text/html")

        toast({
          title: "Export successful",
          description: "Slides exported as HTML (can be printed to PDF)",
        })
      } else {
        throw new Error('Invalid response format')
      }
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

  const handleExportPPTX = async () => {
    setIsExporting(true)
    try {
      const result = await generatePresentationData(directoryId)
      if (!result.success) {
        const errorMessage = 'error' in result ? result.error : 'Unknown error occurred'
        throw new Error(errorMessage)
      }

      // Generate PowerPoint-compatible content
      if ('data' in result) {
        const pptxContent = generatePPTXContent(result.data)
        downloadFile(pptxContent, `${directory?.name || "slides"}.html`, "text/html")

        toast({
          title: "Export successful",
          description: "Slides exported as HTML (PowerPoint compatible)",
        })
      } else {
        throw new Error('Invalid response format')
      }
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
        .slide-number {
            position: absolute;
            bottom: 10px;
            right: 20px;
            font-size: 14px;
            color: #666;
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
            <div class="slide-number">${index + 2} / ${data.totalSlides + 1}</div>
        </div>
        `,
          )
          .join("")}
    </div>
    
    <script>
        // Add PowerPoint-like functionality
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F5') {
                document.documentElement.requestFullscreen();
            }
        });
    </script>
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
    return <div>Loading directory slides...</div>
  }

  if (!directory) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-600 mb-2">Directory not found</h2>
        <Button onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Directories
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Directories
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{directory.name}</h1>
            <p className="text-gray-600">{directory.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsSlideshowOpen(true)} disabled={slides.length === 0}>
            <Play className="w-4 h-4 mr-2" />
            Start Slideshow
          </Button>

          {/* Make export buttons more prominent */}
          <div className="flex items-center space-x-1 border rounded-lg p-1 bg-gray-50">
            <span className="text-xs text-gray-600 px-2">Export:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={slides.length === 0 || isExporting}
              className="bg-red-50 hover:bg-red-100 border-red-200"
            >
              <FileText className="w-4 h-4 mr-1" />
              {isExporting ? "..." : "PDF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPPTX}
              disabled={slides.length === 0 || isExporting}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <Presentation className="w-4 h-4 mr-1" />
              {isExporting ? "..." : "PPTX"}
            </Button>
          </div>

          <Badge variant="outline">{slides.length} slides</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Slides in {directory.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {slides.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No slides in this directory yet.</p>
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
                        <span className="text-sm font-mono w-8">{slide.slide_order}</span>
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
                        <Button size="sm" variant="outline" onClick={() => onEditSlide?.(slide)}>
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

      {/* Directory Slideshow Modal */}
      {isSlideshowOpen && (
        <DirectorySlideshowModal
          directoryId={directoryId}
          directoryName={directory.name}
          onClose={() => setIsSlideshowOpen(false)}
        />
      )}
    </div>
  )
}

// Directory-specific Slideshow Modal
function DirectorySlideshowModal({
  directoryId,
  directoryName,
  onClose,
}: {
  directoryId: string
  directoryName: string
  onClose: () => void
}) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault()
          setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))
          break
        case "ArrowLeft":
          e.preventDefault()
          setCurrentSlide((prev) => Math.max(0, prev - 1))
          break
        case "Escape":
          onClose()
          break
        case "F5":
          e.preventDefault()
          toggleFullscreen()
          break
      }
    }

    document.addEventListener("keydown", handleKeyPress)
    return () => document.removeEventListener("keydown", handleKeyPress)
  }, [slides.length, onClose])

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
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
          <h2 className="text-lg font-semibold">{directoryName}</h2>
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
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen (F5)"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
            ✕ Close
          </Button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-6xl w-full bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="p-12">
            <h1 className="text-5xl font-bold mb-8 text-center text-gray-800">{slide.title}</h1>

            {slide.image_url && (
              <div className="mb-8 text-center">
                <img
                  src={slide.image_url || "/placeholder.svg"}
                  alt={slide.title}
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}

            <div className="prose max-w-none text-xl leading-relaxed text-gray-700">
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
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentSlide ? "bg-white" : "bg-white bg-opacity-50"
              }`}
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

      {/* Keyboard shortcuts help */}
      <div className="absolute bottom-4 left-4 text-white text-xs opacity-75">
        <div>← → : Navigate | Space: Next | F5: Fullscreen | Esc: Exit</div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, ChevronRight, Calendar, BookOpen, Folder, Play } from "lucide-react"

interface SlideDirectory {
  id: string
  name: string
  description: string
  slide_count: number
}

interface Slide {
  id: string
  title: string
  body_content: string
  image_url: string
  slide_order: number
  created_at: string
}

export default function EnhancedSlideViewer() {
  const [directories, setDirectories] = useState<SlideDirectory[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
  const [selectedDirectory, setSelectedDirectory] = useState<string>("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isSlideshowMode, setIsSlideshowMode] = useState(false)

  useEffect(() => {
    fetchDirectories()
  }, [])

  useEffect(() => {
    if (selectedDirectory) {
      fetchSlides(selectedDirectory)
    }
  }, [selectedDirectory])

  const fetchDirectories = async () => {
    try {
      const { data, error } = await supabase
        .from("slide_directories")
        .select(`
          *,
          slides:slides!inner(count)
        `)
        .eq("is_published", true)
        .order("directory_order", { ascending: true })

      if (error) throw error

      const directoriesWithCount =
        data?.map((dir) => ({
          ...dir,
          slide_count: dir.slides?.[0]?.count || 0,
        })) || []

      setDirectories(directoriesWithCount)

      if (directoriesWithCount.length > 0 && !selectedDirectory) {
        setSelectedDirectory(directoriesWithCount[0].id)
      }
    } catch (error) {
      console.error("Error fetching directories:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSlides = async (directoryId: string) => {
    try {
      const { data, error } = await supabase
        .from("slides")
        .select("*")
        .eq("directory_id", directoryId)
        .eq("is_published", true)
        .order("slide_order", { ascending: true })

      if (error) throw error
      setSlides(data || [])
      setCurrentSlide(0)
    } catch (error) {
      console.error("Error fetching slides:", error)
    }
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  if (loading) {
    return <div>Loading study materials...</div>
  }

  if (directories.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-600 mb-2">No study materials available</h2>
        <p className="text-gray-500">Check back later for new content.</p>
      </div>
    )
  }

  if (slides.length === 0 && selectedDirectory) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Study Materials</h1>
          <Select value={selectedDirectory} onValueChange={setSelectedDirectory}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select topic" />
            </SelectTrigger>
            <SelectContent>
              {directories.map((dir) => (
                <SelectItem key={dir.id} value={dir.id}>
                  <div className="flex items-center space-x-2">
                    <Folder className="w-4 h-4" />
                    <span>{dir.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {dir.slide_count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">No slides in this topic</h2>
          <p className="text-gray-500">Try selecting a different topic.</p>
        </div>
      </div>
    )
  }

  const slide = slides[currentSlide]
  const currentDirectory = directories.find((d) => d.id === selectedDirectory)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Study Materials</h1>
        <div className="flex items-center space-x-4">
          <Select value={selectedDirectory} onValueChange={setSelectedDirectory}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select topic" />
            </SelectTrigger>
            <SelectContent>
              {directories.map((dir) => (
                <SelectItem key={dir.id} value={dir.id}>
                  <div className="flex items-center space-x-2">
                    <Folder className="w-4 h-4" />
                    <span>{dir.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {dir.slide_count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setIsSlideshowMode(true)} variant="outline">
            <Play className="w-4 h-4 mr-2" />
            Slideshow
          </Button>

          <Badge variant="outline">
            {currentSlide + 1} of {slides.length}
          </Badge>
        </div>
      </div>

      {currentDirectory && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Folder className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">{currentDirectory.name}</h3>
                <p className="text-sm text-blue-700">{currentDirectory.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Slide Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Slides in Topic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {slides.map((s, index) => (
                <Button
                  key={s.id}
                  variant={index === currentSlide ? "default" : "ghost"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => goToSlide(index)}
                >
                  <div>
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Slide Content */}
        <div className="lg:col-span-3">
          <Card className="min-h-[600px]">
            <CardHeader>
              <CardTitle className="text-2xl">{slide.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {slide.image_url && (
                <div className="w-full">
                  <img
                    src={slide.image_url || "/placeholder.svg"}
                    alt={slide.title}
                    className="w-full max-h-96 object-cover rounded-lg shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              )}

              <div className="prose max-w-none">
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">{slide.body_content}</div>
              </div>

              {/* Navigation Controls */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button onClick={prevSlide} disabled={slides.length <= 1} variant="outline">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <div className="flex space-x-2">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentSlide ? "bg-blue-600" : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>

                <Button onClick={nextSlide} disabled={slides.length <= 1} variant="outline">
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Slideshow Modal */}
      {isSlideshowMode && <SlideshowModal slides={slides} onClose={() => setIsSlideshowMode(false)} />}
    </div>
  )
}

// Student Slideshow Modal
function SlideshowModal({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && slides.length > 0) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      }, 5000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, slides.length])

  const slide = slides[currentSlide]

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
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

      {/* Controls */}
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

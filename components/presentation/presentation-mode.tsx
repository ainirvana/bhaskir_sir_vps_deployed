"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Play, Pause, SkipForward, SkipBack, Maximize, Minimize, Settings, Timer, MousePointer } from "lucide-react"

interface Slide {
  id: string
  title: string
  body_content: string
  image_url: string
  slide_order: number
}

interface PresentationModeProps {
  slides: Slide[]
  directoryName: string
  onClose: () => void
}

export default function PresentationMode({ slides, directoryName, onClose }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [autoAdvanceTime, setAutoAdvanceTime] = useState(5000)
  const [timeRemaining, setTimeRemaining] = useState(autoAdvanceTime)
  const [showSettings, setShowSettings] = useState(false)
  const [pointerMode, setPointerMode] = useState(false)
  const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 })

  // Auto-advance timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && slides.length > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1000) {
            setCurrentSlide((current) => (current + 1) % slides.length)
            return autoAdvanceTime
          }
          return prev - 1000
        })
      }, 1000)
    } else {
      setTimeRemaining(autoAdvanceTime)
    }
    return () => clearInterval(interval)
  }, [isPlaying, slides.length, autoAdvanceTime])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault()
          nextSlide()
          break
        case "ArrowLeft":
          e.preventDefault()
          prevSlide()
          break
        case "Escape":
          if (isFullscreen) {
            exitFullscreen()
          } else {
            onClose()
          }
          break
        case "F5":
        case "f":
          e.preventDefault()
          toggleFullscreen()
          break
        case "p":
          e.preventDefault()
          setIsPlaying(!isPlaying)
          break
        case "h":
          e.preventDefault()
          setShowControls(!showControls)
          break
        case "r":
          e.preventDefault()
          setPointerMode(!pointerMode)
          break
      }
    }

    document.addEventListener("keydown", handleKeyPress)
    return () => document.removeEventListener("keydown", handleKeyPress)
  }, [isPlaying, showControls, pointerMode, isFullscreen])

  // Mouse movement for pointer
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (pointerMode) {
        setPointerPosition({ x: e.clientX, y: e.clientY })
      }
    }

    if (pointerMode) {
      document.addEventListener("mousemove", handleMouseMove)
      return () => document.removeEventListener("mousemove", handleMouseMove)
    }
  }, [pointerMode])

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (showControls && isFullscreen) {
      timeout = setTimeout(() => setShowControls(false), 3000)
    }
    return () => clearTimeout(timeout)
  }, [showControls, isFullscreen])

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))
    setTimeRemaining(autoAdvanceTime)
  }, [slides.length, autoAdvanceTime])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(0, prev - 1))
    setTimeRemaining(autoAdvanceTime)
  }, [autoAdvanceTime])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    return `${seconds}s`
  }

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <Card className="p-6 text-center">
          <p className="mb-4">No slides available for presentation</p>
          <Button onClick={onClose}>Close</Button>
        </Card>
      </div>
    )
  }

  const slide = slides[currentSlide]

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header Controls */}
      <div
        className={`bg-black bg-opacity-75 text-white p-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onMouseEnter={() => setShowControls(true)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold">{directoryName}</h2>
            <Badge variant="outline" className="text-white border-white">
              {currentSlide + 1} / {slides.length}
            </Badge>
            {isPlaying && (
              <div className="flex items-center space-x-2">
                <Timer className="w-4 h-4" />
                <span className="text-sm">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPointerMode(!pointerMode)}
              className={`text-white hover:bg-white hover:bg-opacity-20 ${pointerMode ? "bg-white bg-opacity-20" : ""}`}
            >
              <MousePointer className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 bg-black bg-opacity-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <label className="text-sm">Auto-advance time:</label>
              <select
                value={autoAdvanceTime}
                onChange={(e) => setAutoAdvanceTime(Number(e.target.value))}
                className="bg-white text-black px-2 py-1 rounded text-sm"
              >
                <option value={3000}>3 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={15000}>15 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Slide Content */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
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

        {/* Laser Pointer */}
        {pointerMode && (
          <div
            className="fixed w-4 h-4 bg-red-500 rounded-full pointer-events-none z-10 shadow-lg"
            style={{
              left: pointerPosition.x - 8,
              top: pointerPosition.y - 8,
              boxShadow: "0 0 20px rgba(255, 0, 0, 0.8)",
            }}
          />
        )}
      </div>

      {/* Bottom Controls */}
      <div
        className={`bg-black bg-opacity-75 text-white p-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onMouseEnter={() => setShowControls(true)}
      >
        <div className="flex justify-center items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            <SkipForward className="w-4 h-4" />
          </Button>

          <div className="flex space-x-1 mx-4">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentSlide(index)
                  setTimeRemaining(autoAdvanceTime)
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSlide ? "bg-white" : "bg-white bg-opacity-50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        {isPlaying && (
          <div className="mt-2">
            <div className="w-full bg-white bg-opacity-20 rounded-full h-1">
              <div
                className="bg-white h-1 rounded-full transition-all duration-1000"
                style={{ width: `${((autoAdvanceTime - timeRemaining) / autoAdvanceTime) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts help */}
      <div className="absolute bottom-4 left-4 text-white text-xs opacity-50">
        <div>← → Space: Navigate | P: Play/Pause | F: Fullscreen | H: Hide controls | R: Pointer | Esc: Exit</div>
      </div>
    </div>
  )
}

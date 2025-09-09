"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createSlideDirectory } from "@/app/actions/slide-actions"

interface Article {
  id: string
  title: string
  intro: string | null
  published_date: string | null
  source_name: string
}

interface AISlideGeneratorProps {
  onSuccess: () => void
}

export function AISlideGenerator({ onSuccess }: AISlideGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticleId, setSelectedArticleId] = useState("")
  const [directoryName, setDirectoryName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles?page=1&limit=100')
      if (!response.ok) {
        throw new Error('Failed to fetch articles')
      }
      const data = await response.json()
      setArticles(data.articles || [])
    } catch (error) {
      console.error("Error fetching articles:", error)
      toast({
        title: "Error fetching articles",
        description: "Failed to load articles for AI generation",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchArticles()
    }
  }, [isOpen])

  const handleGeneration = async () => {
    if (!selectedArticleId || !directoryName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an article and enter a directory name",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      // First create a new directory for the AI-generated slides
      const directoryResult = await createSlideDirectory({
        name: directoryName,
        description: `AI-generated slides from article`,
        createdBy: "admin", // You may want to get this from auth context
      })

      if (!directoryResult.success) {
        throw new Error('Failed to create directory')
      }

      const directoryId = directoryResult.directory.id

      // Generate slides from the selected article
      const response = await fetch(`/api/articles/${selectedArticleId}/generate-slides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: selectedArticleId,
          directoryId: directoryId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate slides')
      }

      const result = await response.json()

      toast({
        title: "Slides Generated Successfully!",
        description: `Generated ${result.slidesCount} slides from the article`,
      })

      // Close the dialog and reset form
      setIsOpen(false)
      setSelectedArticleId("")
      setDirectoryName("")
      
      // Notify parent component
      onSuccess()

    } catch (error) {
      console.error("Error generating slides:", error)
      toast({
        title: "AI Generation Failed",
        description: (error as Error).message || "Failed to generate slides from article",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const resetForm = () => {
    setSelectedArticleId("")
    setDirectoryName("")
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="w-4 h-4 mr-2" />
          AI Generate from Article
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Slides from Article</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="directoryName">Directory Name</Label>
            <Input
              id="directoryName"
              value={directoryName}
              onChange={(e) => setDirectoryName(e.target.value)}
              placeholder="Enter directory name"
              required
            />
          </div>
          <div>
            <Label htmlFor="articleSelect">Select Article</Label>
            <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an article" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {articles.map((article) => (
                  <SelectItem key={article.id} value={article.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium truncate max-w-[300px]">
                        {article.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {article.source_name} • {article.published_date ? new Date(article.published_date).toLocaleDateString() : 'No date'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={handleGeneration} 
              disabled={isGenerating || !selectedArticleId || !directoryName.trim()}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Slides
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { PPT_TEMPLATES } from "@/lib/ppt-templates";
import { generateAndDownloadPresentation } from "@/lib/client/ppt-generator";
import { generateQuiz } from "@/lib/quiz-generator";
import Image from "next/image";
import { Sparkles, Presentation, FileQuestion } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Article {
  id: string;
  title: string;
  image_url?: string | null;
  published_date?: string | null;
  intro?: string | null;
}

interface PPTGeneratorProps {
  articles: Article[];
}

export function PPTGenerator({ articles }: PPTGeneratorProps) {
  // State for form data
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [template, setTemplate] = useState(PPT_TEMPLATES[0].id);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [aiEnabledArticles, setAiEnabledArticles] = useState<string[]>(articles.map(article => article.id));
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Quiz generation options
  const [generateQuizEnabled, setGenerateQuizEnabled] = useState(false);
  const [quizQuestionsPerArticle, setQuizQuestionsPerArticle] = useState(3);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // Handle article selection
  const handleArticleToggle = (articleId: string) => {
    setSelectedArticles(prev => 
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  // Handle AI toggle for an article
  const handleAiToggle = (articleId: string) => {
    setAiEnabledArticles(prev =>
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  // Handle form submission for presentation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please enter a title for your presentation",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedArticles.length === 0) {
      toast({
        title: "No articles selected",
        description: "Please select at least one article for your presentation",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Use the client-safe function to generate and download the presentation
      await generateAndDownloadPresentation(
        title,
        subtitle,
        template,
        selectedArticles,
        aiEnabledArticles // Pass AI-enabled article IDs
      );
      
      toast({
        title: "Success!",
        description: "Your PowerPoint presentation has been generated",
        variant: "default"
      });
      
      // If quiz generation is enabled, generate the quiz after presentation is done
      if (generateQuizEnabled) {
        handleQuizGeneration();
      }
      
    } catch (error: any) {
      console.error('Error generating presentation:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to generate presentation',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle quiz generation
  const handleQuizGeneration = async () => {
    if (selectedArticles.length === 0) {
      toast({
        title: "No articles selected",
        description: "Please select at least one article for your quiz",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsGeneratingQuiz(true);
      
      // Show a toast that we're generating the quiz
      toast({
        title: "Generating quiz...",
        description: "This may take a moment as our AI analyzes the articles",
        duration: 5000,
      });
      
      await generateQuiz({
        title: title || "Quiz on Selected Articles",
        articleIds: selectedArticles,
        questionsPerArticle: quizQuestionsPerArticle
      });
      
      toast({
        title: "Success!",
        description: "Your quiz has been generated and saved. You can find it in the Quizzes section.",
        variant: "default"
      });
      
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Error Generating Quiz",
        description: error.message || 'Failed to generate quiz. Please try selecting different articles or reducing the number of questions per article.',
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Generate Learning Materials</CardTitle>
          <CardDescription>Create presentations and quizzes from selected articles</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Presentation Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Presentation Title</Label>
                <Input
                  id="title"
                  placeholder="Enter presentation title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="subtitle">Subtitle (Optional)</Label>
                <Input
                  id="subtitle"
                  placeholder="Enter subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                />
              </div>
            </div>
            
            {/* Template Selection */}
            <div className="space-y-4">
              <Label>Select Template</Label>
              <RadioGroup 
                value={template}
                onValueChange={setTemplate}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {PPT_TEMPLATES.map((tmpl) => (
                  <div key={tmpl.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={tmpl.id} id={`template-${tmpl.id}`} />
                    <Label 
                      htmlFor={`template-${tmpl.id}`}
                      className="flex flex-col cursor-pointer"
                    >
                      <span className="font-medium mb-1">{tmpl.name}</span>
                      <span className="text-sm text-muted-foreground">{tmpl.description}</span>
                      
                      {tmpl.thumbnail && (
                        <div className="mt-2 border rounded overflow-hidden">
                          <Image 
                            src={tmpl.thumbnail} 
                            alt={tmpl.name} 
                            width={200} 
                            height={120}
                            className="object-cover"
                          />
                        </div>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            {/* Article Selection */}
            <div className="space-y-4">
              <Label>Select Articles (at least one)</Label>
              {articles.length === 0 ? (
                <p className="text-muted-foreground">No articles available</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-3 border rounded-md p-4">
                  {articles.map((article) => (
                    <div 
                      key={article.id} 
                      className="flex items-start space-x-3 p-2 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox 
                        id={`article-${article.id}`}
                        checked={selectedArticles.includes(article.id)}
                        onCheckedChange={() => handleArticleToggle(article.id)}
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor={`article-${article.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {article.title}
                        </Label>
                        {article.intro && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {article.intro}
                          </p>
                        )}
                        {/* AI toggle option - only shows if article is selected */}
                        {selectedArticles.includes(article.id) && (
                          <div className="mt-2 flex items-center space-x-2">
                            <Checkbox
                              id={`ai-${article.id}`}
                              checked={aiEnabledArticles.includes(article.id)}
                              onCheckedChange={() => handleAiToggle(article.id)}
                            />
                            <Label 
                              htmlFor={`ai-${article.id}`}
                              className="cursor-pointer flex items-center text-xs"
                            >
                              <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
                              Use AI to generate slides
                            </Label>
                          </div>
                        )}
                      </div>
                      {article.image_url && (
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                          <Image 
                            src={article.image_url} 
                            alt={article.title} 
                            width={64} 
                            height={64} 
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Quiz Generation Options */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="generate-quiz">Generate Quiz</Label>
                  <p className="text-sm text-muted-foreground">
                    Create a multiple-choice quiz from selected articles
                  </p>
                </div>
                <Switch
                  id="generate-quiz"
                  checked={generateQuizEnabled}
                  onCheckedChange={setGenerateQuizEnabled}
                />
              </div>
              
              {generateQuizEnabled && (
                <div className="pl-6 border-l-2 border-muted mt-4 space-y-4">
                  <div>
                    <Label htmlFor="questions-per-article">Questions per Article</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        id="questions-per-article"
                        type="number"
                        min={1}
                        max={10}
                        value={quizQuestionsPerArticle}
                        onChange={(e) => setQuizQuestionsPerArticle(Number(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        questions per article (1-10)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-wrap gap-4 justify-end">
            {generateQuizEnabled && (
              <Button 
                type="button"
                variant="outline"
                onClick={handleQuizGeneration}
                disabled={isGeneratingQuiz || selectedArticles.length === 0}
                className="flex items-center gap-2"
              >
                {isGeneratingQuiz ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <FileQuestion className="h-4 w-4" />
                    Generate Quiz Only
                  </>
                )}
              </Button>
            )}
            
            <Button 
              type="submit" 
              disabled={isGenerating || selectedArticles.length === 0}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Presentation className="h-4 w-4" />
                  {generateQuizEnabled ? 'Generate Presentation & Quiz' : 'Generate Presentation'}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

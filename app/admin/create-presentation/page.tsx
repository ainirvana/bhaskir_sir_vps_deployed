"use client";

import { useState, useEffect } from 'react';
import { AdminOnly } from '@/components/auth/role-guard';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Presentation, 
  FileText, 
  Wand2, 
  Save, 
  Globe, 
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { getArticlesForManagement } from '@/app/actions/content-management';

interface PresentationSlide {
  id: string;
  title: string;
  content: string;
  slideType: 'title' | 'content' | 'bullet-points' | 'image' | 'conclusion';
  order: number;
}

interface PresentationData {
  title: string;
  description: string;
  subject: string;
  slides: PresentationSlide[];
  sourceArticleId?: string;
  isPublished: boolean;
}

export default function CreatePresentationPage() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  
  const [presentation, setPresentation] = useState<PresentationData>({
    title: '',
    description: '',
    subject: '',
    slides: [],
    isPublished: false
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const result = await getArticlesForManagement();
      if (result.success) {
        setArticles(result.data);
      } else {
        console.error('Error loading articles:', result.error);
        toast({
          title: "Error",
          description: "Failed to load articles. Please refresh the page.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      toast({
        title: "Error",
        description: "Failed to load articles. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  const generateFromArticle = async () => {
    if (!selectedArticle) {
      toast({
        title: "No Article Selected",
        description: "Please select an article to generate a presentation from.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // This would be replaced with actual AI generation
      const slides: PresentationSlide[] = [
        {
          id: '1',
          title: selectedArticle.title,
          content: 'Introduction to the topic',
          slideType: 'title',
          order: 1
        },
        {
          id: '2',
          title: 'Key Points',
          content: generateKeyPoints(selectedArticle.content || selectedArticle.summary || ''),
          slideType: 'bullet-points',
          order: 2
        },
        {
          id: '3',
          title: 'Main Content',
          content: (selectedArticle.content || selectedArticle.summary || '').slice(0, 500) + '...',
          slideType: 'content',
          order: 3
        },
        {
          id: '4',
          title: 'Conclusion',
          content: 'Summary and key takeaways',
          slideType: 'conclusion',
          order: 4
        }
      ];

      setPresentation(prev => ({
        ...prev,
        title: `Presentation: ${selectedArticle.title}`,
        description: `Generated from article: ${selectedArticle.title}`,
        subject: selectedArticle.source || 'General',
        sourceArticleId: selectedArticle.id,
        slides
      }));

      toast({
        title: "Presentation Generated!",
        description: "Your presentation has been generated. You can now edit and customize it.",
        variant: "default"
      });

    } catch (error) {
      console.error('Error generating presentation:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate presentation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateKeyPoints = (content: string): string => {
    // Simple key point extraction (would be replaced with AI)
    const sentences = content.split('.').filter(s => s.trim().length > 20);
    const keyPoints = sentences.slice(0, 5).map((s, i) => `• ${s.trim()}`);
    return keyPoints.join('\n');
  };

  const addSlide = (type: PresentationSlide['slideType'] = 'content') => {
    const newSlide: PresentationSlide = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      content: '',
      slideType: type,
      order: presentation.slides.length + 1
    };
    setPresentation(prev => ({
      ...prev,
      slides: [...prev.slides, newSlide]
    }));
  };

  const updateSlide = (slideId: string, updates: Partial<PresentationSlide>) => {
    setPresentation(prev => ({
      ...prev,
      slides: prev.slides.map(slide =>
        slide.id === slideId ? { ...slide, ...updates } : slide
      )
    }));
  };

  const deleteSlide = (slideId: string) => {
    setPresentation(prev => ({
      ...prev,
      slides: prev.slides.filter(slide => slide.id !== slideId)
        .map((slide, index) => ({ ...slide, order: index + 1 }))
    }));
  };

  const handleSave = async (publish: boolean = false) => {
    if (!presentation.title || !presentation.description || presentation.slides.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and add at least one slide.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const presentationToSave = {
        ...presentation,
        isPublished: publish,
        createdBy: userProfile?.id || ''
      };

      // This would be replaced with actual save function
      console.log('Saving presentation:', presentationToSave);
      
      toast({
        title: publish ? "Presentation Published!" : "Presentation Saved!",
        description: publish 
          ? "Your presentation has been saved and published. Students can now access it."
          : "Your presentation has been saved as a draft. You can publish it later from the Content Management page.",
        variant: "default"
      });

      // Reset form
      setPresentation({
        title: '',
        description: '',
        subject: '',
        slides: [],
        isPublished: false
      });
      setSelectedArticle(null);

    } catch (error) {
      console.error('Error saving presentation:', error);
      toast({
        title: "Error",
        description: "Failed to save presentation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getSlideTypeIcon = (type: string) => {
    switch (type) {
      case 'title': return '📋';
      case 'content': return '📝';
      case 'bullet-points': return '📌';
      case 'image': return '🖼️';
      case 'conclusion': return '✅';
      default: return '📄';
    }
  };

  return (
    <AdminOnly>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Presentation className="h-8 w-8 text-primary" />
                  Create New Presentation
                </h1>
                <p className="text-muted-foreground">
                  Generate AI-powered presentations from articles
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button 
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <Globe className="h-4 w-4 mr-2" />
                Save & Publish
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Generation & Settings */}
            <div className="lg:col-span-1 space-y-6">
              {/* AI Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    AI Generation
                  </CardTitle>
                  <CardDescription>Generate slides from existing articles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select Article</Label>
                    <Select
                      value={selectedArticle?.id || ""}
                      onValueChange={(value) => {
                        const article = articles.find(a => a.id === value);
                        setSelectedArticle(article);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an article..." />
                      </SelectTrigger>
                      <SelectContent>
                        {articles.map((article) => (
                          <SelectItem key={article.id} value={article.id}>
                            {article.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedArticle && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-sm">{selectedArticle.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Source: {selectedArticle.source}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedArticle.scraped_at && 
                          `Scraped: ${new Date(selectedArticle.scraped_at).toLocaleDateString()}`
                        }
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={generateFromArticle}
                    disabled={loading || !selectedArticle}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Presentation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Presentation Settings</CardTitle>
                  <CardDescription>Configure your presentation details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={presentation.title}
                      onChange={(e) => setPresentation(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter presentation title..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={presentation.description}
                      onChange={(e) => setPresentation(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this presentation covers..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={presentation.subject}
                      onChange={(e) => setPresentation(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., Current Affairs, Science..."
                    />
                  </div>

                  {/* Stats */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Slides</span>
                      <Badge variant="secondary">{presentation.slides.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Estimated Duration</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.ceil(presentation.slides.length * 2)} min
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Slides */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Slides</CardTitle>
                      <CardDescription>Create and organize your presentation slides</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => addSlide('content')}>
                        Add Content Slide
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addSlide('bullet-points')}>
                        Add Bullet Points
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {presentation.slides.length === 0 ? (
                    <div className="text-center py-12">
                      <Presentation className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No slides yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Generate slides from an article or create them manually
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={() => addSlide('title')}>
                          Add Title Slide
                        </Button>
                        <Button onClick={() => addSlide('content')}>
                          Add Content Slide
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {presentation.slides
                        .sort((a, b) => a.order - b.order)
                        .map((slide, index) => (
                        <Card key={slide.id} className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {getSlideTypeIcon(slide.slideType)} Slide {slide.order}
                              </Badge>
                              <Badge variant="secondary" className="capitalize">
                                {slide.slideType.replace('-', ' ')}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSlide(slide.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <Label>Slide Title</Label>
                              <Input
                                value={slide.title}
                                onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                                placeholder="Enter slide title..."
                              />
                            </div>

                            <div>
                              <Label>Content</Label>
                              <Textarea
                                value={slide.content}
                                onChange={(e) => updateSlide(slide.id, { content: e.target.value })}
                                placeholder="Enter slide content..."
                                rows={4}
                              />
                            </div>

                            <div>
                              <Label>Slide Type</Label>
                              <Select
                                value={slide.slideType}
                                onValueChange={(value: PresentationSlide['slideType']) =>
                                  updateSlide(slide.id, { slideType: value })
                                }
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="title">Title Slide</SelectItem>
                                  <SelectItem value="content">Content Slide</SelectItem>
                                  <SelectItem value="bullet-points">Bullet Points</SelectItem>
                                  <SelectItem value="image">Image Slide</SelectItem>
                                  <SelectItem value="conclusion">Conclusion</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tips */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Presentation Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Clear Structure</h4>
                    <p className="text-sm text-muted-foreground">
                      Start with a title slide, organize content logically, and end with conclusions
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Concise Content</h4>
                    <p className="text-sm text-muted-foreground">
                      Keep text brief and use bullet points for better readability
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Engaging Titles</h4>
                    <p className="text-sm text-muted-foreground">
                      Use descriptive, engaging titles for each slide
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Logical Flow</h4>
                    <p className="text-sm text-muted-foreground">
                      Arrange slides in a logical sequence that tells a story
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminOnly>
  );
}

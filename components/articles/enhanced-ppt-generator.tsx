"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  BookOpen, 
  Eye,
  ChevronDown,
  ChevronUp,
  Tag,
  Globe,
  TrendingUp,
  Users,
  GraduationCap,
  Presentation,
  FileQuestion,
  Settings,
  Save,
  History
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import Image from "next/image";
import { toast } from "@/components/ui/use-toast";
import { PPT_TEMPLATES } from "@/lib/ppt-templates";
import { generateAndDownloadPresentation } from "@/lib/client/ppt-generator";
import { generateQuiz } from "@/lib/quiz-generator";

interface Article {
  id: string;
  title: string;
  image_url?: string | null;
  published_date?: string | null;
  intro?: string | null;
  source_name?: string;
  content?: string;
  tags?: string[];
  difficulty_level?: 'elementary' | 'middle' | 'high' | 'college';
  estimated_read_time?: number;
}

interface EnhancedPPTGeneratorProps {
  articles: Article[];
  onSourceFilterChange?: (source: string) => void;
}

const DATE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' }
];



const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'source', label: 'By Source' },

];

export function EnhancedPPTGenerator({ articles, onSourceFilterChange }: EnhancedPPTGeneratorProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [template, setTemplate] = useState(PPT_TEMPLATES[0].id);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [aiEnabledArticles, setAiEnabledArticles] = useState<string[]>(articles.map(article => article.id));
  
  // Presentation options
  const [slideCount, setSlideCount] = useState('auto');
  
  // Quiz generation options
  const [generateQuizEnabled, setGenerateQuizEnabled] = useState(false);
  const [quizQuestionsPerArticle, setQuizQuestionsPerArticle] = useState(3);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const [sortBy, setSortBy] = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // UI state
  const [expandedArticles, setExpandedArticles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('selection');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get unique sources and tags for filters
  const uniqueSources = useMemo(() => {
    const sources = [...new Set(articles.map(a => a.source_name).filter(Boolean))];
    console.log('Available sources from articles:', sources);
    console.log('Total articles:', articles.length);
    return sources.sort();
  }, [articles]);
  
  const uniqueTags = useMemo(() => {
    const tags = [...new Set(articles.flatMap(a => a.tags || []))];
    return tags.sort();
  }, [articles]);
  
  // Filter articles based on current filters
  const filteredArticles = useMemo(() => {
    console.log('Filtering articles:', {
      totalArticles: articles.length,
      sourceFilter,
      searchTerm,
      dateFilter
    });
    
    let filtered = articles;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(searchLower) ||
        article.intro?.toLowerCase().includes(searchLower) ||
        article.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Date filter
    if (dateFilter !== 'all' && dateFilter) {
      if (dateFilter === 'custom') {
        // Custom date range
        if (customStartDate || customEndDate) {
          filtered = filtered.filter(article => {
            const articleDate = article.published_date || article.date || article.created_at;
            if (!articleDate) return false;
            const date = new Date(articleDate);
            
            if (customStartDate && date < new Date(customStartDate)) return false;
            if (customEndDate && date > new Date(customEndDate + 'T23:59:59')) return false;
            return true;
          });
        }
      } else {
        // Preset date ranges
        const now = new Date();
        let cutoffDate: Date;
        
        switch (dateFilter) {
          case 'today':
            cutoffDate = subDays(now, 1);
            break;
          case 'week':
            cutoffDate = subWeeks(now, 1);
            break;
          case 'month':
            cutoffDate = subMonths(now, 1);
            break;
          case 'quarter':
            cutoffDate = subMonths(now, 3);
            break;
          default:
            cutoffDate = new Date(0);
        }
        
        filtered = filtered.filter(article => {
          const articleDate = article.published_date || article.date || article.created_at;
          if (!articleDate) return false;
          return new Date(articleDate) >= cutoffDate;
        });
      }
    }
    
    // Source filter is now handled server-side via API call
    

    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.published_date || 0).getTime() - new Date(a.published_date || 0).getTime();
        case 'date_asc':
          return new Date(a.published_date || 0).getTime() - new Date(b.published_date || 0).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'source':
          return (a.source_name || '').localeCompare(b.source_name || '');

        default:
          return 0;
      }
    });
    
    return filtered;
  }, [articles, searchTerm, dateFilter, customStartDate, customEndDate, sortBy]);
  
  // Handle article selection
  const handleArticleToggle = (articleId: string) => {
    setSelectedArticles(prev => 
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };
  
  // Toggle article expansion
  const toggleArticleExpansion = (articleId: string) => {
    setExpandedArticles(prev =>
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSourceFilter('all');

    setSortBy('date_desc');
  };
  
  // Quick select actions
  const selectAllVisible = () => {
    const visibleIds = filteredArticles.map(a => a.id);
    setSelectedArticles(prev => [...new Set([...prev, ...visibleIds])]);
  };
  
  const clearSelection = () => {
    setSelectedArticles([]);
    setAiEnabledArticles([]);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      // Auto-generate title if not provided
      const autoTitle = `Presentation - ${new Date().toLocaleDateString()}`;
      setTitle(autoTitle);
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
      let quizLink = null;
      
      // If quiz generation is enabled, generate the quiz FIRST
      if (generateQuizEnabled) {
        toast({
          title: "Generating quiz first...",
          description: "Creating quiz before presentation to include QR code",
          duration: 3000,
        });
        
        quizLink = await handleQuizGenerationForPresentation();
      }
      
      // Generate presentation with optional quiz link for QR code
      await generateAndDownloadPresentation(
        title,
        subtitle,
        template,
        selectedArticles,
        aiEnabledArticles, // Pass AI-enabled article IDs
        quizLink // Pass quiz link for QR code slide
      );
      
      toast({
        title: "Success!",
        description: generateQuizEnabled 
          ? "Quiz created and presentation with QR code has been generated and downloaded"
          : "Your PowerPoint presentation has been generated and downloaded",
        variant: "default"
      });
      
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
  
  // Generate intelligent quiz title based on selected articles
  const generateQuizTitle = () => {
    if (title && title.length > 5) {
      return title; // Use user-provided title if it's meaningful
    }
    
    // Get selected article objects
    const selectedArticleObjects = filteredArticles.filter(article => selectedArticles.includes(article.id));
    
    if (selectedArticleObjects.length === 0) {
      return "Educational Quiz";
    }
    
    // Extract common themes/topics from article titles
    const allWords = selectedArticleObjects.map(article => 
      article.title.toLowerCase().split(/\s+/)
    ).flat();
    
    // Common topics and their related keywords
    const topicKeywords = {
      'Technology': ['technology', 'digital', 'ai', 'innovation', 'tech', 'computer', 'software', 'internet'],
      'Science': ['science', 'research', 'study', 'discovery', 'scientific', 'space', 'physics', 'chemistry'],
      'Politics': ['government', 'policy', 'political', 'election', 'parliament', 'minister', 'legislation'],
      'Economics': ['economic', 'economy', 'market', 'financial', 'trade', 'business', 'gdp', 'inflation'],
      'Environment': ['environment', 'climate', 'green', 'pollution', 'carbon', 'renewable', 'sustainability'],
      'Health': ['health', 'medical', 'disease', 'treatment', 'healthcare', 'medicine', 'hospital'],
      'Education': ['education', 'school', 'university', 'learning', 'student', 'academic'],
      'International': ['international', 'global', 'world', 'country', 'nation', 'foreign', 'summit'],
      'Culture': ['culture', 'art', 'heritage', 'tradition', 'festival', 'cultural', 'history']
    };
    
    // Find most relevant topics
    const topicScores: Record<string, number> = {};
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const score = keywords.reduce((count, keyword) => {
        return count + allWords.filter(word => word.includes(keyword) || keyword.includes(word)).length;
      }, 0);
      if (score > 0) {
        topicScores[topic] = score;
      }
    });
    
    // Generate title based on findings
    let generatedTitle = "";
    const topTopics = Object.entries(topicScores)
      .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
      .slice(0, 2)
      .map(([topic]) => topic);
    
    if (topTopics.length > 0) {
      if (topTopics.length === 1) {
        generatedTitle = `${topTopics[0]} Quiz`;
      } else {
        generatedTitle = `${topTopics[0]} & ${topTopics[1]} Quiz`;
      }
    } else {
      // Fallback: use source or create generic title
      const sources = [...new Set(selectedArticleObjects.map(a => a.source_name).filter(Boolean))];
      if (sources.length === 1) {
        generatedTitle = `${sources[0]} Current Affairs Quiz`;
      } else {
        generatedTitle = `Current Affairs Quiz - ${selectedArticleObjects.length} Articles`;
      }
    }
    
    // Add date context
    const today = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"];
    generatedTitle += ` (${monthNames[today.getMonth()]} ${today.getFullYear()})`;
    
    return generatedTitle;
  };

  // Handle quiz generation for standalone use
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
      
      // Generate intelligent quiz title
      const quizTitle = generateQuizTitle();
      
      // Show a toast that we're generating the quiz
      toast({
        title: "Generating quiz...",
        description: "This may take a moment as our AI analyzes the articles",
        duration: 5000,
      });
      
      console.log('Starting quiz generation with:', {
        title: quizTitle,
        articleIds: selectedArticles,
        questionsPerArticle: quizQuestionsPerArticle
      });
      
      await generateQuiz({
        title: quizTitle,
        articleIds: selectedArticles,
        questionsPerArticle: quizQuestionsPerArticle
      });
      
      console.log('Quiz generation completed successfully');
      
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Quiz Generation Failed",
        description: error.message || 'Failed to generate quiz. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Handle quiz generation for presentation (returns quiz link)
  const handleQuizGenerationForPresentation = async (): Promise<string | null> => {
    try {
      setIsGeneratingQuiz(true);
      
      // Generate intelligent quiz title
      const quizTitle = generateQuizTitle();
      
      console.log('Starting quiz generation for presentation with:', {
        title: quizTitle,
        articleIds: selectedArticles,
        questionsPerArticle: quizQuestionsPerArticle
      });
      
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: quizTitle,
          articleIds: selectedArticles,
          questionsPerArticle: quizQuestionsPerArticle
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate quiz');
      }
      
      const quizData = await response.json();
      console.log('Quiz generation completed successfully:', quizData);
      
      // Return the student quiz link
      const baseUrl = window.location.origin;
      return `${baseUrl}/student/quizzes/${quizData.id}`;
      
    } catch (error: any) {
      console.error('Error generating quiz for presentation:', error);
      toast({
        title: "Quiz Generation Failed",
        description: error.message || 'Failed to generate quiz. Presentation will be created without QR code.',
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="selection" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Select Articles
          </TabsTrigger>
          <TabsTrigger value="customization" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Customize
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview & Generate
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="selection" className="space-y-6">
          {/* Enhanced Filters */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Find Articles</CardTitle>
                  <CardDescription>
                    Search and filter articles to create your presentation
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                  {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles by title, content, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Advanced Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date Range
                    </Label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FILTERS.map(filter => (
                          <SelectItem key={filter.value} value={filter.value}>
                            {filter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {dateFilter === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">Start Date</Label>
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End Date</Label>
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Source
                    </Label>
                    <Select value={sourceFilter} onValueChange={(value) => {
                      setSourceFilter(value);
                      onSourceFilterChange?.(value);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="GKToday">GKToday</SelectItem>
                        <SelectItem value="DrishtiIAS">DrishtiIAS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  

                  
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Sort By
                    </Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {/* Filter Summary & Actions */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>
                    Showing {filteredArticles.length} of {articles.length} articles
                  </span>
                  {selectedArticles.length > 0 && (
                    <Badge variant="secondary">
                      {selectedArticles.length} selected
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectAllVisible}>
                    Select All Visible
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Enhanced Article List */}
          <Card>
            <CardHeader>
              <CardTitle>Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {filteredArticles.map((article) => {
                    const isSelected = selectedArticles.includes(article.id);
                    const isExpanded = expandedArticles.includes(article.id);
                    
                    return (
                      <Card key={article.id} className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Checkbox 
                              id={`article-${article.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleArticleToggle(article.id)}
                              className="mt-1"
                            />
                            
                            {article.image_url && (
                              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                <Image 
                                  src={article.image_url} 
                                  alt={article.title} 
                                  width={80} 
                                  height={80} 
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <Label 
                                htmlFor={`article-${article.id}`}
                                className="font-medium cursor-pointer text-base leading-tight hover:text-primary"
                              >
                                {article.title}
                              </Label>
                              
                              <div className="flex items-center gap-2 mt-2 mb-3">
                                {article.source_name && (
                                  <Badge variant="outline" className="text-xs">
                                    <Globe className="h-3 w-3 mr-1" />
                                    {article.source_name}
                                  </Badge>
                                )}

                                {article.estimated_read_time && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {article.estimated_read_time} min
                                  </Badge>
                                )}
                                {(article.published_date || article.date) && (
                                  <span className="text-xs text-muted-foreground">
                                    {(() => {
                                      try {
                                        const date = new Date(article.published_date || article.date);
                                        return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM dd, yyyy');
                                      } catch {
                                        return 'Invalid date';
                                      }
                                    })()}
                                  </span>
                                )}
                              </div>
                              
                              {article.intro && (
                                <p className={`text-sm text-muted-foreground leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                  {article.intro}
                                </p>
                              )}
                              
                              {article.tags && article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {article.tags.slice(0, isExpanded ? undefined : 3).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      <Tag className="h-2 w-2 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                  {!isExpanded && article.tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{article.tags.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between mt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleArticleExpansion(article.id)}
                                  className="text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  {isExpanded ? 'Show Less' : 'Show More'}
                                </Button>
                                
                                {isSelected && (
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`ai-${article.id}`}
                                      checked={aiEnabledArticles.includes(article.id)}
                                      onCheckedChange={() => {
                                        setAiEnabledArticles(prev =>
                                          prev.includes(article.id)
                                            ? prev.filter(id => id !== article.id)
                                            : [...prev, article.id]
                                        );
                                      }}
                                    />
                                    <Label htmlFor={`ai-${article.id}`} className="text-xs cursor-pointer">
                                      AI Enhancement
                                    </Label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="customization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Presentation Settings</CardTitle>
              <CardDescription>Customize your presentation to match your teaching needs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pres-title">Presentation Title</Label>
                  <Input
                    id="pres-title"
                    placeholder="e.g., Technology Trends in Education, Current Affairs Update..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank for auto-generated title based on selected articles
                  </p>
                </div>
                <div>
                  <Label htmlFor="pres-subtitle">Subtitle (Optional)</Label>
                  <Input
                    id="pres-subtitle"
                    placeholder="Enter subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Advanced Options */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <Label>Number of Slides</Label>
                  <Select value={slideCount} onValueChange={setSlideCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Recommended)</SelectItem>
                      <SelectItem value="5">5 Slides</SelectItem>
                      <SelectItem value="10">10 Slides</SelectItem>
                      <SelectItem value="15">15 Slides</SelectItem>
                      <SelectItem value="20">20 Slides</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Template Selection */}
              <div>
                <Label className="text-base font-medium mb-4 block">Template Style</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PPT_TEMPLATES.map((tmpl) => (
                    <Card key={tmpl.id} className={`cursor-pointer transition-all ${template === tmpl.id ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-4" onClick={() => setTemplate(tmpl.id)}>
                        <div className="aspect-video bg-muted rounded mb-3 flex items-center justify-center">
                          {tmpl.thumbnail ? (
                            <Image 
                              src={tmpl.thumbnail} 
                              alt={tmpl.name} 
                              width={200} 
                              height={120}
                              className="object-cover rounded"
                            />
                          ) : (
                            <Presentation className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <h4 className="font-medium">{tmpl.name}</h4>
                        <p className="text-sm text-muted-foreground">{tmpl.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-6">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Presentation Preview</CardTitle>
                <CardDescription>Review your selections before generating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Presentation Details</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Title:</strong> {title || 'Untitled Presentation'}</p>
                        <p><strong>Subtitle:</strong> {subtitle || 'None'}</p>
                        <p><strong>Template:</strong> {PPT_TEMPLATES.find(t => t.id === template)?.name}</p>
                        <p><strong>Estimated Slides:</strong> {slideCount}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Selected Articles</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedArticles.length} article{selectedArticles.length !== 1 ? 's' : ''} selected
                      </p>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {selectedArticles.map(articleId => {
                            const article = articles.find(a => a.id === articleId);
                            return article ? (
                              <div key={articleId} className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="w-fit">
                                  {aiEnabledArticles.includes(articleId) ? '🤖' : '📄'}
                                </Badge>
                                <span className="truncate">{article.title}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 justify-end pt-6 border-t">
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
                          {generateQuizEnabled ? 'Generate Quiz & Presentation with QR Code' : 'Generate Presentation'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

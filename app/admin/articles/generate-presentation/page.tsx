'use client';

import { useState, useEffect } from 'react';
import { PPTGenerator } from '@/components/articles/ppt-generator';
import { EnhancedPPTGenerator } from '@/components/articles/enhanced-ppt-generator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronRight, Presentation, FileText, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Helper functions for mock data generation
const generateMockTags = (title: string, intro?: string, source?: string) => {
  const tagMappings = {
    // Science & Technology
    'sensor': ['Technology', 'Science', 'Innovation'],
    'space': ['Science', 'Technology', 'International'],
    'radio': ['Technology', 'Science', 'Communication'],
    'climate': ['Environment', 'Science', 'International'],
    'toxic': ['Environment', 'Health', 'Science'],
    'station': ['Science', 'Technology', 'International'],
    
    // Politics & Governance
    'commission': ['Politics', 'Government', 'Society'],
    'anniversary': ['Culture', 'Politics', 'Society'],
    'national': ['Politics', 'Government', 'Society'],
    'minorities': ['Society', 'Politics', 'Culture'],
    'conference': ['International', 'Politics', 'Environment'],
    
    // Economics & Business
    'economic': ['Economics', 'Business', 'Society'],
    'trade': ['Economics', 'Business', 'International'],
    'market': ['Economics', 'Business'],
    'policy': ['Politics', 'Economics', 'Government'],
    
    // International
    'bonn': ['International', 'Environment', 'Politics'],
    'international': ['International', 'Politics'],
    'global': ['International', 'Economics'],
    
    // Health & Environment
    'health': ['Health', 'Society', 'Science'],
    'environment': ['Environment', 'Science', 'Society'],
    'pollution': ['Environment', 'Health', 'Science'],
    
    // Education & Culture
    'education': ['Education', 'Society', 'Culture'],
    'cultural': ['Culture', 'Society', 'Education'],
    'heritage': ['Culture', 'Society', 'Education']
  };
  
  const allTags = ['Politics', 'Economics', 'Science', 'Technology', 'Environment', 'Health', 
                   'Education', 'Sports', 'Culture', 'International', 'Business', 'Climate', 
                   'Innovation', 'Society', 'Government', 'Communication'];
  
  const titleWords = title.toLowerCase().split(/\s+/);
  const contentWords = intro ? intro.toLowerCase().split(/\s+/).slice(0, 30) : [];
  const allWords = [...titleWords, ...contentWords];
  
  // Find relevant tags based on keywords
  let relevantTags = new Set<string>();
  
  Object.entries(tagMappings).forEach(([keyword, tags]) => {
    if (allWords.some(word => word.includes(keyword) || keyword.includes(word))) {
      tags.forEach(tag => relevantTags.add(tag));
    }
  });
  
  // Add source-based tags
  if (source?.toLowerCase().includes('drishti')) {
    relevantTags.add('Education');
  }
  
  // If no specific tags found, use general categorization
  if (relevantTags.size === 0) {
    if (titleWords.some(word => ['india', 'indian', 'national'].includes(word))) {
      relevantTags.add('Politics');
      relevantTags.add('Society');
    }
    relevantTags.add('General');
  }
  
  // Return 2-4 tags
  const finalTags = Array.from(relevantTags).slice(0, Math.min(4, Math.max(2, relevantTags.size)));
  return finalTags.length > 0 ? finalTags : ['General', 'Education'];
};

const generateMockDifficulty = (title: string, intro?: string, source?: string) => {
  const difficulties = ['elementary', 'middle', 'high', 'college'] as const;
  
  // Technical/complex terms suggest higher difficulty
  const complexWords = [
    'sensor', 'toxic', 'sulfur dioxide', 'conference', 'commission', 'policy',
    'analysis', 'strategic', 'comprehensive', 'implementation', 'mechanism',
    'protocol', 'framework', 'methodology', 'infrastructure', 'governance'
  ];
  
  // Simple/introductory terms suggest lower difficulty
  const simpleWords = [
    'basic', 'simple', 'introduction', 'overview', 'elementary', 'birthday',
    'anniversary', 'celebration', 'story', 'life'
  ];
  
  const titleLower = title.toLowerCase();
  const introLower = intro?.toLowerCase() || '';
  const allContent = titleLower + ' ' + introLower;
  
  // Count complex vs simple indicators
  const complexCount = complexWords.filter(word => allContent.includes(word)).length;
  const simpleCount = simpleWords.filter(word => allContent.includes(word)).length;
  
  // Source-based difficulty adjustment
  let baseDifficulty = 'high'; // Default for current affairs
  if (source?.toLowerCase().includes('drishti')) {
    baseDifficulty = 'high'; // DrishtiIAS tends to be more analytical
  }
  
  // Adjust based on content analysis
  if (simpleCount > complexCount) {
    return simpleCount > 2 ? 'elementary' : 'middle';
  } else if (complexCount > 2) {
    return 'college';
  } else if (complexCount > 0) {
    return 'high';
  }
  
  return baseDifficulty as typeof difficulties[number];
};

const estimateReadingTime = (title: string, intro?: string) => {
  // Estimate based on content length
  const titleWords = title.split(/\s+/).length;
  const introWords = intro ? intro.split(/\s+/).length : 0;
  const totalWords = titleWords + introWords;
  
  // Assume average article is 10x the intro length
  const estimatedTotalWords = totalWords * 10;
  
  // Average reading speed: 200-300 words per minute
  const readingTime = Math.ceil(estimatedTotalWords / 250);
  
  // Clamp between 2-15 minutes
  return Math.max(2, Math.min(15, readingTime));
};

export default function GeneratePresentationPage() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEnhancedUI, setUseEnhancedUI] = useState(true);
  const router = useRouter();

  // Fetch articles from the API
  const fetchArticles = async (sourceFilter?: string) => {
    try {
      setIsLoading(true);
      const limit = useEnhancedUI ? 200 : 100; // Fetch more articles to ensure good coverage
      const params = new URLSearchParams({ limit: limit.toString() });
      
      if (sourceFilter && sourceFilter !== 'all') {
        params.append('source', sourceFilter);
      }
      
      const response = await fetch(`/api/articles?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      
      const data = await response.json();
      // Enhance articles with intelligent mock data for better demo
      const enhancedArticles = (data.articles || []).map((article: any) => ({
        ...article,
        tags: generateMockTags(article.title, article.intro, article.source_name),
        difficulty_level: generateMockDifficulty(article.title, article.intro, article.source_name),
        estimated_read_time: estimateReadingTime(article.title, article.intro)
      }));
      setArticles(enhancedArticles);
    } catch (err) {
      setError('Error fetching articles. Please try again later.');
      console.error('Error fetching articles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [useEnhancedUI]); // Re-fetch when UI mode changes

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/articles">Articles</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Generate Presentation</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Generate PowerPoint Presentation</h1>
            <p className="text-muted-foreground">
              Create professional presentations from educational articles with just a few clicks.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setUseEnhancedUI(!useEnhancedUI)}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {useEnhancedUI ? 'Classic View' : 'Enhanced View'}
          </Button>
        </div>
      </div>
      
      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : (
          useEnhancedUI ? (
            <EnhancedPPTGenerator 
              articles={articles} 
              onSourceFilterChange={(source) => fetchArticles(source)}
            />
          ) : (
            <PPTGenerator articles={articles} />
          )
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Loader2, Search, Filter, Grid, List } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { StudentEnhancedArticleList } from '@/components/articles/student-enhanced-article-list';

interface Article {
  id: string;
  title: string;
  url: string;
  image_url: string | null;
  published_date: string | null;
  intro: string | null;
  source_name: string;
  importance_rating?: string;
  scraped_at?: string;
  is_published: boolean;
}

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function StudentArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchArticles = useCallback(async (page: number = 1, retryCount: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build URL with filters - only show published articles
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.pageSize.toString(),
        publishedOnly: 'true' // Only show published articles for students
      });
      
      if (sourceFilter && sourceFilter !== 'all') {
        params.append('source', sourceFilter);
      }
      
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }
      
      params.append('sort', sortOrder);
      
      const response = await fetch(`/api/articles?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || 'Failed to fetch articles');
      }
      
      const data = await response.json();
      setArticles(data.articles || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching articles:', err);
      
      // Retry logic for temporary failures
      if (retryCount < 2 && (err instanceof Error && err.message.includes('fetch failed'))) {
        console.log(`Retrying fetch articles (attempt ${retryCount + 2})...`);
        setTimeout(() => {
          fetchArticles(page, retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Failed to fetch articles');
      setArticles([]);
    } finally {
      if (retryCount === 0) { // Only set loading false on the original call
        setLoading(false);
      }
    }
  }, [sourceFilter, debouncedSearchTerm, pagination.pageSize]);

  useEffect(() => {
    fetchArticles(1); // Reset to page 1 when filters change
  }, [sourceFilter, debouncedSearchTerm, sortOrder]);

  const handlePageChange = (newPage: number) => {
    fetchArticles(newPage);
  };

  const handleSourceFilterChange = (value: string) => {
    setSourceFilter(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setSourceFilter('all');
    setSearchTerm('');
    setSortOrder('newest');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (sourceFilter && sourceFilter !== 'all') count++;
    if (debouncedSearchTerm) count++;
    if (sortOrder !== 'newest') count++;
    return count;
  };

  if (loading && articles.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading articles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Educational Articles</h1>
            <p className="text-gray-600">
              Browse current affairs and educational content from trusted sources
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Source Filter */}
              <div className="w-full sm:w-48">
                <Select value={sourceFilter} onValueChange={handleSourceFilterChange}>
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

              {/* Sort Filter */}
              <div className="w-full sm:w-48">
                <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-3"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-3"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Clear Filters */}
              {getActiveFilterCount() > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                  <Badge variant="secondary" className="ml-2">
                    {getActiveFilterCount()}
                  </Badge>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Summary */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              <span>
                Showing {articles.length} of {pagination.total} articles
                {debouncedSearchTerm && (
                  <span> for "{debouncedSearchTerm}"</span>
                )}
                {sourceFilter && sourceFilter !== 'all' && (
                  <span> from {sourceFilter}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-2">Error loading articles</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => fetchArticles(pagination.page)}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Articles List */}
      {articles.length === 0 && !loading && !error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600 mb-4">
              {debouncedSearchTerm || sourceFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No published articles are available at the moment'}
            </p>
            {(debouncedSearchTerm || sourceFilter !== 'all') && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <StudentEnhancedArticleList 
          articles={articles} 
          viewMode={viewMode}
          pagination={pagination}
          onPageChange={handlePageChange}
          loading={loading}
        />
      )}
    </div>
  );
}
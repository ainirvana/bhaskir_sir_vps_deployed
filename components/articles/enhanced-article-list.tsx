import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink, Star } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  url: string;
  image_url: string | null;
  published_date: string | null;
  intro: string | null;
  source_name?: string;
  importance_rating?: string;
  scraped_at?: string;
}

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface EnhancedArticleListProps {
  articles: Article[];
  viewMode?: 'grid' | 'list';
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function EnhancedArticleList({ 
  articles, 
  viewMode = 'grid', 
  pagination, 
  onPageChange, 
  loading = false 
}: EnhancedArticleListProps) {
  
  const renderImportanceRating = (rating?: string) => {
    if (!rating) return null;
    
    const numRating = parseInt(rating);
    if (isNaN(numRating)) return null;
    
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < numRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderArticleCard = (article: Article) => (
    <Card key={article.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-lg font-bold line-clamp-2 flex-1">
            <Link href={`/admin/articles/${article.id}`} className="hover:text-blue-600 transition-colors">
              {article.title}
            </Link>
          </CardTitle>
          {article.importance_rating && renderImportanceRating(article.importance_rating)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {article.source_name && (
            <Badge 
              variant="secondary" 
              className={
                article.source_name === 'DrishtiIAS' 
                  ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' 
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              }
            >
              {article.source_name}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {formatDate(article.published_date || article.scraped_at || article.created_at || new Date().toISOString())}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 flex-grow">
        {article.image_url && (
          <div className="relative h-48 mb-4 rounded-md overflow-hidden">
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
          </div>
        )}
        {article.intro && (
          <p className="text-muted-foreground line-clamp-3 text-sm">{article.intro}</p>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/articles/${article.id}`}>
            Read Article
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={article.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );

  const renderArticleListItem = (article: Article) => (
    <Card key={article.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {article.image_url && (
            <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
              <Image
                src={article.image_url}
                alt={article.title}
                fill
                className="object-cover"
                sizes="96px"
                priority={false}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-lg font-bold line-clamp-2">
                <Link href={`/admin/articles/${article.id}`} className="hover:text-blue-600 transition-colors">
                  {article.title}
                </Link>
              </h3>
              {article.importance_rating && renderImportanceRating(article.importance_rating)}
            </div>
            
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {article.source_name && (
                <Badge 
                  variant="secondary" 
                  className={
                    article.source_name === 'DrishtiIAS' 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }
                >
                  {article.source_name}
                </Badge>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {formatDate(article.published_date || article.scraped_at || article.created_at || new Date().toISOString())}
              </div>
            </div>
            
            {article.intro && (
              <p className="text-muted-foreground line-clamp-2 text-sm mb-3">{article.intro}</p>
            )}
            
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/articles/${article.id}`}>
                  Read Article
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={article.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Articles */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(renderArticleCard)}
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map(renderArticleListItem)}
        </div>
      )}
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button 
            variant="outline" 
            size="sm"
            disabled={pagination.page === 1 || loading}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1 px-4">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 || 
                page === pagination.totalPages || 
                Math.abs(page - pagination.page) <= 1
              )
              .map((page, i, arr) => (
                <React.Fragment key={page}>
                  {i > 0 && arr[i - 1] !== page - 1 && (
                    <span className="px-2 text-gray-400">...</span>
                  )}
                  <Button 
                    key={page}
                    variant={pagination.page === page ? 'default' : 'outline'} 
                    size="sm"
                    className="w-8 h-8 p-0"
                    disabled={loading}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </Button>
                </React.Fragment>
              ))}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            disabled={pagination.page === pagination.totalPages || loading}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

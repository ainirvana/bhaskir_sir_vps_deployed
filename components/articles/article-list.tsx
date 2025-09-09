import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Article {
  id: string;
  title: string;
  url: string;
  image_url: string | null;
  published_date: string | null;
  intro: string | null;
  source_name?: string;
}

interface ArticleListProps {
  articles: Article[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ArticleList({ articles, currentPage, totalPages, onPageChange }: ArticleListProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Card key={article.id} className="flex flex-col h-full">
            <CardHeader className="p-4">
              <CardTitle className="text-lg font-bold line-clamp-2">
                <Link href={`/articles/${article.id}`} className="hover:text-blue-600 transition-colors">
                  {article.title}
                </Link>
              </CardTitle>
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
            </CardContent>            <CardFooter className="p-4 pt-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {article.published_date && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(article.published_date)}
                  </span>
                )}
                {article.source_name && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    article.source_name === 'DrishtiIAS' 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {article.source_name}
                  </span>
                )}
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/articles/${article.id}`}>
                  Read more
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button 
            variant="outline" 
            size="sm"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1 px-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .map((page, i, arr) => (
                <React.Fragment key={page}>
                  {i > 0 && arr[i - 1] !== page - 1 && (
                    <span className="px-2">...</span>
                  )}
                  <Button 
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'} 
                    size="sm"
                    className="w-8 h-8 p-0"
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
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

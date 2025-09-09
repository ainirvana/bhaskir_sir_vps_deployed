'use client';

import { useEffect, useState, use } from 'react';
import { notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ArticleDetail } from '@/components/articles/article-detail';

interface ArticleDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface Bullet {
  id: string;
  content: string;
  bullet_order: number;
}

interface Section {
  id: string;
  heading: string;
  content: string;
  type: 'paragraph' | 'list';
  sequence_order: number;
  bullets?: Bullet[];
}

interface Article {
  id: string;
  title: string;
  url: string;
  image_url: string | null;
  published_date: string | null;
  intro: string | null;
  source_name: string;
}

export default function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { id } = use(params);
  
  const [article, setArticle] = useState<Article | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticleDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/articles/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch article details');
        }
        
        const data = await response.json();
        setArticle(data.article);
        setSections(data.sections || []);
      } catch (err) {
        console.error('Error fetching article details:', err);
        setError('Failed to load article. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticleDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading article...</span>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error || 'Article not found'}</span>
        </div>
      </div>
    );
  }

  return <ArticleDetail article={article} sections={sections} />;
}

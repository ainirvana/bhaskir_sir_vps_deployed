import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

interface ArticleDetailProps {
  article: Article;
  sections: Section[];
}

export function ArticleDetail({ article, sections }: ArticleDetailProps) {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-6" asChild>
        <Link href="/admin/articles" className="flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Back to Articles
        </Link>
      </Button>
        <article>
        <div className="flex items-center gap-3 mb-2">
          {article.source_name && (
            <span className={`text-sm px-2 py-1 rounded ${
              article.source_name === 'DrishtiIAS' 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {article.source_name}
            </span>
          )}
        </div>
        
        <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
        
        {article.published_date && (
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <time dateTime={article.published_date}>{formatDate(article.published_date)}</time>
            <span>•</span>
            <span>{article.source_name || 'GKToday'}</span>
          </div>
        )}
        
        {article.image_url && (
          <div className="relative w-full h-[300px] md:h-[400px] mb-8 rounded-lg overflow-hidden">
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              priority
            />
          </div>
        )}
        
        {article.intro && (
          <div className="text-lg mb-8 text-muted-foreground whitespace-pre-line">
            {article.intro}
          </div>
        )}
        
        <div className="space-y-8">
          {sections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              {section.heading && (
                <CardHeader>
                  <h2 className="text-xl font-semibold">{section.heading}</h2>
                </CardHeader>
              )}
              
              <CardContent>
                {section.content && (
                  <p className="mb-4">{section.content}</p>
                )}
                
                {section.type === 'list' && section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc pl-6 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet.id} className={bullet.content.startsWith('  •') ? 'ml-6 list-none' : ''}>
                        {bullet.content.startsWith('  •') ? (
                          <span className="flex items-start">
                            <span className="text-gray-500 mr-2">•</span>
                            <span>{bullet.content.replace('  •', '').trim()}</span>
                          </span>
                        ) : (
                          bullet.content
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-8 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Source: <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {article.url}
            </a>
          </p>
        </div>
      </article>
    </div>
  );
}

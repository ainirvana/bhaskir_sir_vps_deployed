'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, FileText, BookOpen, Users, Filter, Clock, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDebounce } from '@/hooks/use-debounce';
import Link from 'next/link';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface SearchResult {
  id: string;
  title: string;
  content?: string;
  type: 'article' | 'quiz' | 'slide' | 'student';
  url: string;
  metadata?: {
    source?: string;
    date?: string;
    author?: string;
    tags?: string[];
  };
}

interface SearchFilters {
  type: string;
  source: string;
  dateRange: string;
}

interface GlobalSearchProps {
  trigger?: React.ReactNode;
  className?: string;
}

export default function GlobalSearch({ trigger, className }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    source: 'all',
    dateRange: 'all'
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularQueries, setPopularQueries] = useState<string[]>([
    'Current Affairs',
    'GK Today',
    'Banking',
    'Government Schemes',
    'International Relations'
  ]);

  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Perform search API call
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchFilters.type,
        source: searchFilters.source,
        dateRange: searchFilters.dateRange,
        limit: '10'
      });

      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery, filters);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, filters, performSearch]);

  // Handle search selection
  const handleSearchSelect = useCallback((result: SearchResult) => {
    saveRecentSearch(query);
    setOpen(false);
    setQuery('');
  }, [query, saveRecentSearch]);

  // Handle quick search (popular/recent)
  const handleQuickSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    saveRecentSearch(searchQuery);
  }, [saveRecentSearch]);

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="w-4 h-4" />;
      case 'quiz': return <BookOpen className="w-4 h-4" />;
      case 'slide': return <Users className="w-4 h-4" />;
      case 'student': return <Users className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Grouped results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(result => {
      if (!groups[result.type]) groups[result.type] = [];
      groups[result.type].push(result);
    });
    return groups;
  }, [results]);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      {/* Search Trigger */}
      <div className={className}>
        {trigger ? (
          <div onClick={() => setOpen(true)} className="cursor-pointer">
            {trigger}
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
            onClick={() => setOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            Search platform...
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        )}
      </div>

      {/* Search Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="border-b px-3">
          <div className="flex items-center">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search articles, quizzes, slides..."
              value={query}
              onValueChange={setQuery}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuery('')}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="border-b px-3 py-2">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filters.type === 'all' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
            >
              All
            </Badge>
            <Badge
              variant={filters.type === 'article' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilters(prev => ({ ...prev, type: 'article' }))}
            >
              Articles
            </Badge>
            <Badge
              variant={filters.type === 'quiz' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilters(prev => ({ ...prev, type: 'quiz' }))}
            >
              Quizzes
            </Badge>
            <Badge
              variant={filters.type === 'slide' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilters(prev => ({ ...prev, type: 'slide' }))}
            >
              Slides
            </Badge>
          </div>
        </div>

        <CommandList className="max-h-[400px] overflow-y-auto">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Empty State - No Query */}
          {!query && !loading && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((search, index) => (
                    <CommandItem
                      key={index}
                      onSelect={() => handleQuickSearch(search)}
                      className="cursor-pointer"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      <span>{search}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Popular Searches */}
              <CommandGroup heading="Popular Searches">
                {popularQueries.map((search, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => handleQuickSearch(search)}
                    className="cursor-pointer"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    <span>{search}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Search Results */}
          {query && !loading && (
            <>
              {results.length === 0 ? (
                <CommandEmpty>
                  No results found for "{query}".
                </CommandEmpty>
              ) : (
                Object.entries(groupedResults).map(([type, typeResults]) => (
                  <CommandGroup
                    key={type}
                    heading={`${type.charAt(0).toUpperCase() + type.slice(1)}s (${typeResults.length})`}
                  >
                    {typeResults.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSearchSelect(result)}
                        className="cursor-pointer"
                        asChild
                      >
                        <Link href={result.url} className="flex items-start space-x-3 p-2">
                          <div className="flex-shrink-0 mt-1">
                            {getResultIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {result.title}
                            </div>
                            {result.content && (
                              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {result.content}
                              </div>
                            )}
                            {result.metadata && (
                              <div className="flex items-center space-x-2 mt-2">
                                {result.metadata.source && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.metadata.source}
                                  </Badge>
                                )}
                                {result.metadata.date && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(result.metadata.date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              )}
            </>
          )}
        </CommandList>

        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          Press <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> to navigate, <kbd className="font-mono">↵</kbd> to select, <kbd className="font-mono">esc</kbd> to close
        </div>
      </CommandDialog>
    </>
  );
}

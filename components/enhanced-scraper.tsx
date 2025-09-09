'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface ScraperResponse {
  success: boolean;
  message: string;
  details?: string;
  timestamp?: string;
}

interface LastScraperRun {
  timestamp: string;
  source: string;
  articlesScraped: number;
  success: boolean;
}

interface ScrapingSettings {
  autoScrapeEnabled: boolean;
  scrapeInterval: number;
  maxArticlesPerScrape: number;
}

export function EnhancedScraper() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScraperResponse | null>(null);
  const [days, setDays] = useState<number>(3);
  const [source, setSource] = useState<string>('all');
  const [lastRun, setLastRun] = useState<LastScraperRun | null>(null);
  const [scrapingSettings, setScrapingSettings] = useState<ScrapingSettings>({
    autoScrapeEnabled: true,
    scrapeInterval: 24,
    maxArticlesPerScrape: 50
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch last scraper run info and settings on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedLastRun = localStorage.getItem('lastScraperRun');
        if (storedLastRun) {
          setLastRun(JSON.parse(storedLastRun));
        }
        
        const storedSettings = localStorage.getItem('scraping-settings');
        if (storedSettings) {
          setScrapingSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('Failed to fetch scraper data:', error);
      }
    };

    fetchData();
  }, []);

  const runScraper = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/scrape?source=${source}&days=${days}`);
      const result: ScraperResponse = await response.json();
      
      setLastResult(result);
      
      // Extract articles count from details if available
      let articlesScraped = 0;
      if (result.details) {
        const match = result.details.match(/(\d+)\s+articles/i);
        if (match && match[1]) {
          articlesScraped = parseInt(match[1], 10);
        }
      }
      
      // Save last run info
      const newLastRun = {
        timestamp: new Date().toISOString(),
        source,
        articlesScraped,
        success: result.success
      };
      
      setLastRun(newLastRun);
      localStorage.setItem('lastScraperRun', JSON.stringify(newLastRun));
      
      if (result.success) {
        toast({
          title: "Scraper completed successfully!",
          description: `Scraped ${articlesScraped} articles from ${source === 'all' ? 'all sources' : source}`,
          duration: 5000,
        });
      } else {
        toast({
          title: "Scraper failed",
          description: result.message,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      const errorMessage = "Failed to run scraper";
      setLastResult({
        success: false,
        message: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateScrapingSettings = async () => {
    try {
      setSettingsLoading(true);
      localStorage.setItem('scraping-settings', JSON.stringify(scrapingSettings));
      toast({
        title: 'Settings Updated',
        description: 'Scraping settings have been saved successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } catch (e) {
      return 'unknown time';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-green-600" />
            <span>Scraper Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-scrape">Automatic Scraping</Label>
              <p className="text-sm text-gray-500">Enable automatic content scraping</p>
            </div>
            <Switch
              id="auto-scrape"
              checked={scrapingSettings.autoScrapeEnabled}
              onCheckedChange={(checked) => 
                setScrapingSettings(prev => ({ ...prev, autoScrapeEnabled: checked }))
              }
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scrape-interval">Scrape Interval (hours)</Label>
              <Input
                id="scrape-interval"
                type="number"
                min="1"
                max="168"
                value={scrapingSettings.scrapeInterval}
                onChange={(e) => 
                  setScrapingSettings(prev => ({ 
                    ...prev, 
                    scrapeInterval: parseInt(e.target.value) || 24 
                  }))
                }
              />
              <p className="text-sm text-gray-500">How often to scrape for new content</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-articles">Max Articles per Scrape</Label>
              <Input
                id="max-articles"
                type="number"
                min="1"
                max="200"
                value={scrapingSettings.maxArticlesPerScrape}
                onChange={(e) => 
                  setScrapingSettings(prev => ({ 
                    ...prev, 
                    maxArticlesPerScrape: parseInt(e.target.value) || 50 
                  }))
                }
              />
              <p className="text-sm text-gray-500">Maximum articles to scrape per session</p>
            </div>
          </div>
          
          <Button 
            onClick={updateScrapingSettings}
            disabled={settingsLoading}
            variant="outline"
            className="w-full"
          >
            {settingsLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {settingsLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>Manual Scraper</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="days">Days to scrape</Label>
              <Input 
                id="days" 
                type="number" 
                min="1" 
                max="30" 
                value={days} 
                onChange={(e) => setDays(parseInt(e.target.value) || 3)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Number of days of content to scrape (1-30)</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <select 
                id="source" 
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Sources</option>
                <option value="gktoday">GKToday Only</option>
                <option value="drishti">DrishtiIAS Only</option>
              </select>
            </div>
            
            <Button 
              className="w-full" 
              onClick={runScraper}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Running Scraper...' : 'Run Scraper'}
            </Button>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Last Scraper Run</h3>
            
            {lastRun ? (
              <>
                <div className="flex items-center space-x-2">
                  <Badge variant={lastRun.success ? "default" : "destructive"} className="w-fit">
                    {lastRun.success ? "Success" : "Failed"}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(lastRun.timestamp)}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Source:</span> {lastRun.source === 'all' ? 'All Sources' : lastRun.source}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Articles scraped:</span> {lastRun.articlesScraped}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Date:</span> {new Date(lastRun.timestamp).toLocaleString()}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">
                No previous scraper runs found
              </div>
            )}
            
            {lastResult && !lastRun?.success && (
              <div className="mt-2">
                <details className="text-xs">
                  <summary className="cursor-pointer text-red-500 font-medium">View error details</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                    {lastResult.details || lastResult.message}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
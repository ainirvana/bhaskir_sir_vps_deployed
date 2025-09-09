'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Database, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScraperResponse {
  success: boolean;
  message: string;
  details?: string;
}

export function ScraperButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScraperResponse | null>(null);
  const { toast } = useToast();

  const runScraper = async (source: string = 'all') => {
    setIsLoading(true);
    setLastResult(null);

    try {
      const response = await fetch(`/api/scrape?source=${source}&days=3`);
      const result: ScraperResponse = await response.json();
      
      setLastResult(result);
      
      if (result.success) {
        toast({
          title: "Scraper completed successfully!",
          description: result.message,
        });
      } else {
        toast({
          title: "Scraper failed",
          description: result.message,
          variant: "destructive",
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
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="w-4 h-4 mr-2 animate-spin" />;
    if (lastResult?.success) return <CheckCircle className="w-4 h-4 mr-2 text-green-500" />;
    if (lastResult && !lastResult.success) return <AlertCircle className="w-4 h-4 mr-2 text-red-500" />;
    return <Database className="w-4 h-4 mr-2" />;
  };

  const getButtonText = () => {
    if (isLoading) return "Running Scraper...";
    if (lastResult?.success) return "Scraper Complete";
    if (lastResult && !lastResult.success) return "Scraper Failed - Retry";
    return "Run Scraper";
  };

  const getButtonVariant = () => {
    if (lastResult?.success) return "default" as const;
    if (lastResult && !lastResult.success) return "destructive" as const;
    return "outline" as const;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button 
          variant={getButtonVariant()}
          onClick={() => runScraper('all')}
          disabled={isLoading}
          className="min-w-[140px]"
        >
          {getStatusIcon()}
          {getButtonText()}
        </Button>
        
        {/* Source-specific buttons for advanced users */}
        <div className="hidden md:flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => runScraper('gktoday')}
            disabled={isLoading}
          >
            GKToday Only
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => runScraper('drishti')}
            disabled={isLoading}
          >
            DrishtiIAS Only
          </Button>
        </div>
      </div>
      
      {/* Status details */}
      {lastResult && (
        <div className="text-xs text-muted-foreground max-w-md">
          <p className={lastResult.success ? "text-green-600" : "text-red-600"}>
            {lastResult.message}
          </p>
          {lastResult.details && (
            <details className="mt-1">
              <summary className="cursor-pointer hover:text-foreground">
                View details
              </summary>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                {lastResult.details}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

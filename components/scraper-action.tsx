'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ScraperAction() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runScraper = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/scrape?source=all&days=3');
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Scraper Success",
          description: `Scraped articles successfully. ${result.details}`,
          duration: 5000,
        });
      } else {
        toast({
          title: "Scraper Failed",
          description: result.message,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run scraper",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      className="w-full justify-start" 
      variant="secondary"
      onClick={runScraper}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Upload className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Running Scraper...' : 'Run Article Scraper'}
    </Button>
  );
}

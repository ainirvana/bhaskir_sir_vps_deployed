"""
Example Next.js API integration for the production scrapers
Place this in your Next.js app/api/scraper/ directory
"""

# This is Python code that can be adapted to TypeScript for Next.js
# Below is the conceptual structure for Next.js API routes

"""
// app/api/scraper/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gktoday_enabled = true,
      drishti_enabled = true,
      max_pages = 3,
      max_articles = 20,
      parallel = true
    } = body;

    // Call the Python scraper service
    const command = `cd production_scrapers && python scraper_service.py start_scraping --gktoday=${gktoday_enabled} --drishti=${drishti_enabled} --max_pages=${max_pages} --max_articles=${max_articles} --parallel=${parallel}`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Scraper stderr:', stderr);
    }
    
    const result = JSON.parse(stdout);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error starting scraper:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start scraper' },
      { status: 500 }
    );
  }
}

// app/api/scraper/status/route.ts
export async function GET() {
  try {
    const command = `cd production_scrapers && python scraper_service.py get_status`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Scraper stderr:', stderr);
    }
    
    const status = JSON.parse(stdout);
    
    return NextResponse.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Error getting scraper status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get scraper status' },
      { status: 500 }
    );
  }
}

// app/api/scraper/result/route.ts
export async function GET() {
  try {
    const command = `cd production_scrapers && python scraper_service.py get_result`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Scraper stderr:', stderr);
    }
    
    const result = JSON.parse(stdout);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error getting scraper result:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get scraper result' },
      { status: 500 }
    );
  }
}

// app/api/articles/latest/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const command = `cd production_scrapers && python scraper_service.py get_latest_articles --limit=${limit}`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Scraper stderr:', stderr);
    }
    
    const articles = JSON.parse(stdout);
    
    return NextResponse.json({
      success: true,
      data: articles
    });
    
  } catch (error) {
    console.error('Error getting latest articles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get latest articles' },
      { status: 500 }
    );
  }
}
"""

# Alternative: Direct Python integration using FastAPI
"""
If you prefer to run a separate Python API service, here's a FastAPI implementation:

# fastapi_scraper_api.py
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import sys
import os

# Add production_scrapers to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'production_scrapers'))

from scraper_service import (
    get_scraper_service, 
    quick_scrape, 
    get_latest_articles,
    ScrapingStatus
)

app = FastAPI(title="Educational Platform Scraper API", version="1.0.0")

# Add CORS middleware for Next.js integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],  # Add your Next.js domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrapingRequest(BaseModel):
    gktoday_enabled: bool = True
    drishti_enabled: bool = True
    max_pages: int = 3
    max_articles: int = 20
    parallel: bool = True

@app.post("/api/scraper/start")
async def start_scraping(request: ScrapingRequest):
    service = get_scraper_service()
    
    if service.is_running():
        raise HTTPException(status_code=400, detail="Scraping already in progress")
    
    result = service.start_scraping(
        gktoday_enabled=request.gktoday_enabled,
        drishti_enabled=request.drishti_enabled,
        max_pages=request.max_pages,
        max_articles=request.max_articles,
        parallel=request.parallel
    )
    
    return {"success": True, "data": result}

@app.get("/api/scraper/status")
async def get_scraping_status():
    service = get_scraper_service()
    status = service.get_status()
    return {"success": True, "data": status}

@app.get("/api/scraper/result")
async def get_scraping_result():
    service = get_scraper_service()
    result = service.get_result()
    return {"success": True, "data": result}

@app.post("/api/scraper/cancel")
async def cancel_scraping():
    service = get_scraper_service()
    result = service.cancel_scraping()
    return {"success": True, "data": result}

@app.post("/api/scraper/quick")
async def quick_scraping(request: ScrapingRequest):
    try:
        result = quick_scrape(
            gktoday_enabled=request.gktoday_enabled,
            drishti_enabled=request.drishti_enabled,
            max_pages=request.max_pages,
            max_articles=request.max_articles
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/articles/latest")
async def get_latest_articles_api(limit: int = 10):
    try:
        articles = get_latest_articles(limit=limit)
        return {"success": True, "data": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "scraper-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
"""

# React/Next.js Frontend Integration Example
"""
// hooks/useScraperAPI.ts
import { useState, useEffect } from 'react';

interface ScrapingStatus {
  status: string;
  current_scraper: string | null;
  articles_scraped: number;
  articles_skipped: number;
  errors: string[];
  progress_percentage: number;
}

interface ScrapingResult {
  success: boolean;
  total_articles_scraped: number;
  total_articles_skipped: number;
  runtime_seconds: number;
  summary: string;
}

export function useScraperAPI() {
  const [status, setStatus] = useState<ScrapingStatus | null>(null);
  const [result, setResult] = useState<ScrapingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const startScraping = async (options = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/api/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error starting scraping:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async () => {
    try {
      const response = await fetch('/api/scraper/status');
      const data = await response.json();
      setStatus(data.data);
      return data;
    } catch (error) {
      console.error('Error getting status:', error);
      throw error;
    }
  };

  const getResult = async () => {
    try {
      const response = await fetch('/api/scraper/result');
      const data = await response.json();
      setResult(data.data);
      return data;
    } catch (error) {
      console.error('Error getting result:', error);
      throw error;
    }
  };

  const cancelScraping = async () => {
    try {
      const response = await fetch('/api/scraper/cancel', { method: 'POST' });
      return await response.json();
    } catch (error) {
      console.error('Error cancelling scraping:', error);
      throw error;
    }
  };

  // Auto-refresh status when scraping is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status?.status === 'running') {
      interval = setInterval(getStatus, 2000); // Check every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status?.status]);

  return {
    status,
    result,
    loading,
    startScraping,
    getStatus,
    getResult,
    cancelScraping
  };
}

// components/ScraperControl.tsx
import React from 'react';
import { useScraperAPI } from '../hooks/useScraperAPI';

export function ScraperControl() {
  const { status, result, loading, startScraping, getStatus, cancelScraping } = useScraperAPI();

  const handleStart = async () => {
    try {
      await startScraping({
        gktoday_enabled: true,
        drishti_enabled: true,
        max_pages: 3,
        max_articles: 20,
        parallel: true
      });
      // Status will be updated automatically via useEffect
    } catch (error) {
      alert('Failed to start scraping');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Content Scraper Control</h2>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={handleStart}
            disabled={loading || status?.status === 'running'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading || status?.status === 'running' ? 'Scraping...' : 'Start Scraping'}
          </button>
          
          <button
            onClick={getStatus}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Refresh Status
          </button>
          
          {status?.status === 'running' && (
            <button
              onClick={cancelScraping}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Cancel
            </button>
          )}
        </div>

        {status && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Status: {status.status}</h3>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${status.progress_percentage}%` }}
                ></div>
              </div>
              <p className="text-sm mt-1">{status.progress_percentage.toFixed(1)}% complete</p>
            </div>
            <p>Articles scraped: {status.articles_scraped}</p>
            <p>Articles skipped: {status.articles_skipped}</p>
            {status.current_scraper && <p>Current: {status.current_scraper}</p>}
            {status.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-600">Errors: {status.errors.length}</p>
                <ul className="text-sm text-red-500">
                  {status.errors.slice(0, 3).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-green-100 rounded">
            <h3 className="font-semibold">Last Result</h3>
            <p>Success: {result.success ? 'Yes' : 'No'}</p>
            <p>Articles scraped: {result.total_articles_scraped}</p>
            <p>Runtime: {result.runtime_seconds.toFixed(1)}s</p>
          </div>
        )}
      </div>
    </div>
  );
}
"""

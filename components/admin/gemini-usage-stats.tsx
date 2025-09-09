'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface UsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  averageDurationMs: number;
  errorRate: number;
}

interface UsageDetail {
  model_name: string;
  request_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_duration_ms: number;
  error_count: number;
  input_cost_usd?: number;
  output_cost_usd?: number;
  total_cost_usd?: number;
}

interface UsageData {
  summary: UsageSummary;
  details: UsageDetail[];
}

export default function GeminiUsageStats() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [includeCost, setIncludeCost] = useState(true);

  const fetchUsageStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      params.append('includeCost', includeCost.toString());
      
      // Fetch data from API
      const response = await fetch(`/api/admin/gemini-usage?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch usage stats: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setUsageData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage statistics');
      console.error('Error fetching Gemini API usage stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : <span>Start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : <span>End date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={fetchUsageStats} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {usageData && (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(usageData.summary.totalRequests)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Input Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(usageData.summary.totalInputTokens)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Output Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(usageData.summary.totalOutputTokens)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(usageData.summary.totalCostUsd)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{parseFloat(usageData.summary.averageDurationMs as any).toFixed(2)} ms</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{parseFloat(usageData.summary.errorRate as any).toFixed(2)}%</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Usage by Model</CardTitle>
                <CardDescription>
                  Detailed breakdown of Gemini API usage by model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Model</th>
                        <th className="text-right py-3 px-4">Requests</th>
                        <th className="text-right py-3 px-4">Input Tokens</th>
                        <th className="text-right py-3 px-4">Output Tokens</th>
                        <th className="text-right py-3 px-4">Avg. Duration</th>
                        <th className="text-right py-3 px-4">Errors</th>
                        {includeCost && <th className="text-right py-3 px-4">Cost</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {usageData.details.map((detail, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4">{detail.model_name}</td>
                          <td className="text-right py-3 px-4">{formatNumber(detail.request_count)}</td>
                          <td className="text-right py-3 px-4">{formatNumber(detail.total_input_tokens)}</td>
                          <td className="text-right py-3 px-4">{formatNumber(detail.total_output_tokens)}</td>
                          <td className="text-right py-3 px-4">{parseFloat(detail.avg_duration_ms as any).toFixed(2)} ms</td>
                          <td className="text-right py-3 px-4">{detail.error_count}</td>
                          {includeCost && detail.total_cost_usd !== undefined && (
                            <td className="text-right py-3 px-4">{formatCurrency(detail.total_cost_usd)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
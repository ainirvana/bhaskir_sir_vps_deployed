'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Database, 
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { performanceMonitor, globalCache } from '@/lib/performance';

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalArticles: number;
  totalQuizzes: number;
  avgResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface UserActivity {
  hour: string;
  users: number;
  articles: number;
  quizzes: number;
}

interface ContentStats {
  source: string;
  articles: number;
  views: number;
  engagement: number;
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalArticles: 0,
    totalQuizzes: 0,
    avgResponseTime: 0,
    errorRate: 0,
    cacheHitRate: 0,
    systemHealth: 'healthy'
  });

  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [contentStats, setContentStats] = useState<ContentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch system metrics
      const metricsResponse = await fetch('/api/analytics/metrics');
      const metricsData = await metricsResponse.json();

      // Fetch user activity
      const activityResponse = await fetch('/api/analytics/activity');
      const activityData = await activityResponse.json();

      // Fetch content stats
      const contentResponse = await fetch('/api/analytics/content');
      const contentData = await contentResponse.json();

      // Get performance data from our monitoring system
      const perfMetrics = performanceMonitor.getMetrics();
      const cacheStats = globalCache.getStats();

      setMetrics({
        ...metricsData,
        avgResponseTime: perfMetrics.averageResponseTime,
        errorRate: perfMetrics.errorRate,
        cacheHitRate: performanceMonitor.getCacheHitRate(),
        systemHealth: getSystemHealth(perfMetrics, metricsData)
      });

      setUserActivity(activityData.activity || []);
      setContentStats(contentData.stats || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine system health based on metrics
  const getSystemHealth = (perfMetrics: any, systemMetrics: any): 'healthy' | 'warning' | 'critical' => {
    if (perfMetrics.errorRate > 0.1 || perfMetrics.averageResponseTime > 5000) {
      return 'critical';
    }
    if (perfMetrics.errorRate > 0.05 || perfMetrics.averageResponseTime > 3000) {
      return 'warning';
    }
    return 'healthy';
  };

  // Export analytics data
  const exportData = async () => {
    try {
      const response = await fetch('/api/analytics/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Health */}
      <Card className={`border-2 ${getHealthColor(metrics.systemHealth)}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-sm">
            {getHealthIcon(metrics.systemHealth)}
            <span className="ml-2">System Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold capitalize">{metrics.systemHealth}</div>
            <Badge variant={metrics.systemHealth === 'healthy' ? 'default' : 'destructive'}>
              {metrics.errorRate > 0 ? `${(metrics.errorRate * 100).toFixed(1)}% errors` : 'No errors'}
            </Badge>
          </div>
          {metrics.systemHealth !== 'healthy' && (
            <p className="text-sm mt-2">
              {metrics.avgResponseTime > 3000 && 'High response times detected. '}
              {metrics.errorRate > 0.05 && 'Error rate above threshold. '}
              Consider optimizing performance.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalArticles.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(metrics.totalArticles / 30)} per day avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.avgResponseTime)}ms</div>
            <p className="text-xs text-muted-foreground">
              {metrics.avgResponseTime < 1000 ? 'Excellent' : 
               metrics.avgResponseTime < 3000 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.cacheHitRate * 100)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.cacheHitRate > 0.8 ? 'Excellent' : 
               metrics.cacheHitRate > 0.6 ? 'Good' : 'Could improve'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
          <TabsTrigger value="content">Content Statistics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>24-Hour Activity</CardTitle>
              <CardDescription>User engagement throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              {userActivity.length > 0 ? (
                <div className="space-y-4">
                  {userActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <span className="text-sm font-medium">{activity.hour}</span>
                      <div className="flex space-x-4 text-sm">
                        <span>{activity.users} users</span>
                        <span>{activity.articles} articles</span>
                        <span>{activity.quizzes} quizzes</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No activity data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>Statistics by content source</CardDescription>
            </CardHeader>
            <CardContent>
              {contentStats.length > 0 ? (
                <div className="space-y-4">
                  {contentStats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                      <div>
                        <div className="font-medium">{stat.source}</div>
                        <div className="text-sm text-gray-500">{stat.articles} articles</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{stat.views.toLocaleString()} views</div>
                        <div className="text-sm text-gray-500">{Math.round(stat.engagement * 100)}% engagement</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No content statistics available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total API Calls</span>
                  <span className="font-medium">{performanceMonitor.getMetrics().apiCalls}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Hits</span>
                  <span className="font-medium">{performanceMonitor.getMetrics().cacheHits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Misses</span>
                  <span className="font-medium">{performanceMonitor.getMetrics().cacheMisses}</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate</span>
                  <span className="font-medium">{(performanceMonitor.getMetrics().errorRate * 100).toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Cache Size</span>
                  <span className="font-medium">{globalCache.getStats().size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Size</span>
                  <span className="font-medium">{globalCache.getStats().maxSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage</span>
                  <span className="font-medium">
                    {Math.round((globalCache.getStats().size / globalCache.getStats().maxSize) * 100)}%
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => globalCache.clear()}
                  className="w-full"
                >
                  Clear Cache
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

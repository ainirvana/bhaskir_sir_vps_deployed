'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Database, 
  Globe, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Server
} from 'lucide-react'

export function FunctionalSystemSettings() {
  const [loading, setLoading] = useState(false)
  const [systemStatus, setSystemStatus] = useState({
    database: 'checking...',
    articles: 'checking...',
    scrapers: 'checking...'
  })
  


  // Check system status on mount
  useEffect(() => {
    checkSystemStatus()
  }, [])

  const checkSystemStatus = async () => {
    try {
      // Check database connection by testing articles API
      const articlesResponse = await fetch('/api/articles?limit=1')
      const databaseStatus = articlesResponse.ok ? 'healthy' : 'error'
      
      // Check content API
      const contentResponse = await fetch('/api/admin/content')
      const contentStatus = contentResponse.ok ? 'healthy' : 'error'
      
      // Check dashboard stats
      const statsResponse = await fetch('/api/admin/dashboard-stats')
      const scraperStatus = statsResponse.ok ? 'healthy' : 'error'
      
      setSystemStatus({
        database: databaseStatus,
        articles: contentStatus,
        scrapers: scraperStatus
      })
    } catch (error) {
      setSystemStatus({
        database: 'error',
        articles: 'error',
        scrapers: 'error'
      })
    }
  }



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-yellow-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />
      case 'error': return <AlertTriangle className="h-4 w-4" />
      default: return <RefreshCw className="h-4 w-4 animate-spin" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="text-gray-600">Configure platform settings and monitor system health</p>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5 text-blue-600" />
            <span>System Status</span>
          </CardTitle>
          <CardDescription>Monitor the health of core system components</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Database</span>
              </div>
              <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus.database)}`}>
                {getStatusIcon(systemStatus.database)}
                <span className="text-sm font-medium capitalize">{systemStatus.database}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-green-600" />
                <span className="font-medium">Articles API</span>
              </div>
              <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus.articles)}`}>
                {getStatusIcon(systemStatus.articles)}
                <span className="text-sm font-medium capitalize">{systemStatus.articles}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Scrapers</span>
              </div>
              <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus.scrapers)}`}>
                {getStatusIcon(systemStatus.scrapers)}
                <span className="text-sm font-medium capitalize">{systemStatus.scrapers}</span>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={checkSystemStatus}
            variant="outline" 
            size="sm"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </CardContent>
      </Card>



      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <Button 
              variant="outline" 
              onClick={checkSystemStatus}
              className="justify-start"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Run System Health Check
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

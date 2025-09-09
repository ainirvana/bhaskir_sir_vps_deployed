'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Settings, 
  Database, 
  Globe, 
  Shield, 
  Bell, 
  Palette,
  Server,
  Mail,
  FileText,
  Users,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface SystemSettings {
  general: {
    siteName: string
    siteDescription: string
    adminEmail: string
    maintenanceMode: boolean
    registrationEnabled: boolean
  }
  scraping: {
    autoScrapeEnabled: boolean
    scrapeInterval: number
    maxArticlesPerScrape: number
    scrapeSources: string[]
  }
  notifications: {
    emailNotifications: boolean
    newUserNotifications: boolean
    contentUpdateNotifications: boolean
    systemAlerts: boolean
  }
  security: {
    sessionTimeout: number
    maxLoginAttempts: number
    requireEmailVerification: boolean
    twoFactorAuth: boolean
  }
  performance: {
    cacheEnabled: boolean
    cacheDuration: number
    compressionEnabled: boolean
    cdnEnabled: boolean
  }
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      siteName: 'Educational Platform',
      siteDescription: 'Comprehensive learning platform for students',
      adminEmail: 'admin@example.com',
      maintenanceMode: false,
      registrationEnabled: true
    },
    scraping: {
      autoScrapeEnabled: true,
      scrapeInterval: 24,
      maxArticlesPerScrape: 50,
      scrapeSources: ['GKToday', 'Drishti IAS']
    },
    notifications: {
      emailNotifications: true,
      newUserNotifications: true,
      contentUpdateNotifications: false,
      systemAlerts: true
    },
    security: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      requireEmailVerification: true,
      twoFactorAuth: false
    },
    performance: {
      cacheEnabled: true,
      cacheDuration: 3600,
      compressionEnabled: true,
      cdnEnabled: false
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [systemStatus, setSystemStatus] = useState({
    database: 'healthy',
    scrapers: 'running',
    storage: 'healthy',
    performance: 'good'
  })
  
  const { toast } = useToast()

  const updateSettings = async (category: keyof SystemSettings, updates: any) => {
    try {
      setLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSettings(prev => ({
        ...prev,
        [category]: { ...prev[category], ...updates }
      }))
      
      toast({
        title: 'Settings Updated',
        description: `${category} settings have been saved successfully`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const runSystemCheck = async () => {
    try {
      setLoading(true)
      
      // Simulate system check
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setSystemStatus({
        database: 'healthy',
        scrapers: 'running',
        storage: 'healthy',
        performance: 'good'
      })
      
      toast({
        title: 'System Check Complete',
        description: 'All systems are operating normally'
      })
    } catch (error) {
      toast({
        title: 'System Check Failed',
        description: 'Unable to complete system health check',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>
            Configure platform settings and monitor system health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="scraping">Scraping</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="status">System Status</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Site Configuration</CardTitle>
                  <CardDescription>Basic site settings and information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Site Name</Label>
                      <Input
                        id="siteName"
                        value={settings.general.siteName}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, siteName: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Admin Email</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={settings.general.adminEmail}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          general: { ...prev.general, adminEmail: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">Site Description</Label>
                    <Textarea
                      id="siteDescription"
                      value={settings.general.siteDescription}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, siteDescription: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable site access for maintenance
                      </p>
                    </div>
                    <Switch
                      checked={settings.general.maintenanceMode}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, maintenanceMode: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>User Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register accounts
                      </p>
                    </div>
                    <Switch
                      checked={settings.general.registrationEnabled}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, registrationEnabled: checked }
                      }))}
                    />
                  </div>
                  <Button 
                    onClick={() => updateSettings('general', settings.general)}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save General Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Scraping Settings */}
            <TabsContent value="scraping" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Scraping</CardTitle>
                  <CardDescription>Configure automated content collection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Auto Scraping</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically scrape content at regular intervals
                      </p>
                    </div>
                    <Switch
                      checked={settings.scraping.autoScrapeEnabled}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        scraping: { ...prev.scraping, autoScrapeEnabled: checked }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scrapeInterval">Scrape Interval (hours)</Label>
                      <Input
                        id="scrapeInterval"
                        type="number"
                        value={settings.scraping.scrapeInterval}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          scraping: { ...prev.scraping, scrapeInterval: parseInt(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxArticles">Max Articles per Scrape</Label>
                      <Input
                        id="maxArticles"
                        type="number"
                        value={settings.scraping.maxArticlesPerScrape}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          scraping: { ...prev.scraping, maxArticlesPerScrape: parseInt(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Active Sources</Label>
                    <div className="flex gap-2">
                      {settings.scraping.scrapeSources.map((source, index) => (
                        <Badge key={index} variant="secondary">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={() => updateSettings('scraping', settings.scraping)}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Scraping Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Configure system notifications and alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Label>
                        <p className="text-sm text-muted-foreground">
                          {key === 'emailNotifications' && 'Send notifications via email'}
                          {key === 'newUserNotifications' && 'Alert when new users register'}
                          {key === 'contentUpdateNotifications' && 'Notify about content updates'}
                          {key === 'systemAlerts' && 'System health and error alerts'}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, [key]: checked }
                        }))}
                      />
                    </div>
                  ))}
                  <Button 
                    onClick={() => updateSettings('notifications', settings.notifications)}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Notification Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security Configuration</CardTitle>
                  <CardDescription>Manage security settings and authentication</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                      <Input
                        id="maxLoginAttempts"
                        type="number"
                        value={settings.security.maxLoginAttempts}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, maxLoginAttempts: parseInt(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Email Verification</Label>
                      <p className="text-sm text-muted-foreground">
                        Require email verification for new accounts
                      </p>
                    </div>
                    <Switch
                      checked={settings.security.requireEmailVerification}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        security: { ...prev.security, requireEmailVerification: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable 2FA for enhanced security
                      </p>
                    </div>
                    <Switch
                      checked={settings.security.twoFactorAuth}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        security: { ...prev.security, twoFactorAuth: checked }
                      }))}
                    />
                  </div>
                  <Button 
                    onClick={() => updateSettings('security', settings.security)}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Security Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Settings */}
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Optimization</CardTitle>
                  <CardDescription>Configure caching and performance settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Caching</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable response caching for better performance
                      </p>
                    </div>
                    <Switch
                      checked={settings.performance.cacheEnabled}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        performance: { ...prev.performance, cacheEnabled: checked }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cacheDuration">Cache Duration (seconds)</Label>
                    <Input
                      id="cacheDuration"
                      type="number"
                      value={settings.performance.cacheDuration}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        performance: { ...prev.performance, cacheDuration: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Compression</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable gzip compression for responses
                      </p>
                    </div>
                    <Switch
                      checked={settings.performance.compressionEnabled}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        performance: { ...prev.performance, compressionEnabled: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>CDN</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable Content Delivery Network
                      </p>
                    </div>
                    <Switch
                      checked={settings.performance.cdnEnabled}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        performance: { ...prev.performance, cdnEnabled: checked }
                      }))}
                    />
                  </div>
                  <Button 
                    onClick={() => updateSettings('performance', settings.performance)}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Performance Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Status */}
            <TabsContent value="status" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>System Health</CardTitle>
                      <CardDescription>Monitor system components and performance</CardDescription>
                    </div>
                    <Button onClick={runSystemCheck} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Run Health Check
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <span className="font-medium">Database</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(systemStatus.database)}
                            <span className="text-sm capitalize">{systemStatus.database}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span className="font-medium">Scrapers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(systemStatus.scrapers)}
                            <span className="text-sm capitalize">{systemStatus.scrapers}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            <span className="font-medium">Storage</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(systemStatus.storage)}
                            <span className="text-sm capitalize">{systemStatus.storage}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">Performance</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(systemStatus.performance)}
                            <span className="text-sm capitalize">{systemStatus.performance}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

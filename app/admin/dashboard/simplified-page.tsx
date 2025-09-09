"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Users,
  BarChart3,
  Settings,
  Plus,
  LogOut,
  Shield,
  Presentation,
  FileQuestion,
  Globe,
  User,
  Upload,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import EnhancedContentManagement from '@/components/admin/enhanced-content-management';
import StudentManagement from '@/components/admin/student-management';
import { FunctionalSystemSettings } from '@/components/admin/functional-system-settings';
import { EnhancedScraper } from '@/components/enhanced-scraper';

export default function SimplifiedAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real dashboard statistics
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('/api/admin/dashboard-stats');
        if (response.ok) {
          const data = await response.json();
          setDashboardStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const handleSignOut = async () => {
    try {
      // Simple sign out - redirect to login
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Stats based on the screenshot
  const stats = [
    {
      title: "Total Articles",
      value: "136",
      change: "+41.9% from last month",
      icon: FileText,
      color: "text-blue-600",
      changeColor: "text-green-600"
    },
    {
      title: "Active Students", 
      value: "2",
      change: "+5% from last month",
      icon: Users,
      color: "text-green-600",
      changeColor: "text-green-600"
    },
    {
      title: "Quizzes Created",
      value: "0",
      change: "+8% from last month",
      icon: FileQuestion,
      color: "text-purple-600",
      changeColor: "text-green-600"
    },
    {
      title: "System Health",
      value: "Good",
      change: "99.9% from last month",
      icon: Shield,
      color: "text-orange-600",
      changeColor: "text-green-600"
    }
  ];

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'scrapers', label: 'Scrapers', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Recent activity items
  const recentActivity = [
    {
      id: '1',
      text: 'New article: Article 0609991a-4398-4d86-b5d0-6fd03ca45ce8'
    },
    {
      id: '2',
      text: 'New article: Article bece714d-3aec-42ca-ac9e-bd966e754d4b'
    },
    {
      id: '3',
      text: 'New article: Article 5de51a09-f123-4430-b4ee-0d931aee66d5'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Current Affairs Learning Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Admin Teacher</span>
              </div>
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-6 border-b border-gray-200">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-6 ${
                    activeTab === tab.id 
                      ? 'border-b-2 border-blue-600 text-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                  const IconComponent = stat.icon;
                  return (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <IconComponent className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                      <p className={`text-xs ${stat.changeColor} mt-1`}>
                        {stat.change}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <Plus className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-medium">Quick Actions</h3>
                  </div>
                  <div className="space-y-2">
                    <Link href="/admin/articles" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View All Articles
                      </Button>
                    </Link>
                    <Link href="/admin/articles/generate-presentation" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <Presentation className="h-4 w-4 mr-2" />
                        AI Presentation Generator
                      </Button>
                    </Link>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => setActiveTab('scrapers')}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Run Article Scraper
                    </Button>
                    <Link href="/admin/quizzes" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <FileQuestion className="h-4 w-4 mr-2" />
                        Manage Quizzes
                      </Button>
                    </Link>
                    <Link href="/admin/gemini-usage" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Gemini API Usage
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <Clock className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-medium">Recent Activity</h3>
                  </div>
                  <div className="space-y-3">
                    {recentActivity.map(activity => (
                      <div key={activity.id} className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <span className="text-sm text-gray-600">{activity.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Latest Articles */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <FileText className="h-5 w-5 text-orange-600 mr-2" />
                    <h3 className="text-lg font-medium">Latest Articles</h3>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-gray-500">No articles found</p>
                    <p className="text-xs text-gray-400 mt-1">Start scraping to see articles</p>
                  </div>
                </div>
              </div>
            </>
          )}



          {/* Content Management Tab */}
          {activeTab === 'content' && (
            <EnhancedContentManagement />
          )}

          {/* Student Management Tab */}
          {activeTab === 'students' && (
            <StudentManagement />
          )}

          {/* Scrapers Tab */}
          {activeTab === 'scrapers' && (
            <EnhancedScraper />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <FunctionalSystemSettings />
          )}
        </div>
      </main>
    </div>
  );
}
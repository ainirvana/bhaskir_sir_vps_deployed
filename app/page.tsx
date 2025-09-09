"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Presentation, Settings, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not authenticated, redirect to login
      router.push('/auth/login');
      return;
    }

    if (userProfile) {
      // Auto-redirect based on role after a short delay to show welcome
      const timer = setTimeout(() => {
        if (userProfile.role === 'admin' || userProfile.role === 'professor') {
          router.push('/admin/dashboard');
        } else if (userProfile.role === 'student') {
          router.push('/student/dashboard');
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, userProfile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Loader2 className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    // This will briefly show before redirect to login
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p>Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Loader2 className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
            <p>Setting up your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleDescription = (() => {
    switch (userProfile.role) {
      case 'admin':
        return 'an Administrator';
      case 'professor':
        return 'a Professor';
      case 'student':
        return 'a Student';
      default:
        return 'Unknown';
    }
  })();

  // Show welcome page with quick navigation
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome, {userProfile.full_name}!
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              You're logged in as {roleDescription}
            </p>
            <p className="text-gray-500">
              Redirecting to your dashboard in a moment...
            </p>
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {userProfile.role === 'admin' || userProfile.role === 'professor' ? (
              <>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <Settings className="w-8 h-8 text-blue-500 mr-3" />
                      <h3 className="text-lg font-semibold">Admin Dashboard</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Manage content, users, and system settings
                    </p>
                    <Link href="/admin/dashboard">
                      <Button className="w-full">
                        Go to Dashboard
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <Users className="w-8 h-8 text-green-500 mr-3" />
                      <h3 className="text-lg font-semibold">Student Management</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Invite students and manage registrations
                    </p>
                    <Link href="/admin/students">
                      <Button variant="outline" className="w-full">
                        Manage Students
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <BookOpen className="w-8 h-8 text-purple-500 mr-3" />
                      <h3 className="text-lg font-semibold">Content Library</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Browse and manage educational articles
                    </p>
                    <Link href="/articles">
                      <Button variant="outline" className="w-full">
                        View Articles
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <BookOpen className="w-8 h-8 text-blue-500 mr-3" />
                      <h3 className="text-lg font-semibold">Study Materials</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Access current affairs and educational content
                    </p>
                    <Link href="/articles">
                      <Button className="w-full">
                        Browse Articles
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <Presentation className="w-8 h-8 text-green-500 mr-3" />
                      <h3 className="text-lg font-semibold">Presentations</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Generate study presentations from articles
                    </p>
                    <Link href="/articles/generate-presentation">
                      <Button variant="outline" className="w-full">
                        Create Presentation
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <Settings className="w-8 h-8 text-purple-500 mr-3" />
                      <h3 className="text-lg font-semibold">Student Dashboard</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      View your progress and assignments
                    </p>
                    <Link href="/student/dashboard">
                      <Button variant="outline" className="w-full">
                        Go to Dashboard
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Don't wait for the redirect? Choose where to go:
            </p>
            <div className="flex gap-4 justify-center">
              <Link href={userProfile.role === 'student' ? '/student/dashboard' : '/admin/dashboard'}>
                <Button size="lg">
                  Go to Dashboard Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

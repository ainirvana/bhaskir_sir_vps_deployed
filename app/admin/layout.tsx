import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Settings, BarChart3, FileText, Brain, Home } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/admin" className="text-xl font-bold">
                Admin Portal
              </Link>
              <nav className="flex space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/content-management" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Content
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/results" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Results
                  </Link>
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
    </div>
  )
}

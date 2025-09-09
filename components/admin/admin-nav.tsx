'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/articles', label: 'Articles' },
  { href: '/admin/quizzes', label: 'Quizzes' },
  { href: '/admin/gemini-usage', label: 'Gemini API Usage' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-800",
            pathname === item.href
              ? "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
              : "text-gray-700 dark:text-gray-400"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
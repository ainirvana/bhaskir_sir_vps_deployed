import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Admin dashboard for the educational platform',
}

export default function AdminPage() {
  // Redirect to the main admin dashboard
  redirect('/admin/dashboard');
}

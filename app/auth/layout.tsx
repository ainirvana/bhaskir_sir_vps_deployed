export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-gray-900">
      <main className="flex-grow">{children}</main>
    </div>
  )
}

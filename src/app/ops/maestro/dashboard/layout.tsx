/**
 * Protected layout for dashboard pages
 * Includes sidebar navigation and header
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch('/api/ops/maestro/auth/logout', { method: 'POST' });
      router.push('/ops/maestro/login');
      router.refresh();
    } catch (error) {
      console.error('[Layout] Logout error:', error);
    } finally {
      setLogoutLoading(false);
    }
  };

  const navItems = [
    { href: '/ops/maestro/dashboard', label: '📊 Dashboard', icon: '📊' },
    { href: '/ops/maestro/clients', label: '👥 Clients', icon: '👥' },
    { href: '/ops/maestro/campaigns', label: '📧 Campaigns', icon: '📧' },
    { href: '/ops/maestro/settings', label: '⚙️ Settings', icon: '⚙️' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen ${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col z-50 shadow-lg overflow-y-auto`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h1 className={`font-bold ${sidebarOpen ? 'text-xl' : 'text-sm'}`}>
            {sidebarOpen ? '🎵 Maestro' : '🎵'}
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="text-sm">{item.label.split(' ')[1]}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-800 sticky bottom-16 bg-gray-900">
          <Button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-md transition"
          >
            {sidebarOpen ? 'Logout' : '🚪'}
          </Button>
        </div>

        {/* Toggle Button */}
        <div className="p-4 border-t border-gray-800 sticky bottom-0 bg-gray-900">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full text-gray-400 hover:text-white text-sm py-2 rounded-md transition"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </aside>

      {/* Main Content - Offset by sidebar width */}
      <main
        className={`${
          sidebarOpen ? 'ml-64' : 'ml-20'
        } transition-all duration-300 flex flex-col min-h-screen`}
      >
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40">
          <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome to Maestro</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

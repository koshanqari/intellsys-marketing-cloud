'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut, 
  ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  clientId: string;
  clientName?: string;
}

const navItems = [
  { href: '/dashboard/analytics', label: 'Template Analytics', icon: BarChart3 },
  { href: '/dashboard/templates', label: 'Templates', icon: FileText, disabled: true },
  { href: '/dashboard/settings', label: 'Client Settings', icon: Settings },
];

export default function Sidebar({ clientId, clientName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-[var(--neutral-200)] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--neutral-200)]">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/intellsys-logo.webp"
            alt="Intellsys"
            width={200}
            height={70}
            className="object-contain"
          />
          <p className="text-sm font-medium text-[var(--neutral-500)]">Marketing Cloud</p>
        </div>
      </div>

      {/* Client Badge */}
      <div className="px-4 py-3 border-b border-[var(--neutral-200)]">
        <Link 
          href="/clients"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors group"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium truncate">{clientName || clientId}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--neutral-400)] cursor-not-allowed"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
                <span className="ml-auto text-xs bg-[var(--neutral-100)] px-2 py-0.5 rounded">Soon</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-[var(--primary)] text-white' 
                  : 'text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--neutral-200)]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}

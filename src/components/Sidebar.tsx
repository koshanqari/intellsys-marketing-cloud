'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  FileText, 
  Settings,
  UserCog,
  LogOut, 
  ChevronLeft,
  Megaphone,
  TrendingUp,
  Plug,
  User,
  GitBranch
} from 'lucide-react';
import type { ClientUserPermissions } from '@/lib/types';

interface SidebarProps {
  clientId: string;
  clientName?: string;
  isSuperAdmin: boolean;
  permissions: ClientUserPermissions | null;
  userName: string | null;
  userEmail: string | null;
}

export default function Sidebar({ clientId, clientName, isSuperAdmin, permissions, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Main navigation items
  const mainNavItems = [
    { 
      href: '/dashboard/journey-builder', 
      label: 'Journey Builder', 
      icon: GitBranch,
      permission: 'journey_builder' as keyof ClientUserPermissions | null,
      disabled: false
    },
    { 
      href: '/dashboard/analytics', 
      label: 'Template Analytics', 
      icon: BarChart3,
      permission: 'analytics' as keyof ClientUserPermissions | null,
      disabled: false
    },
    { 
      href: '/dashboard/templates', 
      label: 'Templates', 
      icon: FileText, 
      disabled: true,
      permission: 'templates' as keyof ClientUserPermissions | null
    },
    { 
      href: '/dashboard/campaigns', 
      label: 'Campaigns', 
      icon: Megaphone,
      disabled: true,
      permission: 'campaigns' as keyof ClientUserPermissions | null
    },
    { 
      href: '/dashboard/reports', 
      label: 'Reports', 
      icon: TrendingUp,
      disabled: true,
      permission: 'reports' as keyof ClientUserPermissions | null
    },
    { 
      href: '/dashboard/integrations', 
      label: 'Integrations', 
      icon: Plug,
      disabled: true,
      permission: 'integrations' as keyof ClientUserPermissions | null
    },
    { 
      href: '/dashboard/settings', 
      label: 'Settings', 
      icon: Settings,
      permission: 'settings' as keyof ClientUserPermissions | null,
      disabled: false
    },
  ];

  // Client Settings section (at the bottom)
  const clientSettingsItems = [
    { 
      href: '/dashboard/client-settings', 
      label: 'Client Settings', 
      icon: UserCog,
      permission: 'client_settings' as keyof ClientUserPermissions | null,
      disabled: false
    },
  ];

  // Filter main nav items based on RBAC
  const visibleMainItems = mainNavItems.filter(item => {
    if (isSuperAdmin) return true; // Super admin sees everything
    if (!permissions) return false;
    // Check permission - if item has a permission, user must have it
    if (item.permission && permissions[item.permission]) return true;
    return false;
  });

  // Filter client settings items based on RBAC
  const visibleClientSettingsItems = clientSettingsItems.filter(item => {
    if (isSuperAdmin) return true; // Super admin sees everything
    if (!permissions) return false;
    if (item.permission && permissions[item.permission]) return true;
    return false;
  });

  const handleLogout = async () => {
    // Clear both admin and client sessions
    await fetch('/api/auth/logout', { method: 'POST' });
    await fetch('/api/auth/client-logout', { method: 'POST' });
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
        {isSuperAdmin ? (
          <Link 
            href="/clients"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors group"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium truncate">{clientName || clientId}</span>
          </Link>
        ) : (
          <div className="px-3 py-2 rounded-lg bg-[var(--primary-light)]">
            <p className="text-sm font-medium text-[var(--primary)] truncate">{clientName || clientId}</p>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleMainItems.length === 0 ? (
          <p className="px-3 py-2 text-sm text-[var(--neutral-400)]">No accessible features</p>
        ) : (
          visibleMainItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
          })
        )}

        {/* Client Settings Section (Separated at bottom) */}
        {visibleClientSettingsItems.length > 0 && (
          <>
            <div className="pt-4 mt-4 border-t border-[var(--neutral-200)]">
              <p className="px-3 py-2 text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wider">
                Client
              </p>
            </div>
            {visibleClientSettingsItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

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
          </>
        )}
      </nav>

      {/* Footer - User Info and Logout */}
      <div className="p-3 border-t border-[var(--neutral-200)] space-y-2">
        {/* User Info */}
        <div className="px-3 py-2 rounded-lg bg-[var(--neutral-50)]">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-[var(--neutral-500)]" />
            <p className="text-sm font-medium text-[var(--neutral-900)] truncate">
              {userName || 'User'}
            </p>
          </div>
          {userEmail && (
            <p className="text-xs text-[var(--neutral-500)] truncate ml-6">
              {userEmail}
            </p>
          )}
          {isSuperAdmin && (
            <p className="text-xs text-[var(--primary)] font-medium mt-1 ml-6">
              Super Admin
            </p>
          )}
        </div>
        
        {/* Logout Button */}
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

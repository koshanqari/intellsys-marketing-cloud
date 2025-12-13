'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MetricsConfigPanel from '@/components/MetricsConfigPanel';

export default function SettingsPage() {
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<{ settings: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState<string>('');

  const checkAccess = useCallback(async () => {
    try {
      // Check if user is super admin or client user with settings permission
      const sessionResponse = await fetch('/api/auth/session');
      if (sessionResponse.ok) {
        const data = await sessionResponse.json();
        setIsSuperAdmin(data.isAdmin || false);
        if (data.permissions) {
          setUserPermissions(data.permissions);
        }
      }

      // Get client name for display
      const analyticsResponse = await fetch('/api/analytics');
      if (!analyticsResponse.ok) {
        if (analyticsResponse.status === 401) {
          router.push('/login');
          return;
        }
        if (analyticsResponse.status === 400) {
          router.push('/login');
          return;
        }
      } else {
      const analyticsData = await analyticsResponse.json();
        setClientName(analyticsData.clientName || '');
      }
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Check RBAC - only show if user has settings permission or is super admin
  const canViewSettings = isSuperAdmin || userPermissions?.settings === true;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--neutral-200)] rounded w-1/4" />
          <div className="h-64 bg-[var(--neutral-200)] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!canViewSettings) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Card className="text-center py-12 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-[var(--error)] mb-4" />
          <h2 className="text-lg font-medium text-[var(--neutral-900)]">Access Denied</h2>
          <p className="mt-1 text-[var(--neutral-600)]">You don&apos;t have permission to access settings.</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--neutral-900)]">Settings</h1>
        <p className="mt-1 text-[var(--neutral-600)]">
          Configure analytics metrics for <span className="font-medium text-[var(--primary)]">{clientName}</span>
        </p>
      </div>

      {/* Metrics Configuration */}
      <MetricsConfigPanel />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, Mail } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/client-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect to dashboard analytics page
      router.push('/dashboard/analytics');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-50)] px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--primary)] opacity-5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--primary)] opacity-5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Image
            src="/intellsys-logo.webp"
            alt="Intellsys"
            width={220}
            height={80}
            className="mx-auto mb-6 object-contain"
          />
          <h1 className="text-2xl font-semibold text-[var(--neutral-900)]">
            Client Portal
          </h1>
          <p className="mt-2 text-[var(--neutral-600)]">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <div className="absolute left-3 top-[38px] text-[var(--neutral-400)]">
                <Mail className="w-5 h-5" />
              </div>
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-[38px] text-[var(--neutral-400)]">
                <Lock className="w-5 h-5" />
              </div>
              <Input
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-10"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[var(--error-light)] text-[var(--error)] text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
            >
              Sign In
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-[var(--neutral-400)]">
          Omni-channel messaging platform
        </p>
      </div>
    </div>
  );
}


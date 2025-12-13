'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogOut, ArrowRight, Plus, Mail, Phone, Building } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  total_messages: number;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  
  // Form state
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    industry: '',
  });

  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const selectClient = async (clientId: string) => {
    setSelecting(clientId);
    try {
      const response = await fetch('/api/clients/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        throw new Error('Failed to select client');
      }

      router.push('/dashboard/analytics');
    } catch (error) {
      console.error('Error selecting client:', error);
      setSelecting(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateError(data.error || 'Failed to create client');
        return;
      }

      // Reset form and close modal
      setNewClient({ name: '', email: '', phone: '', industry: '' });
      setShowCreateModal(false);
      fetchClients();
    } catch {
      setCreateError('An error occurred. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--neutral-50)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--neutral-200)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Image
              src="/intellsys-logo.webp"
              alt="Intellsys"
              width={180}
              height={60}
              className="object-contain"
            />
            <div className="border-l border-[var(--neutral-200)] pl-6">
              <h1 className="text-xl font-semibold text-[var(--neutral-900)]">Client Manager</h1>
              <p className="text-sm text-[var(--neutral-600)]">Select a client to view analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-6 bg-[var(--neutral-200)] rounded w-1/2 mb-4" />
                <div className="h-4 bg-[var(--neutral-100)] rounded w-3/4" />
              </Card>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <Card className="text-center py-12">
            <Building className="w-12 h-12 mx-auto text-[var(--neutral-400)] mb-4" />
            <h2 className="text-lg font-medium text-[var(--neutral-900)]">No clients found</h2>
            <p className="mt-1 text-[var(--neutral-600)]">Create your first client to get started.</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="cursor-pointer hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)] transition-all group"
                onClick={() => selectClient(client.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-[var(--neutral-900)] group-hover:text-[var(--primary)] transition-colors truncate">
                      {client.name}
                    </h3>
                    {client.industry && (
                      <p className="text-sm text-[var(--neutral-600)] mt-1">
                        {client.industry}
                      </p>
                    )}
                    {(client.email || client.phone) && (
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--neutral-500)]">
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--neutral-100)] group-hover:bg-[var(--primary-light)] transition-colors ml-3">
                    {selecting === client.id ? (
                      <svg className="animate-spin w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <ArrowRight className="w-5 h-5 text-[var(--neutral-400)] group-hover:text-[var(--primary)] transition-colors" />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Client Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Client"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <Input
            id="name"
            label="Company Name"
            type="text"
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            placeholder="e.g., Acme Corporation"
            required
          />
          
          <Input
            id="email"
            label="Email"
            type="email"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
            placeholder="contact@example.com"
          />
          
          <Input
            id="phone"
            label="Phone"
            type="tel"
            value={newClient.phone}
            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
            placeholder="+91 98765 43210"
          />
          
          <Input
            id="industry"
            label="Industry"
            type="text"
            value={newClient.industry}
            onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
            placeholder="e.g., Healthcare, Retail, Finance"
          />

          {createError && (
            <div className="p-3 rounded-lg bg-[var(--error-light)] text-[var(--error)] text-sm">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Client
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

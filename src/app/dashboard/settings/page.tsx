'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  MessageSquare,
  Mail,
  Smartphone,
  Plus,
  Trash2,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Users,
  Pencil,
  UserCheck,
  UserX
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  logo_url: string | null;
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  total_messages: number;
}

interface ClientUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: {
    analytics: boolean;
    templates: boolean;
    settings: boolean;
  };
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User modal state (create)
  const [showUserModal, setShowUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    permissions: {
      analytics: true,
      templates: false,
      settings: false,
    },
  });

  // Edit user modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ClientUser | null>(null);
  const [editUserData, setEditUserData] = useState({
    email: '',
    password: '',
    name: '',
    permissions: {
      analytics: true,
      templates: false,
      settings: false,
    },
  });
  const [updatingUser, setUpdatingUser] = useState(false);
  const [editUserError, setEditUserError] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    industry: '',
    whatsapp_enabled: true,
    sms_enabled: false,
    email_enabled: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current client
      const analyticsResponse = await fetch('/api/analytics');
      
      if (!analyticsResponse.ok) {
        if (analyticsResponse.status === 401) {
          router.push('/login');
          return;
        }
        if (analyticsResponse.status === 400) {
          router.push('/clients');
          return;
        }
        throw new Error('Failed to get current client');
      }

      const analyticsData = await analyticsResponse.json();
      const clientId = analyticsData.clientId;

      // Fetch client details and users in parallel
      const [clientResponse, usersResponse] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch('/api/client-users'),
      ]);
      
      if (!clientResponse.ok) {
        throw new Error('Failed to fetch client');
      }

      const clientData = await clientResponse.json();
      setClient(clientData);
      setFormData({
        name: clientData.name || '',
        email: clientData.email || '',
        phone: clientData.phone || '',
        industry: clientData.industry || '',
        whatsapp_enabled: clientData.whatsapp_enabled,
        sms_enabled: clientData.sms_enabled,
        email_enabled: clientData.email_enabled,
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load client settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }

      const updatedClient = await response.json();
      setClient(updatedClient);
      setSuccess('Settings saved successfully');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyClientId = () => {
    if (client) {
      navigator.clipboard.writeText(client.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyPortalLink = () => {
    const link = `${window.location.origin}/portal/login`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setCreatingUser(true);

    try {
      const response = await fetch('/api/client-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (!response.ok) {
        setUserError(data.error || 'Failed to create user');
        return;
      }

      setUsers([data, ...users]);
      setNewUser({
        email: '',
        password: '',
        name: '',
        permissions: { analytics: true, templates: false, settings: false },
      });
      setShowUserModal(false);
    } catch {
      setUserError('An error occurred. Please try again.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEditUser = (user: ClientUser) => {
    setEditingUser(user);
    setEditUserData({
      email: user.email,
      password: '', // Leave empty - only update if user enters new password
      name: user.name || '',
      permissions: { ...user.permissions },
    });
    setEditUserError('');
    setShowEditPassword(false);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditUserError('');
    setUpdatingUser(true);

    try {
      const updateData: Record<string, unknown> = {
        name: editUserData.name,
        permissions: editUserData.permissions,
      };

      // Only include email if it changed
      if (editUserData.email !== editingUser.email) {
        updateData.email = editUserData.email;
      }

      // Only include password if provided
      if (editUserData.password) {
        updateData.password = editUserData.password;
      }

      const response = await fetch(`/api/client-users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditUserError(data.error || 'Failed to update user');
        return;
      }

      setUsers(users.map(u => u.id === editingUser.id ? data : u));
      setShowEditModal(false);
      setEditingUser(null);
    } catch {
      setEditUserError('An error occurred. Please try again.');
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/client-users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleToggleUserActive = async (user: ClientUser) => {
    try {
      const response = await fetch(`/api/client-users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

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

  if (!client) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Card className="text-center py-12 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-[var(--error)] mb-4" />
          <h2 className="text-lg font-medium text-[var(--neutral-900)]">Failed to load settings</h2>
          <p className="mt-1 text-[var(--neutral-600)]">{error || 'Please try again later.'}</p>
          <Button className="mt-4" onClick={fetchData}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--neutral-900)]">Client Settings</h1>
        <p className="mt-1 text-[var(--neutral-600)]">
          Manage settings for <span className="font-medium text-[var(--primary)]">{client.name}</span>
        </p>
      </div>

      {/* Client ID Card */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--neutral-600)]">Client ID (UUID)</h3>
            <p className="mt-1 text-lg font-mono font-semibold text-[var(--neutral-900)] break-all">
              {client.id}
            </p>
            <p className="mt-2 text-sm text-[var(--neutral-500)]">
              Use this ID in n8n and other systems to log messages for this client
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={copyClientId}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-[var(--success)]" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy ID
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-sm text-[var(--neutral-600)]">Total Messages</p>
          <p className="text-2xl font-semibold text-[var(--primary)] mt-1">
            {client.total_messages.toLocaleString()}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-[var(--neutral-600)]">Created</p>
          <p className="text-lg font-medium text-[var(--neutral-900)] mt-1">
            {new Date(client.created_at).toLocaleDateString()}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-[var(--neutral-600)]">Last Updated</p>
          <p className="text-lg font-medium text-[var(--neutral-900)] mt-1">
            {new Date(client.updated_at).toLocaleDateString()}
          </p>
        </Card>
      </div>

      {/* User Management Section */}
      <Card className="mb-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--neutral-200)]">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="text-lg font-semibold text-[var(--neutral-900)]">Client Users</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={copyPortalLink}
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-[var(--success)]" />
                  Copied!
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Copy Portal Link
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => setShowUserModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-[var(--neutral-400)] mb-4" />
              <p className="text-[var(--neutral-600)]">No users added yet</p>
              <p className="text-sm text-[var(--neutral-400)] mt-1">
                Add users to give them access to the client portal
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    user.is_active 
                      ? 'border-[var(--neutral-200)] bg-white' 
                      : 'border-[var(--neutral-200)] bg-[var(--neutral-50)] opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--neutral-900)]">
                        {user.name || user.email}
                      </p>
                      {user.is_active ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--success-light)] text-[var(--success)] flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--neutral-200)] text-[var(--neutral-600)] flex items-center gap-1">
                          <UserX className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--neutral-500)]">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {user.permissions.analytics && (
                        <span className="text-xs px-2 py-1 rounded bg-[var(--primary-light)] text-[var(--primary)]">
                          Analytics
                        </span>
                      )}
                      {user.permissions.templates && (
                        <span className="text-xs px-2 py-1 rounded bg-[var(--success-light)] text-[var(--success)]">
                          Templates
                        </span>
                      )}
                      {user.permissions.settings && (
                        <span className="text-xs px-2 py-1 rounded bg-[var(--warning-light)] text-[var(--warning)]">
                          Settings
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 rounded-lg hover:bg-[var(--primary-light)] transition-colors"
                      title="Edit user"
                    >
                      <Pencil className="w-4 h-4 text-[var(--primary)]" />
                    </button>
                    <button
                      onClick={() => handleToggleUserActive(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.is_active 
                          ? 'hover:bg-[var(--warning-light)]' 
                          : 'hover:bg-[var(--success-light)]'
                      }`}
                      title={user.is_active ? 'Deactivate user' : 'Activate user'}
                    >
                      {user.is_active ? (
                        <UserX className="w-4 h-4 text-[var(--warning)]" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-[var(--success)]" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 rounded-lg hover:bg-[var(--error-light)] transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4 text-[var(--error)]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Settings Form */}
      <Card>
        <form onSubmit={handleSave} className="space-y-6">
          <h3 className="text-lg font-semibold text-[var(--neutral-900)] pb-4 border-b border-[var(--neutral-200)]">
            Client Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="name"
              label="Company Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              id="industry"
              label="Industry"
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g., Healthcare, Retail"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="email"
              label="Contact Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@example.com"
            />
            <Input
              id="phone"
              label="Contact Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Channels */}
          <div className="pt-4 border-t border-[var(--neutral-200)]">
            <h4 className="text-sm font-medium text-[var(--neutral-700)] mb-4">Enabled Channels</h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.whatsapp_enabled}
                  onChange={(e) => setFormData({ ...formData, whatsapp_enabled: e.target.checked })}
                  className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="flex items-center gap-2 text-sm text-[var(--neutral-700)]">
                  <MessageSquare className="w-4 h-4 text-[var(--success)]" />
                  WhatsApp
                </span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sms_enabled}
                  onChange={(e) => setFormData({ ...formData, sms_enabled: e.target.checked })}
                  className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="flex items-center gap-2 text-sm text-[var(--neutral-700)]">
                  <Smartphone className="w-4 h-4 text-[var(--primary)]" />
                  SMS
                </span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_enabled}
                  onChange={(e) => setFormData({ ...formData, email_enabled: e.target.checked })}
                  className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="flex items-center gap-2 text-sm text-[var(--neutral-700)]">
                  <Mail className="w-4 h-4 text-[var(--warning)]" />
                  Email
                </span>
              </label>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-3 rounded-lg bg-[var(--error-light)] text-[var(--error)] text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 rounded-lg bg-[var(--success-light)] text-[var(--success)] text-sm">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--neutral-200)]">
            <Button
              type="button"
              variant="secondary"
              onClick={fetchData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Add Client User"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            id="user-email"
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="user@example.com"
            required
          />
          
          <div className="relative">
            <Input
              id="user-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-[var(--neutral-400)]"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          <Input
            id="user-name"
            label="Name (Optional)"
            type="text"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            placeholder="John Doe"
          />

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-[var(--neutral-700)] mb-3">
              Permissions
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUser.permissions.analytics}
                  onChange={(e) => setNewUser({
                    ...newUser,
                    permissions: { ...newUser.permissions, analytics: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--neutral-700)]">Template Analytics</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUser.permissions.templates}
                  onChange={(e) => setNewUser({
                    ...newUser,
                    permissions: { ...newUser.permissions, templates: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--neutral-700)]">Templates (Coming Soon)</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUser.permissions.settings}
                  onChange={(e) => setNewUser({
                    ...newUser,
                    permissions: { ...newUser.permissions, settings: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--neutral-700)]">Settings (Coming Soon)</span>
              </label>
            </div>
          </div>

          {userError && (
            <div className="p-3 rounded-lg bg-[var(--error-light)] text-[var(--error)] text-sm">
              {userError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowUserModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creatingUser}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        title="Edit User"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <Input
            id="edit-user-email"
            label="Email"
            type="email"
            value={editUserData.email}
            onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
            placeholder="user@example.com"
            required
          />
          
          <div className="relative">
            <Input
              id="edit-user-password"
              label="New Password (leave empty to keep current)"
              type={showEditPassword ? 'text' : 'password'}
              value={editUserData.password}
              onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowEditPassword(!showEditPassword)}
              className="absolute right-3 top-[38px] text-[var(--neutral-400)]"
            >
              {showEditPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          <Input
            id="edit-user-name"
            label="Name"
            type="text"
            value={editUserData.name}
            onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
            placeholder="John Doe"
          />

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-[var(--neutral-700)] mb-3">
              Permissions
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editUserData.permissions.analytics}
                  onChange={(e) => setEditUserData({
                    ...editUserData,
                    permissions: { ...editUserData.permissions, analytics: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--neutral-700)]">Template Analytics</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editUserData.permissions.templates}
                  onChange={(e) => setEditUserData({
                    ...editUserData,
                    permissions: { ...editUserData.permissions, templates: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--neutral-700)]">Templates (Coming Soon)</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editUserData.permissions.settings}
                  onChange={(e) => setEditUserData({
                    ...editUserData,
                    permissions: { ...editUserData.permissions, settings: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--neutral-700)]">Settings (Coming Soon)</span>
              </label>
            </div>
          </div>

          {editUserError && (
            <div className="p-3 rounded-lg bg-[var(--error-light)] text-[var(--error)] text-sm">
              {editUserError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={updatingUser}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

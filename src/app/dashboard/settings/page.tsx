'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save,
  RefreshCw,
  AlertCircle
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
  status_mappings: Record<string, string> | null;
  status_code_mappings: Record<string, string> | null;
  status_colors: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  total_messages: number;
}


export default function SettingsPage() {
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<{ settings: boolean; client_settings?: boolean } | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Delivery status mappings state - maps main status to comma-separated incoming values
  // Format: { "DELIVERED": "delivered,Delivered", "READ": "read,Read" }
  const [statusMappings, setStatusMappings] = useState<Record<string, string>>({});
  
  // Status code mappings state - maps status code categories to comma-separated codes
  // Format: { "SUCCESS": "200,201,202", "CLIENT_ERROR": "400,401,403,404" }
  const [statusCodeMappings, setStatusCodeMappings] = useState<Record<string, string>>({});
  
  // Status colors state - custom colors for each delivery status
  // Format: { "SENT": "#3B82F6", "DELIVERED": "#10B981" }
  const [statusColors, setStatusColors] = useState<Record<string, string>>({});
  
  // Status code colors state - custom colors for each HTTP status code category
  // Format: { "SUCCESS": "#10B981", "CLIENT_ERROR": "#EF4444" }
  const [statusCodeColors, setStatusCodeColors] = useState<Record<string, string>>({});
  
  // Reset confirmation modal state
  const [showResetModal, setShowResetModal] = useState(false);
  
  // Main delivery statuses for analytics
  const MAIN_STATUSES = [
    { key: 'SENT', label: 'Sent', description: 'Message sent successfully' },
    { key: 'DELIVERED', label: 'Delivered', description: 'Message delivered to device' },
    { key: 'READ', label: 'Read', description: 'Message read by recipient' },
    { key: 'REPLIED', label: 'Action', description: 'User replied to message' },
    { key: 'PENDING', label: 'Pending', description: 'Messages with no status (use null for NULL, $empty for empty string)' },
    { key: 'FAILED', label: 'Failed', description: 'Message failed to deliver' },
  ];

  // Status code categories
  const STATUS_CODE_CATEGORIES = [
    { key: 'SUCCESS', label: 'Success', description: 'Successful request (e.g., 200, 201, 202)' },
    { key: 'CLIENT_ERROR', label: 'Client Error', description: 'Client-side errors (4xx codes)' },
    { key: 'SERVER_ERROR', label: 'Server Error', description: 'Server-side errors (5xx codes)' },
  ];

  // Default status mappings
  const DEFAULT_STATUS_MAPPINGS: Record<string, string> = {
    SENT: 'sent,Sent,SENT',
    DELIVERED: 'delivered,Delivered,DELIVERED',
    READ: 'read,Read,READ',
    REPLIED: 'replied,Replied,REPLIED',
    FAILED: 'failed,Failed,FAILED',
    PENDING: 'null,$empty', // Pending maps to null and empty string values ($empty = empty string)
  };

  // Default status code mappings
  const DEFAULT_STATUS_CODE_MAPPINGS: Record<string, string> = {
    SUCCESS: '200,201,202',
    CLIENT_ERROR: '400,401,403,404',
    SERVER_ERROR: '500,502,503',
  };

  // Default status colors
  const DEFAULT_STATUS_COLORS: Record<string, string> = {
    SENT: '#3B82F6',      // Blue
    DELIVERED: '#10B981', // Green
    READ: '#6366F1',      // Indigo
    REPLIED: '#8B5CF6',   // Purple
    PENDING: '#F59E0B',   // Amber
    FAILED: '#EF4444',    // Red
  };

  // Default status code colors
  const DEFAULT_STATUS_CODE_COLORS: Record<string, string> = {
    SUCCESS: '#10B981',      // Green
    CLIENT_ERROR: '#F59E0B', // Amber
    SERVER_ERROR: '#EF4444', // Red
  };

  useEffect(() => {
    fetchData();
    checkUserRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUserRole = async () => {
    try {
      // Check if user is super admin or client user
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        const isAdmin = data.isAdmin || false;
        setIsSuperAdmin(isAdmin);
        if (data.permissions) {
          setUserPermissions(data.permissions);
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

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
          // Only super admin can access /clients
          router.push('/login');
          return;
        }
        throw new Error('Failed to get current client');
      }

      const analyticsData = await analyticsResponse.json();
      const clientId = analyticsData.clientId;

      // Fetch client details
      const clientResponse = await fetch(`/api/clients/${clientId}`);
      
      if (!clientResponse.ok) {
        throw new Error('Failed to fetch client');
      }

      const clientData = await clientResponse.json();
      setClient(clientData);
      // Initialize delivery status mappings - use defaults if empty
      const existingMappings = clientData.status_mappings || {};
      const initializedMappings: Record<string, string> = {};
      MAIN_STATUSES.forEach(status => {
        let mappingValue = existingMappings[status.key] || DEFAULT_STATUS_MAPPINGS[status.key] || '';
        
        // For PENDING, ensure empty string is included if 'null' is present
        if (status.key === 'PENDING' && mappingValue) {
          const values = mappingValue.split(',').map((v: string) => v.trim());
          const hasNull = values.includes('null');
          const hasEmptyString = values.includes('') || values.includes('$empty');
          
          if (hasNull && !hasEmptyString) {
            // Add $empty if null is present but empty string is not
            mappingValue = mappingValue.trim();
            if (!mappingValue.endsWith(',')) {
              mappingValue += ',';
            }
            mappingValue += '$empty';
          } else if (hasEmptyString && !values.includes('$empty')) {
            // Convert empty string to $empty for clarity
            mappingValue = mappingValue.split(',').map((v: string) => {
              const trimmed = v.trim();
              return trimmed === '' ? '$empty' : trimmed;
            }).join(',');
          }
        }
        
        initializedMappings[status.key] = mappingValue;
      });
      setStatusMappings(initializedMappings);

      // Initialize status code mappings - use defaults if empty
      const existingCodeMappings = clientData.status_code_mappings || {};
      const initializedCodeMappings: Record<string, string> = {};
      STATUS_CODE_CATEGORIES.forEach(category => {
        initializedCodeMappings[category.key] = existingCodeMappings[category.key] || DEFAULT_STATUS_CODE_MAPPINGS[category.key] || '';
      });
      setStatusCodeMappings(initializedCodeMappings);

      // Initialize status colors - use defaults if empty
      const existingColors = clientData.status_colors || {};
      const initializedColors: Record<string, string> = {};
      MAIN_STATUSES.forEach(status => {
        initializedColors[status.key] = existingColors[status.key] || DEFAULT_STATUS_COLORS[status.key] || '#6B7280';
      });
      setStatusColors(initializedColors);

      // Initialize status code colors - use defaults if empty
      const initializedCodeColors: Record<string, string> = {};
      STATUS_CODE_CATEGORIES.forEach(category => {
        initializedCodeColors[category.key] = existingColors[`CODE_${category.key}`] || DEFAULT_STATUS_CODE_COLORS[category.key] || '#6B7280';
      });
      setStatusCodeColors(initializedCodeColors);
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
      // Combine status colors and status code colors
      const combinedColors = {
        ...statusColors,
        ...Object.fromEntries(
          Object.entries(statusCodeColors).map(([key, value]) => [`CODE_${key}`, value])
        ),
      };

      console.log('Saving colors:', combinedColors);
      console.log('REPLIED color being saved:', combinedColors['REPLIED']);

      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_mappings: statusMappings,
          status_code_mappings: statusCodeMappings,
          status_colors: combinedColors,
        }),
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

  // Check RBAC - only show if user has settings permission
  const canViewSettings = isSuperAdmin || (userPermissions?.settings === true);

  if (!canViewSettings) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Card className="text-center py-12 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-[var(--error)] mb-4" />
          <h2 className="text-lg font-medium text-[var(--neutral-900)]">Access Denied</h2>
          <p className="mt-1 text-[var(--neutral-600)]">You do not have permission to access this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--neutral-900)]">Settings</h1>
        <p className="mt-1 text-[var(--neutral-600)]">
          Configure delivery status and HTTP status code mappings for <span className="font-medium text-[var(--primary)]">{client.name}</span>
        </p>
      </div>

      {/* Settings Content */}
      <div className="space-y-6">
        <Card>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Delivery Status Configuration */}
            <div className="pt-4 border-t border-[var(--neutral-200)] first:pt-0 first:border-t-0">
            <h4 className="text-sm font-medium text-[var(--neutral-700)] mb-2">Delivery Status Configuration</h4>
            <p className="text-xs text-[var(--neutral-500)] mb-4">
              Configure how delivery statuses are mapped and displayed. Map incoming values from different platforms and customize colors for each status.
            </p>
            
            {/* Combined Status Mapping and Colors */}
            <div className="space-y-4">
              {MAIN_STATUSES.map((status) => (
                <div key={status.key} className="p-4 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)]">
                  <div className="flex items-start gap-4">
                    {/* Color Picker */}
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="color"
                        value={statusColors[status.key] || DEFAULT_STATUS_COLORS[status.key]}
                        onChange={(e) => {
                          setStatusColors({
                            ...statusColors,
                            [status.key]: e.target.value,
                          });
                        }}
                        className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                        title={`Color for ${status.label}`}
                      />
                      <input
                        type="text"
                        value={statusColors[status.key] || DEFAULT_STATUS_COLORS[status.key]}
                        onChange={(e) => {
                          setStatusColors({
                            ...statusColors,
                            [status.key]: e.target.value,
                          });
                        }}
                        className="text-xs font-mono text-[var(--neutral-600)] w-20 px-2 py-1 rounded border border-[var(--neutral-200)] text-center"
                        placeholder="#000000"
                      />
                    </div>
                    
                    {/* Status Info and Mapping */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: statusColors[status.key] || DEFAULT_STATUS_COLORS[status.key] }}
                        >
                          {status.label}
                        </span>
                        <span className="text-xs text-[var(--neutral-500)]">{status.description}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--neutral-600)] shrink-0">Maps from:</span>
                        <Input
                          type="text"
                          placeholder={status.key === 'PENDING' ? 'e.g., null,$empty' : 'e.g., read,Read,READ'}
                          value={statusMappings[status.key] || ''}
                          onChange={(e) => {
                            setStatusMappings({
                              ...statusMappings,
                              [status.key]: e.target.value,
                            });
                          }}
                          className="flex-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Reset to Defaults Button */}
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="mt-4 text-sm text-[var(--primary)] hover:text-[var(--primary-dark)] underline"
            >
              Reset to defaults
            </button>
          </div>

          {/* HTTP Status Code Configuration */}
          <div className="pt-4 border-t border-[var(--neutral-200)]">
            <h4 className="text-sm font-medium text-[var(--neutral-700)] mb-2">HTTP Status Code Configuration</h4>
            <p className="text-xs text-[var(--neutral-500)] mb-4">
              Configure how HTTP status codes are mapped and displayed. Map status codes from different platforms and customize colors for each category.
            </p>
            
            {/* Combined Status Code Mapping and Colors */}
            <div className="space-y-4">
              {STATUS_CODE_CATEGORIES.map((category) => (
                <div key={category.key} className="p-4 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)]">
                  <div className="flex items-start gap-4">
                    {/* Color Picker */}
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="color"
                        value={statusCodeColors[category.key] || DEFAULT_STATUS_CODE_COLORS[category.key]}
                        onChange={(e) => {
                          setStatusCodeColors({
                            ...statusCodeColors,
                            [category.key]: e.target.value,
                          });
                        }}
                        className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                        title={`Color for ${category.label}`}
                      />
                      <input
                        type="text"
                        value={statusCodeColors[category.key] || DEFAULT_STATUS_CODE_COLORS[category.key]}
                        onChange={(e) => {
                          setStatusCodeColors({
                            ...statusCodeColors,
                            [category.key]: e.target.value,
                          });
                        }}
                        className="text-xs font-mono text-[var(--neutral-600)] w-20 px-2 py-1 rounded border border-[var(--neutral-200)] text-center"
                        placeholder="#000000"
                      />
                    </div>
                    
                    {/* Category Info and Mapping */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: statusCodeColors[category.key] || DEFAULT_STATUS_CODE_COLORS[category.key] }}
                        >
                          {category.label}
                        </span>
                        <span className="text-xs text-[var(--neutral-500)]">{category.description}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--neutral-600)] shrink-0">Maps from:</span>
                        <Input
                          type="text"
                          placeholder="e.g., 200,201,202"
                          value={statusCodeMappings[category.key] || ''}
                          onChange={(e) => {
                            setStatusCodeMappings({
                              ...statusCodeMappings,
                              [category.key]: e.target.value,
                            });
                          }}
                          className="flex-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Reset to Defaults Button */}
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="mt-4 text-sm text-[var(--primary)] hover:text-[var(--primary-dark)] underline"
            >
              Reset to defaults
            </button>
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
        </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset to Defaults"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[var(--neutral-700)]">
                Are you sure you want to reset all delivery status mappings and colors to their default values?
              </p>
              <p className="text-xs text-[var(--neutral-500)] mt-2">
                This will reset:
              </p>
              <ul className="text-xs text-[var(--neutral-500)] mt-1 ml-4 list-disc">
                <li>All delivery status mappings</li>
                <li>All delivery status colors</li>
                <li>All HTTP status code mappings</li>
                <li>All HTTP status code colors</li>
              </ul>
              <p className="text-xs text-[var(--warning)] mt-3 font-medium">
                This action cannot be undone. You will need to reconfigure your settings.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--neutral-200)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowResetModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setStatusColors({ ...DEFAULT_STATUS_COLORS });
                setStatusMappings({ ...DEFAULT_STATUS_MAPPINGS });
                setStatusCodeColors({ ...DEFAULT_STATUS_CODE_COLORS });
                setStatusCodeMappings({ ...DEFAULT_STATUS_CODE_MAPPINGS });
                setShowResetModal(false);
              }}
              className="bg-[var(--error)] text-white hover:bg-[var(--error-dark)] focus:ring-[var(--error)]"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

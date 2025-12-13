'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Send,
  CheckCircle2,
  Eye,
  AlertCircle,
  Clock,
  RefreshCw,
  User,
  Phone,
  MessageSquare,
  Mail,
  BarChart3,
  TrendingUp,
  Activity,
  Circle,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Pencil,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { MetricConfig, DynamicMetricStat } from '@/lib/types';

interface TemplateMessage {
  id: string;
  name: string | null;
  phone: string | null;
  status_code: number | null;
  status_message: string | null;
  message_status: string | null;
  message_status_detailed: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateData {
  templateName: string;
  total: number;
  metrics: MetricConfig[];
  metricStats: DynamicMetricStat[];
  messages: TemplateMessage[];
}

// Icon mapping for dynamic metrics
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Send,
  CheckCircle2,
  Eye,
  AlertCircle,
  Clock,
  MessageSquare,
  Mail,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Activity,
  Circle,
  Phone,
  User,
};

function getIconComponent(iconName: string) {
  return ICON_MAP[iconName] || Circle;
}

// Helper to display raw value as-is
function formatRawValue(value: string | number | null | undefined): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value === '') return '(empty)';
  return String(value);
}

// Helper to truncate text for table display
function truncateText(value: string | number | null | undefined, maxLength: number = 30): string {
  const formatted = formatRawValue(value);
  if (formatted.length <= maxLength) return formatted;
  return formatted.substring(0, maxLength) + '...';
}

// Helper to get filter key for null/empty values
function getFilterKey(value: string | number | null | undefined): string {
  if (value === null) return '__null__';
  if (value === undefined) return '__undefined__';
  if (value === '') return '__empty__';
  return String(value);
}

// Helper to check if a value matches any filter in a Set
function matchesFilters(value: string | number | null | undefined, filterSet: Set<string>): boolean {
  if (filterSet.size === 0) return true; // No filters = match all
  const key = getFilterKey(value);
  return filterSet.has(key);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get date range presets
function getDateRange(preset: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  switch (preset) {
    case 'today':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end };
    case '7days':
      const start7 = new Date(now);
      start7.setDate(start7.getDate() - 7);
      return { start: start7, end };
    case '30days':
      const start30 = new Date(now);
      start30.setDate(start30.getDate() - 30);
      return { start: start30, end };
    case 'all':
    default:
      return { start: new Date(2020, 0, 1), end };
  }
}

interface TemplateDetailProps {
  templateName: string;
  basePath: string;
  loginPath: string;
  clientsPath?: string;
}

const ITEMS_PER_PAGE = 25;

export default function TemplateDetail({ 
  templateName, 
  basePath,
  loginPath,
  clientsPath 
}: TemplateDetailProps) {
  const router = useRouter();
  
  const [data, setData] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Permissions state
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  // Message detail modal state
  const [selectedMessage, setSelectedMessage] = useState<TemplateMessage | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TemplateMessage>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Fetch permissions on mount
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData.isAdmin) {
            setIsSuperAdmin(true);
            setCanEdit(true);
            setCanDelete(true);
          } else if (sessionData.permissions) {
            setCanEdit(sessionData.permissions.analytics_edit === true);
            setCanDelete(sessionData.permissions.analytics_delete === true);
          }
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };
    fetchPermissions();
  }, []);

  // Date range state - default to last 30 days
  const defaultRange = getDateRange('30days');
  const [startDate, setStartDate] = useState<string>(formatDateInput(defaultRange.start));
  const [endDate, setEndDate] = useState<string>(formatDateInput(defaultRange.end));
  const [activeDatePreset, setActiveDatePreset] = useState<string>('30days');

  // Search & filter state - using Sets for multi-select checkboxes
  const [searchColumn, setSearchColumn] = useState<string>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [statusCodeFilters, setStatusCodeFilters] = useState<Set<string>>(new Set());
  const [statusMessageFilters, setStatusMessageFilters] = useState<Set<string>>(new Set());
  const [deliveryStatusFilters, setDeliveryStatusFilters] = useState<Set<string>>(new Set());
  
  // Filter dropdown visibility
  const [showStatusCodeDropdown, setShowStatusCodeDropdown] = useState(false);
  const [showStatusMessageDropdown, setShowStatusMessageDropdown] = useState(false);
  const [showDeliveryStatusDropdown, setShowDeliveryStatusDropdown] = useState(false);

  // Toggle filter value in a Set
  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const newSet = new Set(set);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setter(newSet);
    setCurrentPage(1);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTemplateData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api/analytics/template/${encodeURIComponent(templateName)}?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push(loginPath);
          return;
        }
        if (response.status === 400 && clientsPath) {
          router.push(clientsPath);
          return;
        }
        throw new Error('Failed to fetch template data');
      }
      
      const templateData = await response.json();
      setData(templateData);
      setCurrentPage(1); // Reset to first page on new data
    } catch (error) {
      console.error('Error fetching template data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [templateName, startDate, endDate, router, loginPath, clientsPath]);

  useEffect(() => {
    if (templateName) {
      fetchTemplateData();
    }
  }, [templateName, fetchTemplateData]);

  // Get unique values for filter dropdowns - include null and empty strings
  const uniqueStatusCodes = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const result: { key: string; display: string; value: number | null }[] = [];
    
    for (const m of data.messages) {
      const key = getFilterKey(m.status_code);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ key, display: formatRawValue(m.status_code), value: m.status_code });
      }
    }
    
    // Sort: nulls first, then by numeric value
    return result.sort((a, b) => {
      if (a.value === null && b.value !== null) return -1;
      if (a.value !== null && b.value === null) return 1;
      return (a.value || 0) - (b.value || 0);
    });
  }, [data]);

  const uniqueStatusMessages = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const result: { key: string; display: string }[] = [];
    
    for (const m of data.messages) {
      const key = getFilterKey(m.status_message);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ key, display: formatRawValue(m.status_message) });
      }
    }
    
    // Sort: nulls first, empty second, then alphabetically
    return result.sort((a, b) => {
      if (a.key === '__null__') return -1;
      if (b.key === '__null__') return 1;
      if (a.key === '__empty__') return -1;
      if (b.key === '__empty__') return 1;
      return a.display.localeCompare(b.display);
    });
  }, [data]);

  const uniqueDeliveryStatuses = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const result: { key: string; display: string }[] = [];
    
    for (const m of data.messages) {
      const key = getFilterKey(m.message_status);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ key, display: formatRawValue(m.message_status) });
      }
    }
    
    // Sort: nulls first, empty second, then alphabetically
    return result.sort((a, b) => {
      if (a.key === '__null__') return -1;
      if (b.key === '__null__') return 1;
      if (a.key === '__empty__') return -1;
      if (b.key === '__empty__') return 1;
      return a.display.localeCompare(b.display);
    });
  }, [data]);

  // Filter and search messages
  const filteredMessages = useMemo(() => {
    if (!data) return [];
    
    return data.messages.filter(message => {
      // Search filter - search only in selected column
      if (appliedSearchQuery) {
        const query = appliedSearchQuery.toLowerCase();
        let matches = false;
        
        if (searchColumn === 'name') {
          matches = message.name?.toLowerCase().includes(query) || false;
        } else if (searchColumn === 'phone') {
          matches = message.phone?.toLowerCase().includes(query) || false;
        }
        
        if (!matches) return false;
      }

      // Status code filter - using matchesFilters helper for multi-select
      if (!matchesFilters(message.status_code, statusCodeFilters)) {
        return false;
      }

      // Status message filter
      if (!matchesFilters(message.status_message, statusMessageFilters)) {
        return false;
      }

      // Delivery status filter
      if (!matchesFilters(message.message_status, deliveryStatusFilters)) {
        return false;
      }

      return true;
    });
  }, [data, appliedSearchQuery, searchColumn, statusCodeFilters, statusMessageFilters, deliveryStatusFilters]);

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMessages.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  const handleDatePreset = (preset: string) => {
    const range = getDateRange(preset);
    setStartDate(formatDateInput(range.start));
    setEndDate(formatDateInput(range.end));
    setActiveDatePreset(preset);
  };

  const handleBack = () => {
    router.push(`${basePath}/analytics`);
  };

  const handleSearch = () => {
    setAppliedSearchQuery(searchQuery);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setAppliedSearchQuery('');
    setStatusCodeFilters(new Set());
    setStatusMessageFilters(new Set());
    setDeliveryStatusFilters(new Set());
    setCurrentPage(1);
  };

  const hasActiveFilters = appliedSearchQuery || statusCodeFilters.size > 0 || statusMessageFilters.size > 0 || deliveryStatusFilters.size > 0;

  // Open detail modal for a message
  const openDetailModal = (message: TemplateMessage) => {
    setSelectedMessage(message);
    setEditForm({
      name: message.name,
      phone: message.phone,
      status_code: message.status_code,
      status_message: message.status_message,
      message_status: message.message_status,
      message_status_detailed: message.message_status_detailed,
    });
    setIsEditing(false);
    setDetailError('');
    setShowDetailModal(true);
  };

  // Close detail modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedMessage(null);
    setIsEditing(false);
    setEditForm({});
    setDetailError('');
  };

  // Save message edits
  const handleSaveEdit = async () => {
    if (!selectedMessage) return;
    
    setSaving(true);
    setDetailError('');
    
    try {
      const response = await fetch(`/api/message-logs/${selectedMessage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update message');
      }
      
      const updatedMessage = await response.json();
      
      // Update local data
      if (data) {
        setData({
          ...data,
          messages: data.messages.map(m => 
            m.id === updatedMessage.id ? updatedMessage : m
          ),
        });
      }
      
      setSelectedMessage(updatedMessage);
      setIsEditing(false);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Delete message
  const handleDelete = async () => {
    if (!selectedMessage) return;
    
    if (!confirm('Are you sure you want to delete this message log? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    setDetailError('');
    
    try {
      const response = await fetch(`/api/message-logs/${selectedMessage.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete message');
      }
      
      // Remove from local data
      if (data) {
        setData({
          ...data,
          messages: data.messages.filter(m => m.id !== selectedMessage.id),
          total: data.total - 1,
        });
      }
      
      closeDetailModal();
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Failed to delete message');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--neutral-200)] rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-[var(--neutral-200)] rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-[var(--neutral-200)] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Card className="text-center py-12 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-[var(--error)] mb-4" />
          <h2 className="text-lg font-medium text-[var(--neutral-900)]">Failed to load template data</h2>
          <p className="mt-1 text-[var(--neutral-600)]">Please try again later.</p>
          <Button className="mt-4" onClick={() => fetchTemplateData()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const { metricStats } = data;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-[var(--neutral-100)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--neutral-600)]" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--neutral-900)]">{templateName}</h1>
            <p className="mt-1 text-[var(--neutral-600)]">Template Analytics</p>
          </div>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => fetchTemplateData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--neutral-700)]">
            <Calendar className="w-4 h-4" />
            <span>Date Range:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveDatePreset('');
              }}
              className="px-3 py-2 border border-[var(--neutral-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
            <span className="text-[var(--neutral-500)]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActiveDatePreset('');
              }}
              className="px-3 py-2 border border-[var(--neutral-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            {['today', '7days', '30days', 'all'].map((preset) => (
              <button
                key={preset}
                onClick={() => handleDatePreset(preset)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  activeDatePreset === preset
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-white border-[var(--neutral-200)] text-[var(--neutral-700)] hover:border-[var(--neutral-300)]'
                }`}
              >
                {preset === 'today' && 'Today'}
                {preset === '7days' && 'Last 7 Days'}
                {preset === '30days' && 'Last 30 Days'}
                {preset === 'all' && 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Dynamic Stats Grid */}
      <div className={`grid gap-4 mb-8 ${
        metricStats.length === 0 ? 'grid-cols-1 md:grid-cols-2' :
        metricStats.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
        metricStats.length <= 3 ? 'grid-cols-2 md:grid-cols-3' :
        metricStats.length <= 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' :
        'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
      }`}>
        {/* Dynamic Metric Cards */}
        {metricStats.map((stat) => {
          const IconComponent = getIconComponent(stat.icon);
          return (
            <Card key={stat.metric_id} className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--neutral-600)]">{stat.name}</p>
                  <p className="mt-2 text-3xl font-semibold" style={{ color: stat.color }}>
                    {stat.prefix && <span className="text-lg mr-1">{stat.prefix}</span>}
                    {stat.is_calculated 
                      ? (Number.isInteger(stat.count) 
                          ? stat.count.toLocaleString() 
                          : parseFloat(stat.count.toFixed(2)).toLocaleString())
                      : stat.count.toLocaleString()}
                    {stat.unit && <span className="text-lg ml-1">{stat.unit}</span>}
                  </p>
                </div>
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <IconComponent className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
            </Card>
          );
        })}

        {metricStats.length === 0 && (
          <Card className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--neutral-600)]">Metrics</p>
                <p className="mt-2 text-sm text-[var(--neutral-500)]">
                  Configure metrics in Settings to see detailed stats
                </p>
              </div>
              <div className="p-2 rounded-lg bg-[var(--neutral-100)]">
                <AlertCircle className="w-5 h-5 text-[var(--neutral-400)]" />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Messages Table */}
      <Card padding="none">
        {/* Search & Filters Header */}
        <div className="p-6 border-b border-[var(--neutral-200)]">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex items-center gap-2 max-w-2xl">
              <select
                value={searchColumn}
                onChange={(e) => setSearchColumn(e.target.value)}
                className="px-3 py-2.5 border border-[var(--neutral-200)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="phone">Phone</option>
              </select>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter search term..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-[var(--neutral-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-[var(--neutral-600)]">
                <Filter className="w-4 h-4" />
                <span>Filters:</span>
              </div>

              {/* Status Code Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowStatusCodeDropdown(!showStatusCodeDropdown);
                    setShowStatusMessageDropdown(false);
                    setShowDeliveryStatusDropdown(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                    statusCodeFilters.size > 0
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                      : 'border-[var(--neutral-200)] hover:border-[var(--neutral-300)]'
                  }`}
                >
                  Status Code
                  {statusCodeFilters.size > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-[var(--primary)] text-white rounded-full">
                      {statusCodeFilters.size}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showStatusCodeDropdown && (
                  <div className="absolute z-20 mt-1 w-48 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <label
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--neutral-50)] cursor-pointer border-b border-[var(--neutral-200)] font-medium"
                    >
                      <input
                        type="checkbox"
                        checked={statusCodeFilters.size === 0}
                        onChange={() => {
                          setStatusCodeFilters(new Set());
                          setCurrentPage(1);
                        }}
                        className="w-4 h-4 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      All
                    </label>
                    {uniqueStatusCodes.map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--neutral-50)] cursor-pointer ${
                          item.key === '__null__' || item.key === '__empty__' ? 'italic text-[var(--neutral-500)]' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={statusCodeFilters.has(item.key)}
                          onChange={() => toggleFilter(statusCodeFilters, item.key, setStatusCodeFilters)}
                          className="w-4 h-4 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        {item.display}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Message Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowStatusMessageDropdown(!showStatusMessageDropdown);
                    setShowStatusCodeDropdown(false);
                    setShowDeliveryStatusDropdown(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                    statusMessageFilters.size > 0
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                      : 'border-[var(--neutral-200)] hover:border-[var(--neutral-300)]'
                  }`}
                >
                  Status Message
                  {statusMessageFilters.size > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-[var(--primary)] text-white rounded-full">
                      {statusMessageFilters.size}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showStatusMessageDropdown && (
                  <div className="absolute z-20 mt-1 w-56 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <label
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--neutral-50)] cursor-pointer border-b border-[var(--neutral-200)] font-medium"
                    >
                      <input
                        type="checkbox"
                        checked={statusMessageFilters.size === 0}
                        onChange={() => {
                          setStatusMessageFilters(new Set());
                          setCurrentPage(1);
                        }}
                        className="w-4 h-4 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      All
                    </label>
                    {uniqueStatusMessages.map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--neutral-50)] cursor-pointer ${
                          item.key === '__null__' || item.key === '__empty__' ? 'italic text-[var(--neutral-500)]' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={statusMessageFilters.has(item.key)}
                          onChange={() => toggleFilter(statusMessageFilters, item.key, setStatusMessageFilters)}
                          className="w-4 h-4 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span className="truncate">{item.display}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivery Status Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowDeliveryStatusDropdown(!showDeliveryStatusDropdown);
                    setShowStatusCodeDropdown(false);
                    setShowStatusMessageDropdown(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                    deliveryStatusFilters.size > 0
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                      : 'border-[var(--neutral-200)] hover:border-[var(--neutral-300)]'
                  }`}
                >
                  Delivery Status
                  {deliveryStatusFilters.size > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-[var(--primary)] text-white rounded-full">
                      {deliveryStatusFilters.size}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showDeliveryStatusDropdown && (
                  <div className="absolute z-20 mt-1 w-48 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <label
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--neutral-50)] cursor-pointer border-b border-[var(--neutral-200)] font-medium"
                    >
                      <input
                        type="checkbox"
                        checked={deliveryStatusFilters.size === 0}
                        onChange={() => {
                          setDeliveryStatusFilters(new Set());
                          setCurrentPage(1);
                        }}
                        className="w-4 h-4 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      All
                    </label>
                    {uniqueDeliveryStatuses.map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--neutral-50)] cursor-pointer ${
                          item.key === '__null__' || item.key === '__empty__' ? 'italic text-[var(--neutral-500)]' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={deliveryStatusFilters.has(item.key)}
                          onChange={() => toggleFilter(deliveryStatusFilters, item.key, setDeliveryStatusFilters)}
                          className="w-4 h-4 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        {item.display}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--error)] hover:text-[var(--error-dark)]"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--neutral-50)]">
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--neutral-600)] uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--neutral-600)] uppercase tracking-wider">
                  Status Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--neutral-600)] uppercase tracking-wider">
                  Status Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--neutral-600)] uppercase tracking-wider">
                  Delivery Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--neutral-600)] uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--neutral-600)] uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--neutral-600)] uppercase tracking-wider">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--neutral-200)]">
              {paginatedMessages.map((message) => (
                <tr 
                  key={message.id} 
                  className="hover:bg-[var(--neutral-50)] cursor-pointer transition-colors"
                  onClick={() => openDetailModal(message)}
                >
                  <td className="px-6 py-4 whitespace-nowrap max-w-[180px]">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--neutral-900)]">
                        <User className="w-4 h-4 text-[var(--neutral-400)] flex-shrink-0" />
                        <span className={`truncate ${message.name === null || message.name === '' ? 'italic text-[var(--neutral-500)]' : ''}`}>
                          {truncateText(message.name, 20)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--neutral-600)] mt-1">
                        <Phone className="w-4 h-4 text-[var(--neutral-400)] flex-shrink-0" />
                        <span className={`truncate ${message.phone === null || message.phone === '' ? 'italic text-[var(--neutral-500)]' : ''}`}>
                          {truncateText(message.phone, 15)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm max-w-[80px]">
                    <span className={message.status_code === null || message.status_code === undefined ? 'italic text-[var(--neutral-500)]' : 'text-[var(--neutral-700)]'}>
                      {formatRawValue(message.status_code)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm max-w-[200px]">
                    <span className={`block truncate ${message.status_message === null || message.status_message === '' ? 'italic text-[var(--neutral-500)]' : 'text-[var(--neutral-700)]'}`}>
                      {truncateText(message.status_message, 35)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm max-w-[100px]">
                    <span className={message.message_status === null || message.message_status === '' ? 'italic text-[var(--neutral-500)]' : 'text-[var(--neutral-700)]'}>
                      {truncateText(message.message_status, 15)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm max-w-[150px]">
                    <span className={`block truncate ${message.message_status_detailed === null || message.message_status_detailed === '' ? 'italic text-[var(--neutral-500)]' : 'text-[var(--neutral-700)]'}`}>
                      {truncateText(message.message_status_detailed, 25)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--neutral-600)]">
                    {formatDate(message.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--neutral-600)]">
                    {formatDate(message.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {paginatedMessages.length === 0 && (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-[var(--neutral-400)] mb-4" />
            <p className="text-[var(--neutral-600)]">
              {hasActiveFilters ? 'No messages match your filters' : 'No messages found for this template'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-[var(--primary)] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--neutral-200)] flex items-center justify-between">
            <p className="text-sm text-[var(--neutral-600)]">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredMessages.length)} of {filteredMessages.length} messages
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-[var(--neutral-200)] hover:bg-[var(--neutral-50)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-[var(--primary)] text-white'
                          : 'hover:bg-[var(--neutral-100)] text-[var(--neutral-700)]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-[var(--neutral-200)] hover:bg-[var(--neutral-50)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Message Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        title="Message Details"
        size="lg"
      >
        {selectedMessage && (
          <div className="space-y-6">
            {/* Error Display */}
            {detailError && (
              <div className="p-3 bg-[var(--error-light)] border border-[var(--error)] rounded-lg">
                <p className="text-sm text-[var(--error)]">{detailError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pb-4 border-b border-[var(--neutral-200)]">
              {(isSuperAdmin || canEdit) && !isEditing && (
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {(isSuperAdmin || canDelete) && (
                <Button
                  variant="secondary"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[var(--error)] border-[var(--error)] hover:bg-[var(--error-light)]"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        name: selectedMessage.name,
                        phone: selectedMessage.phone,
                        status_code: selectedMessage.status_code,
                        status_message: selectedMessage.status_message,
                        message_status: selectedMessage.message_status,
                        message_status_detailed: selectedMessage.message_status_detailed,
                      });
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </>
              )}
            </div>

            {/* Detail Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ID - Read only */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-1">
                  Message ID
                </label>
                <p className="text-sm text-[var(--neutral-900)] font-mono bg-[var(--neutral-50)] px-3 py-2 rounded-lg break-all">
                  {selectedMessage.id}
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-1">
                  Name
                </label>
                {isEditing ? (
                  <Input
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value || null })}
                    placeholder="Enter name"
                  />
                ) : (
                  <p className={`text-sm px-3 py-2 rounded-lg bg-[var(--neutral-50)] break-words ${
                    selectedMessage.name === null || selectedMessage.name === '' 
                      ? 'italic text-[var(--neutral-500)]' 
                      : 'text-[var(--neutral-900)]'
                  }`}>
                    {formatRawValue(selectedMessage.name)}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-1">
                  Phone
                </label>
                {isEditing ? (
                  <Input
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value || null })}
                    placeholder="Enter phone"
                  />
                ) : (
                  <p className={`text-sm px-3 py-2 rounded-lg bg-[var(--neutral-50)] break-words ${
                    selectedMessage.phone === null || selectedMessage.phone === '' 
                      ? 'italic text-[var(--neutral-500)]' 
                      : 'text-[var(--neutral-900)]'
                  }`}>
                    {formatRawValue(selectedMessage.phone)}
                  </p>
                )}
              </div>

              {/* Status Code */}
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-1">
                  Status Code
                </label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editForm.status_code ?? ''}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      status_code: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Enter status code"
                  />
                ) : (
                  <p className={`text-sm px-3 py-2 rounded-lg bg-[var(--neutral-50)] ${
                    selectedMessage.status_code === null 
                      ? 'italic text-[var(--neutral-500)]' 
                      : 'text-[var(--neutral-900)]'
                  }`}>
                    {formatRawValue(selectedMessage.status_code)}
                  </p>
                )}
              </div>

              {/* Delivery Status */}
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-1">
                  Delivery Status
                </label>
                {isEditing ? (
                  <Input
                    value={editForm.message_status || ''}
                    onChange={(e) => setEditForm({ ...editForm, message_status: e.target.value || null })}
                    placeholder="Enter delivery status"
                  />
                ) : (
                  <p className={`text-sm px-3 py-2 rounded-lg bg-[var(--neutral-50)] break-words ${
                    selectedMessage.message_status === null || selectedMessage.message_status === '' 
                      ? 'italic text-[var(--neutral-500)]' 
                      : 'text-[var(--neutral-900)]'
                  }`}>
                    {formatRawValue(selectedMessage.message_status)}
                  </p>
                )}
              </div>

              {/* Status Message - Full width for long content */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-1">
                  Status Message
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.status_message || ''}
                    onChange={(e) => setEditForm({ ...editForm, status_message: e.target.value || null })}
                    placeholder="Enter status message"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-[var(--neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                  />
                ) : (
                  <p className={`text-sm px-3 py-2 rounded-lg bg-[var(--neutral-50)] break-words whitespace-pre-wrap ${
                    selectedMessage.status_message === null || selectedMessage.status_message === '' 
                      ? 'italic text-[var(--neutral-500)]' 
                      : 'text-[var(--neutral-900)]'
                  }`}>
                    {formatRawValue(selectedMessage.status_message)}
                  </p>
                )}
              </div>

              {/* Status Details - Full width for long content */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-1">
                  Status Details
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.message_status_detailed || ''}
                    onChange={(e) => setEditForm({ ...editForm, message_status_detailed: e.target.value || null })}
                    placeholder="Enter status details"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-[var(--neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                  />
                ) : (
                  <p className={`text-sm px-3 py-2 rounded-lg bg-[var(--neutral-50)] break-words whitespace-pre-wrap ${
                    selectedMessage.message_status_detailed === null || selectedMessage.message_status_detailed === '' 
                      ? 'italic text-[var(--neutral-500)]' 
                      : 'text-[var(--neutral-900)]'
                  }`}>
                    {formatRawValue(selectedMessage.message_status_detailed)}
                  </p>
                )}
              </div>

              {/* Created At - Read only */}
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-1">
                  Created At
                </label>
                <p className="text-sm text-[var(--neutral-900)] px-3 py-2 rounded-lg bg-[var(--neutral-50)]">
                  {formatDate(selectedMessage.created_at)}
                </p>
              </div>

              {/* Updated At - Read only */}
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-600)] mb-1">
                  Updated At
                </label>
                <p className="text-sm text-[var(--neutral-900)] px-3 py-2 rounded-lg bg-[var(--neutral-50)]">
                  {formatDate(selectedMessage.updated_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

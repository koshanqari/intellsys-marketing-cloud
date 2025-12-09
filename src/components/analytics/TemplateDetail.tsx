'use client';

import { useEffect, useState, useMemo } from 'react';
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
  Search,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  MessageSquare,
  XCircle,
  Filter,
  ChevronDown,
  Check
} from 'lucide-react';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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

interface TemplateSummary {
  total_contacts: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  http_success: number;
  failed: number;
  pending: number;
}

interface TemplateData {
  templateName: string;
  summary: TemplateSummary;
  messages: TemplateMessage[];
  statusCodeMappings?: Record<string, string>;
  statusMappings?: Record<string, string>;
  statusColors?: Record<string, string>;
}

// Parse status mappings if it's a string
function parseStatusMappings(mappings: unknown): Record<string, string> {
  if (!mappings) return {};
  if (typeof mappings === 'string') {
    try {
      return JSON.parse(mappings);
    } catch {
      return {};
    }
  }
  if (typeof mappings === 'object') {
    return mappings as Record<string, string>;
  }
  return {};
}

// Normalize status using status mappings
function normalizeStatus(rawStatus: string | null, statusMappings?: unknown): { normalized: string; mainStatus: string } {
  if (!rawStatus) {
    return { normalized: 'Pending', mainStatus: 'PENDING' };
  }

  // Parse mappings if needed
  const mappings = parseStatusMappings(statusMappings);

  // If no mappings, return as-is
  if (Object.keys(mappings).length === 0) {
    // Default fallback - check common values
    const lowerStatus = rawStatus.toLowerCase();
    if (['sent', 'delivered', 'read', 'replied', 'failed'].includes(lowerStatus)) {
      return { 
        normalized: lowerStatus.charAt(0).toUpperCase() + lowerStatus.slice(1), 
        mainStatus: lowerStatus.toUpperCase() 
      };
    }
    return { normalized: rawStatus, mainStatus: rawStatus.toUpperCase() };
  }

  // Check each main status mapping to see if the raw status matches
  const mainStatuses = ['SENT', 'DELIVERED', 'READ', 'REPLIED', 'FAILED'];
  
  for (const mainStatus of mainStatuses) {
    const mappingValue = mappings[mainStatus];
    if (mappingValue && typeof mappingValue === 'string') {
      const mappedValues = mappingValue.split(',').map(v => v.trim()).filter(Boolean);
      // Check if raw status matches any of the mapped values (case-insensitive)
      if (mappedValues.some(v => v.toLowerCase() === rawStatus.toLowerCase() || v === rawStatus)) {
        return { 
          normalized: mainStatus.charAt(0) + mainStatus.slice(1).toLowerCase(), 
          mainStatus 
        };
      }
    }
  }

  // Default fallback - check common values
  const lowerStatus = rawStatus.toLowerCase();
  if (['sent', 'delivered', 'read', 'replied', 'failed'].includes(lowerStatus)) {
    return { 
      normalized: lowerStatus.charAt(0).toUpperCase() + lowerStatus.slice(1), 
      mainStatus: lowerStatus.toUpperCase() 
    };
  }

  return { normalized: rawStatus, mainStatus: rawStatus.toUpperCase() };
}

// Default status colors (fallback)
const DEFAULT_STATUS_COLORS: Record<string, string> = {
  SENT: '#3B82F6',      // Blue
  DELIVERED: '#10B981', // Green
  READ: '#6366F1',      // Indigo
  REPLIED: '#8B5CF6',   // Purple
  PENDING: '#F59E0B',   // Amber
  FAILED: '#EF4444',    // Red
};

function getStatusBadge(status: string | null, statusMappings?: unknown, statusColors?: Record<string, string>) {
  // Show the RAW database value, not normalized
  const displayText = status || 'Pending';
  
  // But use the mapped status to get the color
  const { mainStatus } = normalizeStatus(status, statusMappings);
  
  // Get color - direct lookup, skip CODE_ keys
  let color = DEFAULT_STATUS_COLORS[mainStatus] || '#6B7280';
  
  if (statusColors && mainStatus && !mainStatus.startsWith('CODE_')) {
    const foundColor = statusColors[mainStatus];
    if (foundColor) {
      color = String(foundColor);
    }
  }
  
  // Ensure # prefix
  if (!color.startsWith('#')) {
    color = '#' + color;
  }
  
  // Light background
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const bgColor = `rgba(${r}, ${g}, ${b}, 0.1)`;

  return (
    <span 
      style={{ 
        backgroundColor: bgColor, 
        color: color,
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center'
      }}
    >
      {displayText}
    </span>
  );
}

function isStatusCodeSuccess(statusCode: number | null, statusCodeMappings?: Record<string, string>): boolean {
  if (!statusCode) return false;
  
  // If no mappings, default to 200-299 range as success
  if (!statusCodeMappings || !statusCodeMappings.SUCCESS) {
    return statusCode >= 200 && statusCode < 300;
  }
  
  // Check if status code is in the SUCCESS mapping
  const successCodes = statusCodeMappings.SUCCESS.split(',').map(code => parseInt(code.trim()));
  return successCodes.includes(statusCode);
}

// Get status code category (SUCCESS, CLIENT_ERROR, SERVER_ERROR)
function getStatusCodeCategory(
  statusCode: number | null,
  statusCodeMappings?: Record<string, string>
): string | null {
  if (!statusCode) return null;
  
  if (!statusCodeMappings) {
    // Default categorization
    if (statusCode >= 200 && statusCode < 300) return 'SUCCESS';
    if (statusCode >= 400 && statusCode < 500) return 'CLIENT_ERROR';
    if (statusCode >= 500 && statusCode < 600) return 'SERVER_ERROR';
    return null;
  }
  
  // Check each category mapping
  const categories = ['SUCCESS', 'CLIENT_ERROR', 'SERVER_ERROR'];
  for (const category of categories) {
    const mapping = statusCodeMappings[category];
    if (mapping) {
      const codes = mapping.split(',').map(code => parseInt(code.trim())).filter(code => !isNaN(code));
      if (codes.includes(statusCode)) {
        return category;
      }
    }
  }
  
  // Fallback to default categorization
  if (statusCode >= 200 && statusCode < 300) return 'SUCCESS';
  if (statusCode >= 400 && statusCode < 500) return 'CLIENT_ERROR';
  if (statusCode >= 500 && statusCode < 600) return 'SERVER_ERROR';
  return null;
}

// Get status code badge with custom colors
function getStatusCodeBadge(
  statusCode: number | null,
  statusCodeMappings?: Record<string, string>,
  statusColors?: Record<string, string>
) {
  if (!statusCode) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-700)]">
        N/A
      </span>
    );
  }

  const category = getStatusCodeCategory(statusCode, statusCodeMappings);
  
  // Parse status colors if needed
  const colors = parseStatusMappings(statusColors);
  
  // Default colors
  const defaultCodeColors: Record<string, string> = {
    SUCCESS: '#10B981',      // Green
    CLIENT_ERROR: '#F59E0B', // Amber
    SERVER_ERROR: '#EF4444', // Red
  };
  
  // Get custom color or use default
  const colorKey = category ? `CODE_${category}` : null;
  const customColor = colorKey && colors[colorKey] 
    ? colors[colorKey] 
    : (category ? defaultCodeColors[category] : '#6B7280');
  
  // Generate lighter background color
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 107, g: 114, b: 128 };
  };
  
  const rgb = hexToRgb(customColor);
  const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;

  return (
    <span 
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: bgColor, 
        color: customColor 
      }}
    >
      {statusCode}
    </span>
  );
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


interface TemplateDetailProps {
  templateName: string;
  basePath: string;
  loginPath: string;
  clientsPath?: string;
}

const ITEMS_PER_PAGE = 10;

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
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  // Helper function to format date for input
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set default date range to last 30 days
  const getDefaultDateRange = () => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return {
      start: formatDateForInput(monthAgo),
      end: formatDateForInput(today),
    };
  };

  const defaultDates = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [selectedStatusCodes, setSelectedStatusCodes] = useState<Set<number>>(new Set());
  const [selectedStatusMessages, setSelectedStatusMessages] = useState<Set<string>>(new Set());
  const [selectedDeliveryStatuses, setSelectedDeliveryStatuses] = useState<Set<string>>(new Set());
  
  // Filter dropdown states
  const [showStatusCodeFilter, setShowStatusCodeFilter] = useState(false);
  const [showStatusMessageFilter, setShowStatusMessageFilter] = useState(false);
  const [showDeliveryStatusFilter, setShowDeliveryStatusFilter] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTemplateData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      // Build URL with date parameters
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api/analytics/template/${encodeURIComponent(templateName)}${params.toString() ? `?${params.toString()}` : ''}`;
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
    } catch (error) {
      console.error('Error fetching template data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (templateName) {
      fetchTemplateData();
    }
  }, [templateName, startDate, endDate]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown')) {
        setShowStatusCodeFilter(false);
        setShowStatusMessageFilter(false);
        setShowDeliveryStatusFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract unique values for filters
  const uniqueValues = useMemo(() => {
    if (!data) {
      return {
        statusCodes: [] as number[],
        statusMessages: [] as string[],
        deliveryStatuses: [] as string[],
      };
    }
    
    const statusCodes = new Set<number>();
    const statusMessages = new Set<string>();
    const deliveryStatuses = new Set<string>();
    
    data.messages.forEach(msg => {
      if (msg.status_code !== null) statusCodes.add(msg.status_code);
      if (msg.status_message) statusMessages.add(msg.status_message);
      if (msg.message_status) deliveryStatuses.add(msg.message_status);
    });
    
    return {
      statusCodes: Array.from(statusCodes).sort((a, b) => a - b),
      statusMessages: Array.from(statusMessages).sort(),
      deliveryStatuses: Array.from(deliveryStatuses).sort(),
    };
  }, [data]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    if (!data) return [];
    
    let filtered = data.messages;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg => 
        (msg.name?.toLowerCase().includes(query)) ||
        (msg.phone?.includes(query)) ||
        (msg.message_status?.toLowerCase().includes(query)) ||
        (msg.status_message?.toLowerCase().includes(query))
      );
    }
    
    // Status code filter
    if (selectedStatusCodes.size > 0) {
      filtered = filtered.filter(msg => 
        msg.status_code !== null && selectedStatusCodes.has(msg.status_code)
      );
    }
    
    // Status message filter
    if (selectedStatusMessages.size > 0) {
      filtered = filtered.filter(msg => 
        msg.status_message && selectedStatusMessages.has(msg.status_message)
      );
    }
    
    // Delivery status filter
    if (selectedDeliveryStatuses.size > 0) {
      filtered = filtered.filter(msg => 
        msg.message_status && selectedDeliveryStatuses.has(msg.message_status)
      );
    }
    
    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(msg => new Date(msg.created_at) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(msg => new Date(msg.created_at) <= end);
    }
    
    return filtered;
  }, [data, searchQuery, startDate, endDate, selectedStatusCodes, selectedStatusMessages, selectedDeliveryStatuses]);

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMessages.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, selectedStatusCodes, selectedStatusMessages, selectedDeliveryStatuses]);

  const handleBack = () => {
    router.push(`${basePath}/analytics`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    // Don't clear date range - it should stay as is
    setSelectedStatusCodes(new Set());
    setSelectedStatusMessages(new Set());
    setSelectedDeliveryStatuses(new Set());
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || startDate || endDate || selectedStatusCodes.size > 0 || selectedStatusMessages.size > 0 || selectedDeliveryStatuses.size > 0;

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredMessages.length) return;

    const headers = [
      'Name',
      'Phone',
      'Status Code',
      'Status Message',
      'Delivery Status',
      'Details',
      'Created At',
      'Updated At'
    ];

    const rows = filteredMessages.map(msg => [
      msg.name || 'Unknown',
      msg.phone || 'N/A',
      msg.status_code?.toString() || 'N/A',
      msg.status_message || 'N/A',
      msg.message_status || 'Pending',
      msg.message_status_detailed || '-',
      formatDate(msg.created_at),
      formatDate(msg.updated_at)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${templateName}_messages_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick date range presets
  const setDatePreset = (preset: 'today' | 'week' | 'month' | 'all') => {
    const today = new Date();
    
    switch (preset) {
      case 'today':
        setStartDate(formatDateForInput(today));
        setEndDate(formatDateForInput(today));
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(formatDateForInput(weekAgo));
        setEndDate(formatDateForInput(today));
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        setStartDate(formatDateForInput(monthAgo));
        setEndDate(formatDateForInput(today));
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  // Check which preset is currently active
  const getActivePreset = (): 'today' | 'week' | 'month' | 'all' | null => {
    if (!startDate || !endDate) return 'all';
    
    const today = new Date();
    const todayStr = formatDateForInput(today);
    
    // Check if it's "today"
    if (startDate === todayStr && endDate === todayStr) {
      return 'today';
    }
    
    // Check if it's "last 7 days"
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = formatDateForInput(weekAgo);
    if (startDate === weekAgoStr && endDate === todayStr) {
      return 'week';
    }
    
    // Check if it's "last 30 days"
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = formatDateForInput(monthAgo);
    if (startDate === monthAgoStr && endDate === todayStr) {
      return 'month';
    }
    
    return null;
  };

  const activePreset = getActivePreset();

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

  const { summary, statusCodeMappings, statusMappings, statusColors = {} } = data;

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

      {/* Date Filter - At the top */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Date Range */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-medium text-[var(--neutral-700)] whitespace-nowrap">Date Range:</span>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neutral-400)]" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-[var(--neutral-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-white"
                  placeholder="Start date"
                />
              </div>
              <span className="text-[var(--neutral-400)]">to</span>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neutral-400)]" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-[var(--neutral-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-white"
                  placeholder="End date"
                />
              </div>
            </div>
            
            {/* Quick Date Presets */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={activePreset === 'today' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDatePreset('today')}
              >
                Today
              </Button>
              <Button
                type="button"
                variant={activePreset === 'week' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDatePreset('week')}
              >
                Last 7 Days
              </Button>
              <Button
                type="button"
                variant={activePreset === 'month' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDatePreset('month')}
              >
                Last 30 Days
              </Button>
              <Button
                type="button"
                variant={activePreset === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                All Time
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="space-y-4 mb-8">
        {/* Row 1: Sent, Delivered, Read, Replied */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Sent"
            value={summary.sent}
            icon={<Send className="w-5 h-5" />}
            variant="default"
            customColor={statusColors && statusColors['SENT'] ? String(statusColors['SENT']) : undefined}
          />
          <StatCard
            title="Delivered"
            value={summary.delivered}
            icon={<CheckCircle2 className="w-5 h-5" />}
            variant="success"
            customColor={statusColors && statusColors['DELIVERED'] ? String(statusColors['DELIVERED']) : undefined}
          />
          <StatCard
            title="Read"
            value={summary.read}
            icon={<Eye className="w-5 h-5" />}
            variant="default"
            customColor={statusColors && statusColors['READ'] ? String(statusColors['READ']) : undefined}
          />
          <StatCard
            title="Replied"
            value={summary.replied}
            icon={<MessageSquare className="w-5 h-5" />}
            variant="default"
            customColor={statusColors && statusColors['REPLIED'] ? String(statusColors['REPLIED']) : undefined}
          />
        </div>
        
        {/* Row 2: Total Contacts, HTTP Success, Failed, Pending */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Contacts"
            value={summary.total_contacts}
            icon={<Users className="w-5 h-5" />}
            variant="default"
          />
          <StatCard
            title="HTTP Success"
            value={summary.http_success}
            icon={<CheckCircle2 className="w-5 h-5" />}
            variant="success"
            customColor={statusColors && statusColors['CODE_SUCCESS'] ? String(statusColors['CODE_SUCCESS']) : undefined}
          />
          <StatCard
            title="Failed"
            value={summary.failed}
            icon={<XCircle className="w-5 h-5" />}
            variant="error"
            customColor={statusColors && statusColors['FAILED'] ? String(statusColors['FAILED']) : undefined}
          />
          <StatCard
            title="Pending"
            value={summary.pending}
            icon={<Clock className="w-5 h-5" />}
            variant="warning"
            customColor={statusColors && statusColors['PENDING'] ? String(statusColors['PENDING']) : undefined}
          />
        </div>
      </div>

      {/* Filters & Actions */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          {/* First Row: Search and Export */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--neutral-400)]" />
              <Input
                type="text"
                placeholder="Search by name, phone, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Export */}
            <Button 
              variant="secondary"
              onClick={exportToCSV}
              disabled={filteredMessages.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Second Row: Status Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--neutral-200)]">
            <span className="text-sm font-medium text-[var(--neutral-700)] flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters:
            </span>
            
            {/* Status Code Filter */}
            <div className="relative filter-dropdown">
              <button
                type="button"
                onClick={() => {
                  setShowStatusCodeFilter(!showStatusCodeFilter);
                  setShowStatusMessageFilter(false);
                  setShowDeliveryStatusFilter(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  selectedStatusCodes.size > 0
                    ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:bg-[var(--neutral-50)]'
                }`}
              >
                Status Code
                {selectedStatusCodes.size > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-white text-xs">
                    {selectedStatusCodes.size}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showStatusCodeFilter ? 'rotate-180' : ''}`} />
              </button>
              
              {showStatusCodeFilter && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto filter-dropdown">
                  <div className="p-2">
                    {uniqueValues.statusCodes.length === 0 ? (
                      <p className="text-sm text-[var(--neutral-500)] p-2">No status codes available</p>
                    ) : (
                      uniqueValues.statusCodes.map((code) => (
                        <label
                          key={code}
                          className="flex items-center gap-2 p-2 rounded hover:bg-[var(--neutral-50)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStatusCodes.has(code)}
                            onChange={(e) => {
                              const newSet = new Set(selectedStatusCodes);
                              if (e.target.checked) {
                                newSet.add(code);
                              } else {
                                newSet.delete(code);
                              }
                              setSelectedStatusCodes(newSet);
                            }}
                            className="w-4 h-4 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <span className="text-sm text-[var(--neutral-700)]">{code}</span>
                        </label>
                      ))
                    )}
                    {selectedStatusCodes.size > 0 && (
                      <button
                        onClick={() => setSelectedStatusCodes(new Set())}
                        className="w-full mt-2 px-3 py-1.5 text-xs text-[var(--error)] hover:bg-[var(--error-light)] rounded transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status Message Filter */}
            <div className="relative filter-dropdown">
              <button
                type="button"
                onClick={() => {
                  setShowStatusMessageFilter(!showStatusMessageFilter);
                  setShowStatusCodeFilter(false);
                  setShowDeliveryStatusFilter(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  selectedStatusMessages.size > 0
                    ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:bg-[var(--neutral-50)]'
                }`}
              >
                Status Message
                {selectedStatusMessages.size > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-white text-xs">
                    {selectedStatusMessages.size}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showStatusMessageFilter ? 'rotate-180' : ''}`} />
              </button>
              
              {showStatusMessageFilter && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto filter-dropdown">
                  <div className="p-2">
                    {uniqueValues.statusMessages.length === 0 ? (
                      <p className="text-sm text-[var(--neutral-500)] p-2">No status messages available</p>
                    ) : (
                      uniqueValues.statusMessages.map((msg) => (
                        <label
                          key={msg}
                          className="flex items-center gap-2 p-2 rounded hover:bg-[var(--neutral-50)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStatusMessages.has(msg)}
                            onChange={(e) => {
                              const newSet = new Set(selectedStatusMessages);
                              if (e.target.checked) {
                                newSet.add(msg);
                              } else {
                                newSet.delete(msg);
                              }
                              setSelectedStatusMessages(newSet);
                            }}
                            className="w-4 h-4 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <span className="text-sm text-[var(--neutral-700)] truncate" title={msg}>{msg}</span>
                        </label>
                      ))
                    )}
                    {selectedStatusMessages.size > 0 && (
                      <button
                        onClick={() => setSelectedStatusMessages(new Set())}
                        className="w-full mt-2 px-3 py-1.5 text-xs text-[var(--error)] hover:bg-[var(--error-light)] rounded transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Status Filter */}
            <div className="relative filter-dropdown">
              <button
                type="button"
                onClick={() => {
                  setShowDeliveryStatusFilter(!showDeliveryStatusFilter);
                  setShowStatusCodeFilter(false);
                  setShowStatusMessageFilter(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  selectedDeliveryStatuses.size > 0
                    ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:bg-[var(--neutral-50)]'
                }`}
              >
                Delivery Status
                {selectedDeliveryStatuses.size > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-white text-xs">
                    {selectedDeliveryStatuses.size}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showDeliveryStatusFilter ? 'rotate-180' : ''}`} />
              </button>
              
              {showDeliveryStatusFilter && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto filter-dropdown">
                  <div className="p-2">
                    {uniqueValues.deliveryStatuses.length === 0 ? (
                      <p className="text-sm text-[var(--neutral-500)] p-2">No delivery statuses available</p>
                    ) : (
                      uniqueValues.deliveryStatuses.map((status) => (
                        <label
                          key={status}
                          className="flex items-center gap-2 p-2 rounded hover:bg-[var(--neutral-50)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDeliveryStatuses.has(status)}
                            onChange={(e) => {
                              const newSet = new Set(selectedDeliveryStatuses);
                              if (e.target.checked) {
                                newSet.add(status);
                              } else {
                                newSet.delete(status);
                              }
                              setSelectedDeliveryStatuses(newSet);
                            }}
                            className="w-4 h-4 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <span className="text-sm text-[var(--neutral-700)]">{status}</span>
                        </label>
                      ))
                    )}
                    {selectedDeliveryStatuses.size > 0 && (
                      <button
                        onClick={() => setSelectedDeliveryStatuses(new Set())}
                        className="w-full mt-2 px-3 py-1.5 text-xs text-[var(--error)] hover:bg-[var(--error-light)] rounded transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Clear Filters Button - in same row */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--error)] hover:bg-[var(--error-light)] transition-colors"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Messages Table */}
      <Card padding="none">
        <div className="p-6 border-b border-[var(--neutral-200)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--neutral-900)]">
            Message Recipients
          </h3>
          <span className="text-sm text-[var(--neutral-600)]">
            {filteredMessages.length === data.messages.length 
              ? `${data.messages.length} total` 
              : `${filteredMessages.length} of ${data.messages.length} filtered`
            }
          </span>
        </div>
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
                <tr key={message.id} className="hover:bg-[var(--neutral-50)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--neutral-900)]">
                        <User className="w-4 h-4 text-[var(--neutral-400)]" />
                        {message.name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--neutral-600)] mt-1">
                        <Phone className="w-4 h-4 text-[var(--neutral-400)]" />
                        {message.phone || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusCodeBadge(message.status_code, statusCodeMappings, statusColors)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--neutral-700)]">
                    {message.status_message || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(message.message_status, statusMappings, statusColors)}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--neutral-600)] max-w-xs truncate">
                    {message.message_status_detailed || '-'}
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
        {filteredMessages.length === 0 && (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-[var(--neutral-400)] mb-4" />
            <p className="text-[var(--neutral-600)]">
              {hasActiveFilters 
                ? 'No messages match your filters' 
                : 'No messages found for this template'
              }
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
          <div className="p-4 border-t border-[var(--neutral-200)] flex items-center justify-between">
            <p className="text-sm text-[var(--neutral-600)]">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredMessages.length)} of {filteredMessages.length} messages
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-[var(--neutral-200)] hover:bg-[var(--neutral-100)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
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
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
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
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-[var(--neutral-200)] hover:bg-[var(--neutral-100)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

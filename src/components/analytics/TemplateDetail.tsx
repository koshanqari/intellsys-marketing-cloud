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
  X
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
  total: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
}

interface TemplateData {
  templateName: string;
  summary: TemplateSummary;
  messages: TemplateMessage[];
}

function getStatusBadge(status: string | null) {
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    delivered: { bg: 'bg-[var(--success-light)]', text: 'text-[var(--success)]', label: 'Delivered' },
    read: { bg: 'bg-[var(--primary-light)]', text: 'text-[var(--primary)]', label: 'Read' },
    failed: { bg: 'bg-[var(--error-light)]', text: 'text-[var(--error)]', label: 'Failed' },
    button: { bg: 'bg-[var(--neutral-100)]', text: 'text-[var(--neutral-700)]', label: 'Button Click' },
    text: { bg: 'bg-[var(--neutral-100)]', text: 'text-[var(--neutral-700)]', label: 'Text Reply' },
  };

  const defaultStatus = { bg: 'bg-[var(--warning-light)]', text: 'text-[var(--warning)]', label: 'Pending' };
  const statusStyle = status ? statusMap[status] || defaultStatus : defaultStatus;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
      {statusStyle.label}
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

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTemplateData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const response = await fetch(`/api/analytics/template/${encodeURIComponent(templateName)}`);
      
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
  }, [templateName]);

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
  }, [data, searchQuery, startDate, endDate]);

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMessages.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate]);

  const handleBack = () => {
    router.push(`${basePath}/analytics`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || startDate || endDate;

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

  const { summary } = data;
  const deliveryRate = summary.total > 0 ? Math.round((summary.delivered / summary.total) * 100) : 0;
  const readRate = summary.total > 0 ? Math.round((summary.read / summary.total) * 100) : 0;

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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Total Sent"
          value={summary.total}
          icon={<Send className="w-5 h-5" />}
        />
        <StatCard
          title="Delivered"
          value={summary.delivered}
          subtitle={`${deliveryRate}%`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          title="Read"
          value={summary.read}
          subtitle={`${readRate}%`}
          icon={<Eye className="w-5 h-5" />}
          variant="default"
        />
        <StatCard
          title="Pending"
          value={summary.pending}
          icon={<Clock className="w-5 h-5" />}
          variant="warning"
        />
        <StatCard
          title="Failed"
          value={summary.failed}
          icon={<AlertCircle className="w-5 h-5" />}
          variant="error"
        />
      </div>

      {/* Filters & Actions */}
      <Card className="mb-6">
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
          
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neutral-400)]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 pr-3 py-2.5 border border-[var(--neutral-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-white"
                placeholder="Start date"
              />
            </div>
            <span className="text-[var(--neutral-400)]">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neutral-400)]" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 pr-3 py-2.5 border border-[var(--neutral-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-white"
                placeholder="End date"
              />
            </div>
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
        
        {/* Quick Date Presets */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--neutral-200)]">
          <span className="text-sm text-[var(--neutral-600)] mr-2">Quick filters:</span>
          <button
            onClick={() => setDatePreset('today')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--neutral-100)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setDatePreset('week')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--neutral-100)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] transition-colors"
          >
            Last 7 days
          </button>
          <button
            onClick={() => setDatePreset('month')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--neutral-100)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] transition-colors"
          >
            Last 30 days
          </button>
          <button
            onClick={() => setDatePreset('all')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--neutral-100)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] transition-colors"
          >
            All time
          </button>
          
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
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      message.status_code === 200 
                        ? 'bg-[var(--success-light)] text-[var(--success)]' 
                        : 'bg-[var(--error-light)] text-[var(--error)]'
                    }`}>
                      {message.status_code || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--neutral-700)]">
                    {message.status_message || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(message.message_status)}
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

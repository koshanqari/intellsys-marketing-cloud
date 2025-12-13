'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  X,
  Send,
  CheckCircle2,
  Eye,
  AlertCircle,
  MessageSquare,
  Clock,
  Mail,
  Phone,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Activity,
  Circle,
  ChevronDown,
  Pencil,
  Calculator,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { MetricConfig } from '@/lib/types';

// Available icons for selection
const AVAILABLE_ICONS = [
  { name: 'Send', icon: Send },
  { name: 'CheckCircle2', icon: CheckCircle2 },
  { name: 'Eye', icon: Eye },
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'MessageSquare', icon: MessageSquare },
  { name: 'Clock', icon: Clock },
  { name: 'Mail', icon: Mail },
  { name: 'Phone', icon: Phone },
  { name: 'RefreshCw', icon: RefreshCw },
  { name: 'BarChart3', icon: BarChart3 },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'Activity', icon: Activity },
  { name: 'Circle', icon: Circle },
];

// Preset colors
const PRESET_COLORS = [
  '#0052CC', // Primary
  '#0D7C3D', // Success/Green
  '#C41E3A', // Error/Red
  '#B8860B', // Warning/Amber
  '#6B7280', // Neutral Gray
  '#7C3AED', // Purple
  '#059669', // Teal
  '#DC2626', // Bright Red
  '#2563EB', // Bright Blue
  '#EA580C', // Orange
];

// Map column options - all columns from message_logs that can be filtered
// Using exact column names from the table
const MAP_COLUMNS = [
  { value: 'message_status', label: 'message_status', hint: 'Values: null (sent), delivered, read, button, text' },
  { value: 'status_code', label: 'status_code', hint: 'HTTP codes like 200, 400, 500' },
  { value: 'status_message', label: 'status_message', hint: 'Status message text to match' },
  { value: 'message_status_detailed', label: 'message_status_detailed', hint: 'Detailed status from webhook' },
  { value: 'template_name', label: 'template_name', hint: 'Filter by specific template names' },
  { value: 'name', label: 'name', hint: 'Filter by contact name' },
  { value: 'phone', label: 'phone', hint: 'Filter by phone number' },
  { value: 'message_id', label: 'message_id', hint: 'Filter by message ID' },
];

type MapToColumn = 'message_status' | 'status_code' | 'status_message' | 'message_status_detailed' | 'template_name' | 'name' | 'phone' | 'message_id';

interface MetricFormData {
  name: string;
  icon: string;
  color: string;
  map_to_column: MapToColumn | null;
  keywords: string;
  is_active: boolean;
  is_calculated: boolean;
  formula: string;
  prefix: string;
  unit: string;
}

const defaultFormData: MetricFormData = {
  name: '',
  icon: 'Circle',
  color: '#0052CC',
  map_to_column: 'message_status',
  keywords: '',
  is_active: true,
  is_calculated: false,
  formula: '',
  prefix: '',
  unit: '',
};

function getIconComponent(iconName: string) {
  const iconData = AVAILABLE_ICONS.find(i => i.name === iconName);
  return iconData?.icon || Circle;
}

export default function MetricsConfigPanel() {
  const [metrics, setMetrics] = useState<MetricConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MetricConfig | null>(null);
  const [formData, setFormData] = useState<MetricFormData>(defaultFormData);
  const [formError, setFormError] = useState('');
  
  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Icon picker state
  const [showIconPicker, setShowIconPicker] = useState(false);

  const [tableNotFound, setTableNotFound] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      
      // Handle both array response and object with tableNotFound
      if (Array.isArray(data)) {
        setMetrics(data);
        setTableNotFound(false);
      } else if (data.tableNotFound) {
        setMetrics([]);
        setTableNotFound(true);
        setError('Metrics table not found. Please run the migration first.');
      } else if (data.metrics) {
        setMetrics(data.metrics);
        setTableNotFound(false);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newMetrics = [...metrics];
    const [draggedItem] = newMetrics.splice(draggedIndex, 1);
    newMetrics.splice(dropIndex, 0, draggedItem);

    // Update sort_order for all items
    const updatedMetrics = newMetrics.map((metric, index) => ({
      ...metric,
      sort_order: index,
    }));

    setMetrics(updatedMetrics);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save new order to backend
    try {
      setSaving(true);
      const response = await fetch('/api/metrics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: updatedMetrics.map(m => ({ id: m.id, sort_order: m.sort_order })),
        }),
      });

      if (!response.ok) throw new Error('Failed to save order');
    } catch (err) {
      console.error('Error saving order:', err);
      setError('Failed to save metric order');
      fetchMetrics(); // Refresh to get correct order
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const openAddModal = () => {
    setEditingMetric(null);
    setFormData(defaultFormData);
    setFormError('');
    setShowModal(true);
  };

  const openCalcModal = () => {
    setEditingMetric(null);
    setFormData({
      ...defaultFormData,
      is_calculated: true,
      map_to_column: null,
      keywords: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (metric: MetricConfig) => {
    setEditingMetric(metric);
    setFormData({
      name: metric.name,
      icon: metric.icon,
      color: metric.color,
      map_to_column: metric.map_to_column,
      keywords: metric.keywords?.join(',') || '',
      is_active: metric.is_active,
      is_calculated: metric.is_calculated || false,
      formula: metric.formula || '',
      prefix: metric.prefix || '',
      unit: metric.unit || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validate
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    if (formData.is_calculated) {
      // Validate calculated metric
      if (!formData.formula.trim()) {
        setFormError('Formula is required');
        return;
      }
    } else {
      // Validate regular metric
      if (!formData.keywords.trim()) {
        setFormError('At least one keyword is required');
        return;
      }

      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.toLowerCase())
        .filter(k => k.length > 0);

      if (keywordsArray.length === 0) {
        setFormError('At least one keyword is required');
        return;
      }
    }

    try {
      setSaving(true);
      const url = editingMetric ? `/api/metrics/${editingMetric.id}` : '/api/metrics';
      const method = editingMetric ? 'PATCH' : 'POST';

      const keywordsArray = formData.is_calculated ? null : formData.keywords
        .split(',')
        .map(k => k.toLowerCase())
        .filter(k => k.length > 0);

      const body: Record<string, unknown> = {
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color,
        is_active: formData.is_active,
        is_calculated: formData.is_calculated,
      };

      if (formData.is_calculated) {
        body.formula = formData.formula.trim();
        body.prefix = formData.prefix.trim() || null;
        body.unit = formData.unit.trim() || null;
        body.map_to_column = null;
        body.keywords = null;
      } else {
        body.map_to_column = formData.map_to_column;
        body.keywords = keywordsArray;
        body.prefix = null;
        body.unit = null;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save metric');
      }

      await fetchMetrics();
      setShowModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save metric');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (metricId: string) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/metrics/${metricId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete metric');
      
      setMetrics(metrics.filter(m => m.id !== metricId));
    } catch (err) {
      console.error('Error deleting metric:', err);
      setError('Failed to delete metric');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (metric: MetricConfig) => {
    try {
      const response = await fetch(`/api/metrics/${metric.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !metric.is_active }),
      });

      if (!response.ok) throw new Error('Failed to update metric');
      
      setMetrics(metrics.map(m => 
        m.id === metric.id ? { ...m, is_active: !m.is_active } : m
      ));
    } catch (err) {
      console.error('Error toggling metric:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[var(--neutral-200)] rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-[var(--neutral-200)] rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-[var(--neutral-200)]">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[var(--primary)]" />
            <div>
              <h3 className="text-lg font-semibold text-[var(--neutral-900)]">Metrics Configuration</h3>
              <p className="text-sm text-[var(--neutral-500)]">
                Configure metrics that appear on your dashboard. Drag to reorder.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Metric
            </Button>
            <Button size="sm" variant="secondary" onClick={openCalcModal}>
              <Calculator className="w-4 h-4 mr-2" />
              Calc Metric
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--error-light)] text-[var(--error)] text-sm">
            {error}
          </div>
        )}

        <div className="mt-4">
          {tableNotFound ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-[var(--warning)] mb-4" />
              <p className="text-[var(--neutral-900)] font-medium">Migration Required</p>
              <p className="text-sm text-[var(--neutral-600)] mt-2 max-w-md mx-auto">
                The metrics table has not been created yet. Please run the migration file:
              </p>
              <code className="block mt-3 p-3 bg-[var(--neutral-100)] rounded-lg text-sm text-[var(--neutral-700)] font-mono">
                migrations/create_client_metrics_table.sql
              </code>
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 mx-auto text-[var(--neutral-400)] mb-4" />
              <p className="text-[var(--neutral-600)]">No metrics configured yet</p>
              <p className="text-sm text-[var(--neutral-400)] mt-1">
                Add metrics to customize your analytics dashboard
              </p>
              <Button className="mt-4" onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Metric
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-[40px_1fr_120px_150px_1fr_80px] gap-4 px-4 py-2 text-xs font-medium text-[var(--neutral-600)] uppercase tracking-wider">
                <div></div>
                <div>Name</div>
                <div>Icon</div>
                <div>Map to Column</div>
                <div>Keywords</div>
                <div className="text-right">Actions</div>
              </div>
              
              {/* Metric rows */}
              {metrics.map((metric, index) => {
                const IconComponent = getIconComponent(metric.icon);
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={metric.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      grid grid-cols-[40px_1fr_120px_150px_1fr_80px] gap-4 items-center px-4 py-3 rounded-lg border transition-all
                      ${isDragging ? 'opacity-50 border-[var(--primary)] bg-[var(--primary-light)]' : ''}
                      ${isDragOver ? 'border-[var(--primary)] border-dashed bg-[var(--primary-light)]' : 'border-[var(--neutral-200)]'}
                      ${!metric.is_active ? 'opacity-60 bg-[var(--neutral-50)]' : 'bg-white'}
                      hover:border-[var(--neutral-300)] cursor-grab active:cursor-grabbing
                    `}
                  >
                    {/* Drag handle */}
                    <div className="flex items-center justify-center">
                      <GripVertical className="w-5 h-5 text-[var(--neutral-400)]" />
                    </div>

                    {/* Name */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="p-1.5 rounded-lg"
                        style={{ backgroundColor: `${metric.color}20` }}
                      >
                        <IconComponent className="w-4 h-4" style={{ color: metric.color }} />
                      </div>
                      <span className="font-medium text-[var(--neutral-900)]">{metric.name}</span>
                      {metric.is_calculated && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--primary-light)] text-[var(--primary)]">
                          Calc
                        </span>
                      )}
                      {!metric.is_active && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--neutral-200)] text-[var(--neutral-600)]">
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Icon */}
                    <div className="text-sm text-[var(--neutral-600)]">
                      {metric.icon}
                    </div>

                    {/* Map to Column or Formula */}
                    <div className="text-sm text-[var(--neutral-600)]">
                      {metric.is_calculated ? (
                        <span className="italic text-[var(--primary)]">Formula</span>
                      ) : (
                        MAP_COLUMNS.find(c => c.value === metric.map_to_column)?.label || metric.map_to_column || '-'
                      )}
                    </div>

                    {/* Keywords or Formula Value */}
                    <div className="flex flex-wrap gap-1">
                      {metric.is_calculated ? (
                        <code className="text-xs px-2 py-0.5 rounded bg-[var(--primary-light)] text-[var(--primary)] font-mono">
                          {metric.formula || '-'}
                        </code>
                      ) : (
                        <>
                          {metric.keywords?.slice(0, 3).map((keyword, i) => (
                            <span 
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full bg-[var(--neutral-100)] text-[var(--neutral-700)]"
                            >
                              {keyword}
                            </span>
                          ))}
                          {metric.keywords && metric.keywords.length > 3 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--neutral-100)] text-[var(--neutral-500)]">
                              +{metric.keywords.length - 3} more
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(metric)}
                        className="p-1.5 rounded-lg hover:bg-[var(--primary-light)] transition-colors"
                        title="Edit metric"
                      >
                        <Pencil className="w-4 h-4 text-[var(--primary)]" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(metric)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          metric.is_active ? 'hover:bg-[var(--warning-light)]' : 'hover:bg-[var(--success-light)]'
                        }`}
                        title={metric.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {metric.is_active ? (
                          <Eye className="w-4 h-4 text-[var(--warning)]" />
                        ) : (
                          <Eye className="w-4 h-4 text-[var(--success)]" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(metric.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--error-light)] transition-colors"
                        title="Delete metric"
                      >
                        <Trash2 className="w-4 h-4 text-[var(--error)]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {saving && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--neutral-600)]">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Saving...
          </div>
        )}
      </Card>

      {/* Add/Edit Metric Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMetric ? 'Edit Metric' : formData.is_calculated ? 'Add Calc Metric' : 'Add Metric'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <Input
            id="metric-name"
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Sent, Delivered, Read"
            required
          />

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
              Icon
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-full flex items-center justify-between px-4 py-2.5 border border-[var(--neutral-200)] rounded-lg bg-white hover:border-[var(--neutral-300)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const IconComp = getIconComponent(formData.icon);
                    return <IconComp className="w-5 h-5" style={{ color: formData.color }} />;
                  })()}
                  <span className="text-[var(--neutral-900)]">{formData.icon}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--neutral-400)]" />
              </button>
              
              {showIconPicker && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {AVAILABLE_ICONS.map(({ name, icon: IconComponent }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, icon: name });
                          setShowIconPicker(false);
                        }}
                        className={`p-2 rounded-lg border transition-colors ${
                          formData.icon === name
                            ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                            : 'border-transparent hover:bg-[var(--neutral-100)]'
                        }`}
                        title={name}
                      >
                        <IconComponent className="w-5 h-5 mx-auto" style={{ color: formData.color }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
              Color
            </label>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      formData.color === color
                        ? 'border-[var(--neutral-900)] scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
                title="Custom color"
              />
            </div>
          </div>

          {/* Formula for Calculated Metrics */}
          {formData.is_calculated ? (
            <div>
              <label className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                Formula
              </label>
              <Input
                id="metric-formula"
                type="text"
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                placeholder="e.g., Math.round((delivered/sent)*100)"
                required
              />
              <p className="mt-1 text-xs text-[var(--neutral-500)]">
                JavaScript expression. Use metric names (spaces removed, lowercase). Supports Math functions (Math.round, Math.floor, Math.ceil, etc.). Example: Math.round((delivered/sent)*100)
              </p>
              {metrics.filter(m => !m.is_calculated).length > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-[var(--neutral-50)]">
                  <p className="text-xs font-medium text-[var(--neutral-700)] mb-1">Available Metrics:</p>
                  <div className="flex flex-wrap gap-1">
                    {metrics.filter(m => !m.is_calculated).map((m) => (
                      <code key={m.id} className="text-xs px-1.5 py-0.5 rounded bg-white text-[var(--primary)]">
                        {m.name.toLowerCase().replace(/\s+/g, '')}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Prefix and Unit for Calculated Metrics */}
          {formData.is_calculated && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                  Prefix (Optional)
                </label>
                <Input
                  id="metric-prefix"
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  placeholder="e.g., Rs, $, USD"
                />
                <p className="mt-1 text-xs text-[var(--neutral-500)]">
                  Text to display before the calculated value (e.g., &quot;Rs&quot; for currency, &quot;$&quot; for dollars)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                  Unit/Suffix (Optional)
                </label>
                <Input
                  id="metric-unit"
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., %, Rs, $, per message"
                />
                <p className="mt-1 text-xs text-[var(--neutral-500)]">
                  Text to display after the calculated value (e.g., &quot;%&quot; for percentages, &quot;Rs&quot; for currency)
                </p>
              </div>
            </>
          )}

          {!formData.is_calculated && (
            <>
              {/* Map to Column */}
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                  Map to Column
                </label>
                <select
                  value={formData.map_to_column || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    map_to_column: e.target.value as MapToColumn
                  })}
                  className="w-full px-4 py-2.5 border border-[var(--neutral-200)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  required
                >
                  {MAP_COLUMNS.map((col) => (
                    <option key={col.value} value={col.value}>
                      {col.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--neutral-500)]">
                  {MAP_COLUMNS.find(c => c.value === formData.map_to_column)?.hint}
                </p>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                  Maps on Keywords
                </label>
                <Input
                  id="metric-keywords"
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="e.g., sent, delivered, 200, $null, $not_null, $empty, *"
                  required
                />
                <p className="mt-1 text-xs text-[var(--neutral-500)]">
                  Comma-separated values. The metric will sum all matches.
                </p>
                
                {/* Information Block */}
                <div className="mt-3 p-3 rounded-lg bg-[var(--primary-light)] border border-[var(--primary)]">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[var(--primary)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[var(--primary)] mb-1.5">Special Keywords (work for all columns):</p>
                      <ul className="text-xs text-[var(--neutral-700)] space-y-1">
                        <li><code className="px-1.5 py-0.5 rounded bg-white text-[var(--primary)] font-mono">*</code> - Matches all values (counts all rows)</li>
                        <li><code className="px-1.5 py-0.5 rounded bg-white text-[var(--primary)] font-mono">$not_null</code> - Matches all non-null values</li>
                        <li><code className="px-1.5 py-0.5 rounded bg-white text-[var(--primary)] font-mono">$null</code> - Matches null values</li>
                        <li><code className="px-1.5 py-0.5 rounded bg-white text-[var(--primary)] font-mono">$empty</code> - Matches empty strings/values</li>
                        <li>Regular values (e.g., <code className="px-1.5 py-0.5 rounded bg-white text-[var(--primary)] font-mono">sent</code>, <code className="px-1.5 py-0.5 rounded bg-white text-[var(--primary)] font-mono">200</code>) - Match exactly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Active Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-[var(--neutral-300)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm text-[var(--neutral-700)]">Active (show on dashboard)</span>
          </label>

          {formError && (
            <div className="p-3 rounded-lg bg-[var(--error-light)] text-[var(--error)] text-sm">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              {editingMetric ? 'Save Changes' : 'Add Metric'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}




export interface MessageLog {
  id: string;
  client_id: string; // UUID referencing clients.id
  name: string | null;
  phone: string | null;
  template_name: string | null;
  status_code: number | null;
  status_message: string | null;
  message_id: string | null;
  message_status: string | null;
  message_status_detailed: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Client {
  id: string; // UUID - primary identifier
  name: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  logo_url: string | null;
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
  total_messages?: number;
}

export interface TemplateStats {
  template_name: string;
  total: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface DailyStats {
  date: string;
  total: number;
  delivered: number;
  read: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface AnalyticsSummary {
  total_messages: number;
  delivered: number;
  read: number;
  failed: number;
  delivery_rate: number;
  read_rate: number;
}

export interface ClientUserPermissions {
  journey_builder?: boolean;
  journey_builder_edit?: boolean;
  analytics: boolean;
  analytics_edit?: boolean;
  analytics_delete?: boolean;
  templates?: boolean;
  campaigns?: boolean;
  reports?: boolean;
  integrations?: boolean;
  settings?: boolean;
  client_settings?: boolean;
}

export interface ClientUser {
  id: string;
  client_id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: ClientUserPermissions;
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Metric Configuration Types
export type MetricMapColumn = 'message_status' | 'status_code' | 'status_message' | 'message_status_detailed' | 'template_name' | 'name' | 'phone' | 'message_id';

export interface MetricConfig {
  id: string;
  client_id: string;
  name: string;
  icon: string;
  color: string;
  map_to_column: MetricMapColumn | null;
  keywords: string[] | null;
  sort_order: number;
  is_active: boolean;
  is_calculated: boolean;
  formula: string | null;
  prefix: string | null;
  unit: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MetricConfigInput {
  name: string;
  icon: string;
  color: string;
  map_to_column?: MetricMapColumn | null;
  keywords?: string[] | null;
  sort_order?: number;
  is_active?: boolean;
  is_calculated?: boolean;
  formula?: string | null;
  prefix?: string | null;
  unit?: string | null;
}

export interface DynamicMetricStat {
  metric_id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
  percentage?: number;
  is_calculated?: boolean;
  prefix?: string | null;
  unit?: string | null;
}

// Journey Types
export interface Journey {
  id: string;
  name: string;
  description: string | null;
  nodes: unknown[];
  connections: unknown[];
  canvas_state: { zoom: number; panX: number; panY: number } | null;
  status: string;
  created_at: string;
  updated_at: string;
}

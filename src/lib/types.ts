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
  analytics: boolean;
  templates: boolean;
  settings: boolean;
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

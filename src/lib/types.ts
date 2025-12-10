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
  status_mappings: Record<string, string> | null; // Maps incoming status to normalized status (e.g., {"read": "READ", "Read": "READ"})
  status_code_mappings: Record<string, string> | null; // Maps status codes to categories (e.g., {"200,201,202": "SUCCESS"})
  status_colors: Record<string, string> | null; // Custom colors for delivery statuses (e.g., {"SENT": "#3B82F6"})
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
  total_contacts: number; // Total rows/API hits
  sent: number; // Sent + Delivered + Read + Replied
  delivered: number;
  read: number;
  replied: number;
  failed: number; // Those with failed status
  pending: number; // Those with no status
}

export interface ClientUserPermissions {
  journey_builder: boolean;
  journey_builder_edit: boolean; // If journey_builder is true, this controls edit vs view-only
  analytics: boolean;
  templates: boolean;
  campaigns: boolean;
  reports: boolean;
  integrations: boolean;
  settings: boolean;
  client_settings: boolean; // For Client Settings tab (Client ID, Users, Info, Channels)
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

// Journey Builder Types
export interface JourneyNodePosition {
  x: number;
  y: number;
}

export interface JourneyTextNode {
  id: string;
  type: 'text';
  position: JourneyNodePosition;
  data: {
    content: string;
  };
  outputs: string[];
}

export interface JourneyConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface JourneyCanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Journey {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  nodes: JourneyTextNode[];
  connections: JourneyConnection[];
  canvas_state: JourneyCanvasState | null;
  status: 'draft' | 'active' | 'archived';
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

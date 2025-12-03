# Intellsys Marketing Cloud - Product Requirements Document

## Overview
Intellsys Marketing Cloud (IMC) is an omni-channel communication platform that enables clients to send WhatsApp messages, SMS, and emails. The platform provides a centralized dashboard for managing campaigns, viewing analytics, and tracking message delivery.

---

## Phase 1 Scope
**Focus:** WhatsApp Template Analytics

### Core Features

#### 1. Authentication
- Super admin login with full platform access
- Client user login via dedicated portal
- Secure session management with role-based access 

#### 2. Client Manager
- View list of all onboarded clients
- Select and switch into any client account
- Client account impersonation for super admin

#### 3. Client Dashboard
After logging into a client account, the super admin will see:

**Sidebar Navigation:**
- Dashboard (future)
- Template Analytics ← *Current Focus*
- Templates (future)
- Campaigns (future)
- Settings (future)

#### 4. Template Analytics
Display analytics from the existing `message_logs` table:

**Key Metrics:**
- Total messages sent
- Delivery rate
- Read rate
- Failed messages
- Messages by template

**Visualizations:**
- Messages over time (line/bar chart)
- Template performance breakdown
- Delivery status distribution

**Filters:**
- Date range
- Template name
- Status (sent, delivered, read, failed)

---

## Data Model

### Schema: `app`

#### Table: `clients`
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Primary key (auto-generated) - use this in message_logs |
| `name` | text | NO | Company display name |
| `email` | text | YES | Contact email |
| `phone` | text | YES | Contact phone |
| `industry` | text | YES | Industry type |
| `logo_url` | text | YES | Client logo URL |
| `whatsapp_enabled` | boolean | NO | WhatsApp channel enabled |
| `sms_enabled` | boolean | NO | SMS channel enabled |
| `email_enabled` | boolean | NO | Email channel enabled |
| `status` | text | NO | Account status (active/inactive) |
| `created_at` | timestamptz | NO | Auto-generated on insert |
| `updated_at` | timestamptz | NO | Auto-updated via trigger |

#### Table: `message_logs`
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Primary key |
| `client_id` | uuid | NO | Foreign key to clients.id |
| `name` | text | YES | Recipient name |
| `phone` | text | YES | Phone number |
| `template_name` | text | YES | WhatsApp template used |
| `status_code` | integer | YES | HTTP status code (200 = success) |
| `status_message` | text | YES | HTTP status message |
| `message_id` | text | YES | WhatsApp message ID |
| `message_status` | text | YES | Delivery status (null, delivered, read, button, text) |
| `message_status_detailed` | text | YES | Detailed status info |
| `created_at` | timestamptz | NO | Record creation time |
| `updated_at` | timestamptz | NO | Last update time |

**Message Status Values:**
- `null` - Sent, awaiting delivery confirmation
- `delivered` - Message delivered to device
- `read` - Message read by recipient
- `button` - User clicked a button
- `text` - User replied with text

---

## Design System

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#0052CC` | Primary actions, active states |
| Primary Dark | `#003D99` | Hover states |
| Primary Light | `#E6F0FF` | Backgrounds, highlights |
| Neutral 900 | `#1A1A1A` | Primary text |
| Neutral 600 | `#666666` | Secondary text |
| Neutral 200 | `#E5E5E5` | Borders |
| Neutral 50 | `#FAFAFA` | Page background |
| White | `#FFFFFF` | Cards, surfaces |
| Success | `#0D7C3D` | Delivered, success states |
| Warning | `#B8860B` | Pending states |
| Error | `#C41E3A` | Failed, error states |

### Typography
- Font Family: System fonts stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- Clean, professional hierarchy

### Components
- Cards with subtle shadows
- Data tables with sorting/filtering
- Clean form inputs
- Icon-based navigation (no emojis)

---

## User Flow

```
Login
  ↓
Client Manager (list of clients)
  ↓
Select Client → Enter Client Dashboard
  ↓
Sidebar: Template Analytics
  ↓
View metrics, charts, and message data
```

---

## Tech Stack
- Frontend: Next.js / React
- Styling: Tailwind CSS
- Database: Existing `message_logs` table
- Charts: Recharts / Chart.js

---

## RBAC (Role-Based Access Control)

### User Types
1. **Super Admin** - Full platform access
   - Login: `/login`
   - Can manage all clients
   - Can create/manage client users
   - Access to all features

2. **Client Users** - Limited access based on permissions
   - Login: `/portal/login`
   - Access only their client's data
   - Permission-based feature access

### Permission System
| Permission | Feature Access |
|------------|----------------|
| `analytics` | Template Analytics - view message performance |
| `templates` | Templates (Coming Soon) |
| `settings` | Settings (Coming Soon) |

### Client User Management
- Create users from Client Settings
- Set email, password, and permissions
- Toggle user active/inactive status
- Copy portal login link to share with clients
- Client ID (UUID) visible for n8n integration

### Database: `client_users`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `client_id` | uuid | FK to clients |
| `email` | text | Login email (unique) |
| `password_hash` | text | Bcrypt hashed password |
| `name` | text | Display name |
| `role` | text | User role (viewer, etc) |
| `permissions` | jsonb | Feature permissions |
| `is_active` | boolean | Account active status |
| `last_login` | timestamptz | Last login time |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Updated timestamp |

---

## Future Phases
- **Phase 2:** Template Management, Campaign Builder
- **Phase 3:** SMS Integration
- **Phase 4:** Email Integration
- **Phase 5:** Advanced reporting, analytics exports

---

## Out of Scope (Phase 1)
- Sending messages from the platform
- Template creation/editing
- SMS and Email channels


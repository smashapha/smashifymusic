// Admin CRM & ERP Shared Types
export type HealthStatus = 'green' | 'amber' | 'red';

export interface ActivityLogRow {
  id: string;
  profile_id?: string;
  actor_type?: 'artist' | 'fan' | 'agent' | 'system' | 'admin';
  event: string;
  amount?: number | null;
  meta?: any;
  created_at: string;
}

export interface PeopleNoteRow {
  id: string;
  profile_id: string;
  body: string;
  created_by?: string;
  created_at: string;
}

export interface TicketRow {
  id: string;
  profile_id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high';
  source: 'whatsapp' | 'in_app' | 'email';
  created_at: string;
  resolved_at?: string | null;
  resolution_note?: string | null;
  user_name?: string;
  user_type?: string;
}

export interface CrmSegmentRow {
  id: string;
  name: string;
  definition: {
    base: 'all' | 'artists' | 'fans' | 'agents';
    conditions?: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
  };
  created_at: string;
}

export interface OpsChecklistRow {
  id: string;
  task: string;
  cadence?: string;
  last_run_at?: string | null;
  is_done?: boolean;
}

export type Client = {
  id: string;
  user_id?: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gnaf_pid?: string | null;
  address_source?: string | null;
  address_lat?: number | null;
  address_lng?: number | null;
  google_place_id?: string | null;
  preferred_contact_method?: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

export type JobStatus =
  | "new"
  | "booked"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "not_invoiced"
  | "invoice_sent"
  | "part_paid"
  | "paid"
  | "overdue";

export type JobClient = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type Job = {
  id: string;
  user_id?: string;
  client_id: string;
  quote_id?: string | null;
  title: string;
  description: string | null;
  job_type: string | null;
  appointment_start: string | null;
  appointment_end: string | null;
  status: JobStatus;
  labour_cost: number;
  material_cost: number;
  total_amount: number;
  amount_paid: number;
  amount_outstanding: number;
  payment_status: PaymentStatus;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;

  clients?: JobClient | null;
};

export type Payment = {
  id: string;
  user_id?: string;
  client_id: string;
  job_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
};

export type NotificationLog = {
  id: string;
  user_id?: string;
  client_id: string | null;
  job_id: string | null;
  notification_type: string;
  channel: string;
  recipient: string | null;
  message: string;
  sent_status: string;
  sent_at: string | null;
  created_at: string;
};
export type JobPhoto = {
  id: string;
  user_id?: string;
  job_id: string;
  photo_url: string;
  photo_path: string | null;
  photo_type: "before" | "after" | "receipt" | "damage" | "completion" | "other";
  file_name: string | null;
  notes: string | null;
  created_at: string;
};
export type AddressLookup = {
  id: number;
  gnaf_pid: string | null;
  full_address: string;
  street_address: string | null;
  locality_name: string | null;
  state: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
};
export type QuoteStatus =
  | "draft"
  | "sent"
  | "approved"
  | "declined"
  | "converted";

export type Quote = {
  id: string;
  public_token?: string | null;
  user_id?: string;
  client_id: string;
  title: string;
  description: string | null;
  job_type: string | null;
  estimated_labour_cost: number;
  estimated_material_cost: number;
  total_amount: number;
  status: QuoteStatus;
  valid_until: string | null;
  notes: string | null;
  converted_job_id: string | null;
  created_at: string;
  updated_at?: string;

  clients?: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
};
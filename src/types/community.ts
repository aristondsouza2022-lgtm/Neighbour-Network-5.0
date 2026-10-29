export type UserRole = 'developer' | 'admin' | 'committee' | 'resident' | 'security';
export type AdminTitle = 'Chairman' | 'Secretary' | 'Treasurer' | null;

export interface Apartment {
  id: string;
  name: string;
  location: string;
  max_houses: number;
  model_3d_url?: string | null;
  custom_model_spec?: {
    fileName: string;
    extractedFiles: string[];
    format: 'glb' | 'gltf' | 'obj' | 'procedural';
    uploadedAt: string;
    towerCount: number;
    floors: number;
    facadeStyle: 'champagne-glass' | 'obsidian-gold' | 'neo-brutalist-podium';
  };
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  apartment_id: string;
  flat_no: string;
  role: UserRole;
  admin_title: AdminTitle;
  is_verified: boolean;
  warnings_count: number;
  transferred_from_apartment_id?: string | null;
  created_at: string;
}

export interface SocialComment {
  id: string;
  author_id: string;
  author_name: string;
  author_role: UserRole;
  flat_no: string;
  apartment_name: string;
  content: string;
  created_at: string;
}

export interface SocialPost {
  id: string;
  author_id: string;
  apartment_id: string;
  content: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  video_duration_sec?: number;
  likes_count: number;
  liked_by: string[];
  comments: SocialComment[];
  created_at: string;
}

export interface MarketplaceItem {
  id: string;
  apartment_id: string;
  seller_id: string;
  title: string;
  description: string;
  category: 'Furniture' | 'Horology & Art' | 'Appliances' | 'Electronics' | 'Sports & Leisure';
  listing_type: 'sale' | 'rent' | 'both';
  sale_price?: number | null;
  rent_price_per_day?: number | null;
  status: 'available' | 'occupied' | 'purchased';
  image_url?: string | null;
  buyer_or_renter_id?: string | null;
  created_at: string;
}

export interface PollOption {
  id: string;
  label: string;
  votes: string[]; // profile IDs
}

export interface CommunityPoll {
  id: string;
  apartment_id: string;
  created_by: string;
  question: string;
  description: string;
  closes_at: string;
  options: PollOption[];
  created_at: string;
}

export interface SocialEvent {
  id: string;
  apartment_id: string;
  created_by: string;
  title: string;
  description: string;
  event_date: string;
  venue: string;
  dress_code: string;
  interested_ids: string[]; // profile IDs
  created_at: string;
}

export interface Announcement {
  id: string;
  apartment_id: string;
  created_by: string;
  title: string;
  content: string;
  priority: 'Standard' | 'Priority' | 'Executive Directive';
  meeting_at?: string | null;
  meeting_mom?: string | null;
  created_at: string;
}

export interface EmergencySOS {
  id: string;
  apartment_id: string;
  triggered_by: string;
  triggered_by_name: string;
  flat_no: string;
  emergency_type: 'Fire Emergency' | 'Medical Critical' | 'Security Breach' | 'Structural / Lift Entrapment';
  reason: string;
  is_active: boolean;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface ComplaintTicket {
  id: string;
  apartment_id: string;
  author_id: string;
  flat_no: string;
  category: 'Plumbing & Hydro' | 'Valet & Parking' | 'Acoustic / Noise' | 'Concierge & Neighbor Help' | 'Electrical & HVAC';
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  created_at: string;
}

export interface VisitorLog {
  id: string;
  apartment_id: string;
  resident_id: string;
  flat_no: string;
  visitor_name: string;
  visitor_type: 'guest' | 'delivery';
  company_or_relation?: string;
  expected_time: string;
  vehicle_no?: string | null;
  pass_code: string; // CHAR(6)
  status: 'pre_booked' | 'inside' | 'exited';
  entry_time?: string | null;
  exit_time?: string | null;
  duration_minutes?: number | null;
  created_at: string;
}

export interface MaintenanceBillRecord {
  id: string;
  apartment_id: string;
  profile_id: string;
  flat_no: string;
  member_name: string;
  billing_period: string;
  amount: number;
  status: 'paid' | 'pending';
  receipt_image_url?: string | null;
  receipt_file_name?: string | null;
  payment_method?: 'UPI / IMPS Screenshot' | 'NEFT / RTGS Receipt' | 'Cheque Deposit Slip' | null;
  transaction_ref?: string | null;
  paid_at?: string | null;
  updated_at: string;
}

export interface SocietyMemberMaintenanceEntry {
  profile: Profile;
  apartment_id: string;
  flat_no: string;
  member_name: string;
  billing_period: string;
  amount: number;
  status: 'paid' | 'pending';
  receipt_image_url: string | null;
  receipt_file_name: string | null;
  payment_method: MaintenanceBillRecord['payment_method'];
  transaction_ref: string | null;
  paid_at: string | null;
}


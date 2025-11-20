// features/landing/types.ts
// Types for the invitation and landing page system

export type UserType =
  | 'ai_prompt_engineer'
  | 'technical_lead'
  | 'product_manager'
  | 'business_executive'
  | 'research_scientist'
  | 'creative_professional'
  | 'consultant'
  | 'individual_hobbyist'
  | 'other';

export type InvitationRequestStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'invited' 
  | 'converted';

export type InvitationCodeStatus = 
  | 'active' 
  | 'used' 
  | 'expired' 
  | 'revoked';

// Step 1: Required fields
export interface InvitationRequestStep1 {
  full_name: string;
  company: string;
  email: string;
  use_case: string;
  user_type: UserType;
  user_type_other?: string;
}

// Step 2: Optional fields
export interface InvitationRequestStep2 {
  phone?: string;
  biggest_obstacle?: string;
  referral_source?: string;
  current_ai_systems?: string;
  recent_project?: string;
}

// Complete invitation request
export interface InvitationRequest extends InvitationRequestStep1, InvitationRequestStep2 {
  id: string;
  status: InvitationRequestStatus;
  step_completed: 1 | 2;
  notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// Invitation code
export interface InvitationCode {
  id: string;
  code: string;
  invitation_request_id?: string;
  status: InvitationCodeStatus;
  max_uses: number;
  current_uses: number;
  used_by_user_id?: string;
  used_at?: string;
  created_by?: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// User type options for the form
export const USER_TYPE_OPTIONS = [
  { value: 'ai_prompt_engineer', label: 'AI/Prompt Engineer' },
  { value: 'technical_lead', label: 'Technical Lead/Developer' },
  { value: 'product_manager', label: 'Product Manager/Designer' },
  { value: 'business_executive', label: 'Business Executive/Founder' },
  { value: 'research_scientist', label: 'Research Scientist/Academic' },
  { value: 'creative_professional', label: 'Creative Professional (Writer, Artist, Content Creator)' },
  { value: 'consultant', label: 'Consultant/Strategic Advisor' },
  { value: 'individual_hobbyist', label: 'Individual/Hobbyist' },
  { value: 'other', label: 'Other (please specify)' },
] as const;


// types/partnerInquiry.ts
//
// Types for the Partner Inquiry form (Promotions Hub).

export type BusinessType = 'charter' | 'gear_shop' | 'guide_service' | 'brand' | 'marina' | 'other';

export interface PartnerInquiry {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  businessType: BusinessType;
  areaCodes: string[];
  message: string;
}

export interface PartnerInquiryRow {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  business_type: string;
  area_codes: string[];
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: 'charter', label: 'Charter / Guide' },
  { value: 'gear_shop', label: 'Gear / Tackle Shop' },
  { value: 'guide_service', label: 'Guide Service' },
  { value: 'brand', label: 'Brand / Manufacturer' },
  { value: 'marina', label: 'Marina' },
  { value: 'other', label: 'Other' },
];

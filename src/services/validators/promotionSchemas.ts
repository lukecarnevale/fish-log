/**
 * Zod validation schemas for promotions and partner inquiries
 */

import { z } from 'zod';
import { validateEmail, validatePhone } from '../../utils/formValidation';
import { isValidUrl } from '../../utils/urlValidation';

/**
 * Schema for validating raw Supabase advertisement rows (snake_case fields)
 * Uses .passthrough() to allow unexpected fields without failing
 */
export const AdvertisementRowSchema = z
  .object({
    id: z.string().min(1, 'ID is required'),
    company_name: z.string().min(1, 'Company name required').max(200, 'Company name must be ≤200 chars'),
    promo_text: z.string().min(1, 'Promo text required').max(500, 'Promo text must be ≤500 chars'),
    promo_code: z.string().optional().nullable(),
    link_url: z
      .string()
      .optional()
      .nullable()
      .refine(
        (url) => !url || isValidUrl(url),
        'Link URL must be valid HTTP/HTTPS URL'
      ),
    image_url: z.string().optional().nullable().default(''),
    is_active: z.boolean().default(true),
    priority: z.coerce.number().int().min(0).max(999).default(0),
    placements: z.array(z.string()).default([]),
    location: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    click_count: z.coerce.number().int().min(0).default(0),
    impression_count: z.coerce.number().int().min(0).default(0),
    created_at: z.string(),
    updated_at: z.string(),
    category: z
      .enum(['promotion', 'charter', 'gear', 'service', 'experience'])
      .default('promotion'),
    area_codes: z.array(z.string()).default([]),
    description: z.string().optional().nullable(),
    contact_phone: z.string().optional().nullable(),
    contact_email: z.string().optional().nullable(),
    contact_website: z.string().optional().nullable(),
    featured: z.boolean().default(false),
    badge_text: z.string().optional().nullable(),
  })
  .passthrough();

/**
 * Schema for validating partner inquiry form submissions (camelCase fields)
 */
export const PartnerInquirySchema = z.object({
  businessName: z
    .string()
    .min(1, 'Business name required')
    .max(100, 'Business name must be ≤100 chars')
    .transform((val) => val.trim()),
  contactName: z
    .string()
    .min(1, 'Contact name required')
    .max(100, 'Contact name must be ≤100 chars')
    .transform((val) => val.trim()),
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.trim().toLowerCase())
    .refine(
      (email) => !validateEmail(email),
      'Invalid email address'
    ),
  phone: z
    .string()
    .optional()
    .refine(
      (phone) => !phone || !validatePhone(phone),
      'Invalid phone number'
    ),
  website: z
    .string()
    .optional()
    .refine(
      (url) => !url || isValidUrl(url),
      'Website must be valid HTTP/HTTPS URL'
    ),
  businessType: z.enum(['charter', 'gear_shop', 'guide_service', 'brand', 'marina', 'other']),
  areaCodes: z.array(z.string()).max(10, 'Maximum 10 area codes allowed').default([]),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be ≤2000 chars')
    .transform((val) => val.trim()),
});

export type AdvertisementRow = z.infer<typeof AdvertisementRowSchema>;
export type PartnerInquiry = z.infer<typeof PartnerInquirySchema>;

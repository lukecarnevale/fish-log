import { z } from 'zod';

// Base schemas with validation
export const CoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const AnglerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export const FishReportSchema = z.object({
  id: z.string().uuid().optional(),
  species: z.string().optional(),
  length: z.string().optional(),
  weight: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  waterbody: z.string().optional(),
  date: z.union([z.date(), z.string()]).optional(),
  time: z.union([z.date(), z.string()]).optional(),
  fishingMethod: z.string().optional(),
  baitType: z.string().optional(),
  hookType: z.string().optional(),
  hookLocation: z.string().optional(),
  released: z.boolean().optional(),
  tagNumber: z.string().optional(),
  angler: AnglerSchema.optional(),
  additionalInformation: z.string().optional(),
  photo: z.string().optional(),
  coordinates: CoordinatesSchema.optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const FishSpeciesSchema = z.object({
  id: z.string(),
  name: z.string(),
  scientificName: z.string(),
  image: z.string(),
  description: z.string(),
  habitat: z.string(),
  seasons: z.object({
    spring: z.boolean(),
    summer: z.boolean(),
    fall: z.boolean(),
    winter: z.boolean(),
  }),
  regulations: z.union([z.array(z.string()), z.string()]).optional(),
});

export const UserProfileSchema = z.object({
  id: z.string().uuid().optional(),
  firstName: z.string().min(1, "First name is required").max(50).optional(),
  lastName: z.string().min(1, "Last name is required").max(50).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  profileImage: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const FishingLicenseSchema = z.object({
  id: z.string().uuid().optional(),
  licenseNumber: z.string().optional(),
  licenseType: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Types derived from Zod schemas
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type Angler = z.infer<typeof AnglerSchema>;
export type FishReport = z.infer<typeof FishReportSchema>;
export type FishSpecies = z.infer<typeof FishSpeciesSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type FishingLicense = z.infer<typeof FishingLicenseSchema>;
// types/bulletin.ts
//
// Type definitions for the app bulletins system.

export type BulletinType = 'closure' | 'advisory' | 'educational' | 'info';
export type BulletinPriority = 'urgent' | 'important' | 'normal';

export interface Bulletin {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  bulletinType: BulletinType;
  priority: BulletinPriority;
  imageUrls: string[];
  sourceUrl: string | null;
  sourceLabel: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

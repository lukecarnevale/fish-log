// types/prizes.ts

export interface Prize {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  value: string;
  category: 'license' | 'gear' | 'apparel' | 'experience' | 'other';
  sponsor?: string;
}

export interface PrizeDrawing {
  id: string;
  name: string;
  description: string;
  eligibilityRequirements: string[];
  prizes: Prize[];
  startDate: string;
  endDate: string;
  drawingDate: string;
  isActive: boolean;
}

export interface UserPrizeEntry {
  userId: string;
  userName: string;
  drawings: {
    drawingId: string;
    entriesCount: number;
    eligibleCatches: string[]; // IDs of eligible catch reports
    isEligible: boolean;
  }[];
}
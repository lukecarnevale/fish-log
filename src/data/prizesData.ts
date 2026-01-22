// data/prizesData.ts
import { Prize, PrizeDrawing, UserPrizeEntry } from '../types/prizes';

export const samplePrizes: Prize[] = [
  {
    id: '1',
    name: 'Annual Fishing License',
    description: 'One-year North Carolina Coastal Recreational Fishing License',
    value: '$45.00',
    category: 'license',
    sponsor: 'NC Wildlife Resources Commission'
  },
  {
    id: '2',
    name: 'Fishing Rod & Reel Combo',
    description: 'Premium saltwater fishing rod and reel combination',
    value: '$149.99',
    category: 'gear',
    sponsor: 'Tackle Direct'
  },
  {
    id: '3',
    name: 'NC Fish Champion T-Shirt',
    description: 'Limited edition t-shirt with the 2026 Annual Raffle logo',
    value: '$24.99',
    category: 'apparel',
    sponsor: 'Fish Report'
  },
  {
    id: '4',
    name: 'Fishing Hat',
    description: 'Breathable fishing hat with neck protection',
    value: '$34.99',
    category: 'apparel',
    sponsor: 'Coastal Outfitters'
  },
  {
    id: '5',
    name: 'Tackle Box Set',
    description: 'Complete tackle box with lures, hooks, and accessories',
    value: '$89.99',
    category: 'gear',
    sponsor: 'Bass Pro Shops'
  },
  {
    id: '6',
    name: 'Charter Fishing Trip',
    description: 'Half-day charter fishing experience for two people',
    value: '$350.00',
    category: 'experience',
    sponsor: 'Carolina Fishing Charters'
  }
];

export const activePrizeDrawing: PrizeDrawing = {
  id: 'annual-2026',
  name: '2026 Annual Fishing Raffle',
  description: 'Report your catches throughout the year to be entered into our annual prize drawing. Each verified catch report counts as one entry. Increase your chances by submitting more reports!',
  eligibilityRequirements: [
    'Must have at least one verified catch report during the Raffle period',
    'Must be a registered user of the Fish Reporter app',
    'Must have a valid fishing license',
    'NC Wildlife employees and immediate family members are not eligible'
  ],
  prizes: samplePrizes,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  drawingDate: '2027-01-01',
  isActive: true
};

export const sampleUserEntry: UserPrizeEntry = {
  userId: 'user123',
  userName: 'John Smith',
  drawings: [
    {
      drawingId: 'annual-2026',
      entriesCount: 3,
      eligibleCatches: ['report1', 'report2', 'report3'],
      isEligible: true
    }
  ]
};
// scripts/importSpeciesData.mjs
//
// Script to import fish species data from NC DEQ into Supabase.
// Run with: node scripts/importSpeciesData.mjs
//
// Data sources:
// - Species profiles: https://www.deq.nc.gov/about/divisions/marine-fisheries/public-information-and-education/species-profiles
// - Regulations: https://www.deq.nc.gov/about/divisions/marine-fisheries/rules-proclamations-and-size-and-bag-limits/recreational-size-and-bag-limits
//
// NOTE: To insert new species, you need to use the service_role key instead of anon key,
// or temporarily disable RLS on the fish_species table in Supabase dashboard.
// The anon key can only update existing records due to RLS policies.
//
// To use service_role key:
// 1. Go to Supabase Dashboard > Project Settings > API
// 2. Copy the service_role key (keep this secret!)
// 3. Set environment variable: export SUPABASE_SERVICE_KEY="your-key"
// 4. Run: node scripts/importSpeciesData.mjs

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://qygvvgbateuorpxntdbq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Z3Z2Z2JhdGV1b3JweG50ZGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzY5NjMsImV4cCI6MjA4NDcxMjk2M30.L9bW1-qlVwEqm9IKBWinWXyXJ6LKsTFGa_hoUmQ8xKs';

// Use service_role key if available (bypasses RLS), otherwise use anon key
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

if (process.env.SUPABASE_SERVICE_KEY) {
  console.log('🔑 Using service_role key (RLS bypassed)\n');
} else {
  console.log('⚠️  Using anon key - may not be able to insert new species due to RLS');
  console.log('   Set SUPABASE_SERVICE_KEY environment variable to bypass RLS\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================================================
// NC DEQ Species Data (Extracted from website)
// =============================================================================

// Inshore species from NC DEQ (with actual image URLs from files.nc.gov)
const inshoreSpecies = [
  { name: 'Black Drum', scientificName: 'Pogonias cromis', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2022-04/black-drum_0.jpg' },
  { name: 'Bluefish', scientificName: 'Pomatomus saltatrix', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Pomatomus-saltatrix-500x376.jpg' },
  { name: 'Croaker', scientificName: 'Micropogonias undulatus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Micropogonius-undulatus-500x376.jpg' },
  { name: 'Flounder', scientificName: 'Paralichthys lethostigma', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Paralichthys-lethostigma-500x376.jpg' },
  { name: 'Weakfish', scientificName: 'Cynoscion regalis', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Cynoscion-regalis-500x376.jpg' },
  { name: 'Kingfish', scientificName: 'Menticirrhus spp.', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Menticirrhus-littoralis-500x376.jpg' },
  { name: 'Menhaden', scientificName: 'Brevoortia tyrannus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/atlantic-menhaden-white.jpg' },
  { name: 'Mullet', scientificName: 'Mugil cephalus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2022-08/Mugil-cephalus-article-card.jpg' },
  { name: 'Pompano', scientificName: 'Trachinotus carolinus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Trachinotus-carolinus-white.jpg' },
  { name: 'Red Drum', scientificName: 'Sciaenops ocellatus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Sciaenops-ocellatus-500x376.jpg' },
  { name: 'Shad', scientificName: 'Alosa sapidissima', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Alosa-sapidissima-white.jpg' },
  { name: 'Sheepshead', scientificName: 'Archosargus probatocephalus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Archosargus-probatocephalus-white-500x376.jpg' },
  { name: 'Spanish Mackerel', scientificName: 'Scomberomorus maculatus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Scomberomorus-maculatus-500x376.jpg' },
  { name: 'Spotted Seatrout', scientificName: 'Cynoscion nebulosus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Cynoscion-nebulosus-500x376.jpg' },
  { name: 'Spot', scientificName: 'Leiostomus xanthurus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Leiostomus-xanthurus-white-500x376.jpg' },
  { name: 'Striped Bass', scientificName: 'Morone saxatilis', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Morone-saxatilis-white.jpg' },
  { name: 'Cobia', scientificName: 'Rachycentron canadum', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Rachycentron-canadum-500x376.jpg' },
  { name: 'Black Sea Bass', scientificName: 'Centropristis striata', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Centropristis-striata-500x376.jpg' },
  { name: 'Pinfish', scientificName: 'Lagodon rhomboides', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Lagodon-rhomboides-white.jpg' },
  { name: 'Pigfish', scientificName: 'Orthopristis chrysoptera', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Orthopristis-chrysoptera-white.jpg' },
  { name: 'Gray Trout', scientificName: 'Cynoscion regalis', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Cynoscion-regalis-500x376.jpg' },
  { name: 'Summer Flounder', scientificName: 'Paralichthys dentatus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Paralichthys-lethostigma-500x376.jpg' },
  { name: 'Blue Crab', scientificName: 'Callinectes sapidus', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Callinectes_sapidus.jpg/1280px-Callinectes_sapidus.jpg' },
  { name: 'Oysters', scientificName: 'Crassostrea virginica', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Crassostrea_virginica.jpg/1280px-Crassostrea_virginica.jpg' },
  { name: 'Shrimp', scientificName: 'Penaeus spp.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Penaeus_monodon.jpg/1280px-Penaeus_monodon.jpg' },
];

// Offshore species from NC DEQ (with actual image URLs from files.nc.gov)
const offshoreSpecies = [
  { name: 'Greater Amberjack', scientificName: 'Seriola dumerili', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Greater-Amberjack-500x376.jpg' },
  { name: 'Atlantic Bonito', scientificName: 'Sarda sarda', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/atlantic-bonito.jpg' },
  { name: 'Bigeye Tuna', scientificName: 'Thunnus obesus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/bigeye-tuna.jpg' },
  { name: 'Blackfin Tuna', scientificName: 'Thunnus atlanticus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/blackfin-tuna.jpg' },
  { name: 'Blueline Tilefish', scientificName: 'Caulolatilus microps', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/blueline-tilefish-500x376.jpg' },
  { name: 'Dolphinfish', scientificName: 'Coryphaena hippurus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Coryphaena-hippurus-500x376.jpg' },
  { name: 'Gag Grouper', scientificName: 'Mycteroperca microlepis', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/gag-grouper-500x376.jpg' },
  { name: 'King Mackerel', scientificName: 'Scomberomorus cavalla', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Scomberomorus-cavalla-500x376.jpg' },
  { name: 'Little Tunny', scientificName: 'Euthynnus alletteratus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Little-tunny.jpg' },
  { name: 'Red Grouper', scientificName: 'Epinephelus morio', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/red-grouper.jpg' },
  { name: 'Red Porgy', scientificName: 'Pagrus pagrus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/red-porgy.jpg' },
  { name: 'Red Snapper', scientificName: 'Lutjanus campechanus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/red-snapper.jpg' },
  { name: 'Sailfish', scientificName: 'Istiophorus platypterus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/sailfish.jpg' },
  { name: 'Scamp', scientificName: 'Mycteroperca phenax', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Scamp.jpg' },
  { name: 'Gray Triggerfish', scientificName: 'Balistes capriscus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/gray-triggerfish.jpg' },
  { name: 'Vermilion Snapper', scientificName: 'Rhomboplites aurorubens', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2022-07/vermilion-snapper-photo-500px.jpg' },
  { name: 'Wahoo', scientificName: 'Acanthocybium solandri', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Wahoo.jpg' },
  { name: 'White Marlin', scientificName: 'Kajikia albida', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/white-marlin.jpg' },
  { name: 'Yellowfin Tuna', scientificName: 'Thunnus albacares', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/yellowfin-tuna.jpg' },
  { name: 'Bluefin Tuna', scientificName: 'Thunnus thynnus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/bluefin-tuna.jpg' },
  { name: 'Blue Marlin', scientificName: 'Makaira nigricans', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/blue-marlin.jpg' },
  { name: 'Yellowtail Snapper', scientificName: 'Ocyurus chrysurus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/yellowtail-snapper.jpg' },
  { name: 'White Grunt', scientificName: 'Haemulon plumierii', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2022-07/white-grunt-500px.jpg' },
  { name: 'Hogfish', scientificName: 'Lachnolaimus maximus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Hogfish.jpg' },
  { name: 'Snowy Grouper', scientificName: 'Epinephelus niveatus', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Epinephelus_niveatus.jpg/1280px-Epinephelus_niveatus.jpg' },
  { name: 'Amberjack', scientificName: 'Seriola dumerili', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Greater-Amberjack-500x376.jpg' },
  { name: 'Dolphin', scientificName: 'Coryphaena hippurus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/Coryphaena-hippurus-500x376.jpg' },
  { name: 'Triggerfish', scientificName: 'Balistes capriscus', imageUrl: 'https://files.nc.gov/deq/styles/article_card/public/images/2021-10/gray-triggerfish.jpg' },
];

// =============================================================================
// Regulations Data (From NC DEQ Recreational Size and Bag Limits)
// =============================================================================

const regulationsMap = {
  // Mandatory Harvest Reporting Species (5 species)
  'Flounder': {
    sizeLimit: { min: 15, max: null, unit: 'in', notes: 'Total length' },
    bagLimit: 4,
    openSeasons: [{ from: 'Aug 16', to: 'Sep 30' }],
    specialRegulations: [
      'Mandatory harvest reporting required',
      'Season dates vary - check current proclamations',
    ],
  },
  'Red Drum': {
    sizeLimit: { min: 18, max: 27, unit: 'in', notes: 'Total length' },
    bagLimit: 1,
    openSeasons: null,
    specialRegulations: [
      'Mandatory harvest reporting required',
      'Only one fish per day, per person',
      'Slot limit: 18-27 inches',
    ],
  },
  'Spotted Seatrout': {
    sizeLimit: { min: 14, max: null, unit: 'in', notes: 'Total length' },
    bagLimit: 4,
    openSeasons: null,
    specialRegulations: [
      'Mandatory harvest reporting required',
      'Also known as Speckled Trout',
    ],
  },
  'Striped Bass': {
    sizeLimit: { min: 18, max: null, unit: 'in', notes: 'Total length' },
    bagLimit: 2,
    openSeasons: [
      { from: 'Jan 1', to: 'Mar 31' },
      { from: 'Oct 1', to: 'Dec 31' },
    ],
    closedAreas: ['Cape Fear River spawning areas during spawning season'],
    specialRegulations: [
      'Mandatory harvest reporting required',
      'Coastal waters regulations differ from inland waters',
    ],
  },
  'Gray Trout (Weakfish)': {
    sizeLimit: { min: 12, max: null, unit: 'in', notes: 'Total length' },
    bagLimit: 1,
    openSeasons: null,
    specialRegulations: [
      'Mandatory harvest reporting required',
      'Also known as Weakfish',
    ],
  },
  'Weakfish': {
    sizeLimit: { min: 12, max: null, unit: 'in', notes: 'Total length' },
    bagLimit: 1,
    openSeasons: null,
    specialRegulations: [
      'Mandatory harvest reporting required',
      'Also known as Gray Trout',
    ],
  },

  // Other inshore species
  'Black Drum': {
    sizeLimit: { min: 14, max: 25, unit: 'in', notes: 'Total length' },
    bagLimit: 10,
    openSeasons: null,
    specialRegulations: ['Slot limit: 14-25 inches', 'Over 25 inches must be released'],
  },
  'Bluefish': {
    sizeLimit: { min: null, max: null, unit: 'in' },
    bagLimit: 3,
    openSeasons: null,
    specialRegulations: ['No minimum size limit'],
  },
  'Blue Crab': {
    sizeLimit: { min: 5, max: null, unit: 'in', notes: 'Point-to-point across carapace' },
    bagLimit: 50,
    openSeasons: null,
    specialRegulations: ['Egg-bearing females must be released', 'No sponge crabs may be kept'],
  },
  'Croaker': {
    sizeLimit: { min: null, max: null, unit: 'in' },
    bagLimit: null,
    openSeasons: null,
    specialRegulations: ['No minimum size or bag limit'],
  },
  'Pompano': {
    sizeLimit: { min: null, max: null, unit: 'in' },
    bagLimit: null,
    openSeasons: null,
    specialRegulations: ['No minimum size or bag limit'],
  },
  'Sheepshead': {
    sizeLimit: { min: 10, max: null, unit: 'in' },
    bagLimit: null,
    openSeasons: null,
  },
  'Spanish Mackerel': {
    sizeLimit: { min: 12, max: null, unit: 'in', notes: 'Fork length' },
    bagLimit: 15,
    openSeasons: null,
  },
  'Spot': {
    sizeLimit: { min: null, max: null, unit: 'in' },
    bagLimit: null,
    openSeasons: null,
    specialRegulations: ['No minimum size or bag limit'],
  },
  'Summer Flounder': {
    sizeLimit: { min: 19, max: null, unit: 'in' },
    bagLimit: 4,
    openSeasons: null,
    specialRegulations: ['Size limit may differ from Southern Flounder'],
  },
  'Gray Trout': {
    sizeLimit: { min: 12, max: null, unit: 'in', notes: 'Total length' },
    bagLimit: 1,
    openSeasons: null,
    specialRegulations: [
      'Mandatory harvest reporting required',
      'Also known as Weakfish',
    ],
  },
  'Blue Crab': {
    sizeLimit: { min: 5, max: null, unit: 'in', notes: 'Point-to-point across carapace' },
    bagLimit: 50,
    openSeasons: null,
    specialRegulations: ['Egg-bearing females must be released', 'No sponge crabs may be kept'],
  },
  'Oysters': {
    sizeLimit: { min: 3, max: null, unit: 'in', notes: 'Shell length' },
    bagLimit: null,
    openSeasons: [{ from: 'Oct 15', to: 'Mar 31' }],
    specialRegulations: ['Season varies by area', 'Check proclamations for open areas'],
  },
  'Shrimp': {
    sizeLimit: { min: null, max: null, unit: 'in' },
    bagLimit: null,
    openSeasons: null,
    specialRegulations: ['48 quart heads-on / 29 quart heads-off recreational limit'],
  },
  'Snowy Grouper': {
    sizeLimit: { min: null, max: null, unit: 'in' },
    bagLimit: 1,
    openSeasons: null,
    specialRegulations: ['Part of deepwater complex', 'Check federal regulations'],
  },
  'Amberjack': {
    sizeLimit: { min: 28, max: null, unit: 'in', notes: 'Fork length' },
    bagLimit: 1,
    openSeasons: null,
    specialRegulations: ['Federal waters regulations may differ'],
  },
  'Dolphin': {
    sizeLimit: { min: 20, max: null, unit: 'in', notes: 'Fork length' },
    bagLimit: 10,
    openSeasons: null,
  },
  'Triggerfish': {
    sizeLimit: { min: 15, max: null, unit: 'in', notes: 'Fork length' },
    bagLimit: 1,
    openSeasons: null,
  },

  // Offshore species
  'Greater Amberjack': {
    sizeLimit: { min: 28, max: null, unit: 'in', notes: 'Fork length' },
    bagLimit: 1,
    openSeasons: null,
    specialRegulations: ['Federal waters regulations may differ'],
  },
  'Black Sea Bass': {
    sizeLimit: { min: 13, max: null, unit: 'in', notes: 'Total length' },
    bagLimit: 7,
    openSeasons: null,
    specialRegulations: ['Season dates vary - check current proclamations'],
  },
  'Cobia': {
    sizeLimit: { min: 33, max: null, unit: 'in', notes: 'Fork length' },
    bagLimit: 1,
    openSeasons: [{ from: 'Jun 1', to: 'Oct 31' }],
  },
  'Dolphinfish': {
    sizeLimit: { min: 20, max: null, unit: 'in', notes: 'Fork length' },
    bagLimit: 10,
    openSeasons: null,
  },
  'Gag Grouper': {
    sizeLimit: { min: 24, max: null, unit: 'in', notes: 'Total length' },
    bagLimit: 1,
    openSeasons: null,
    specialRegulations: ['Season closures may apply', 'Check federal regulations'],
  },
  'King Mackerel': {
    sizeLimit: { min: 24, max: null, unit: 'in', notes: 'Fork length' },
    bagLimit: 3,
    openSeasons: null,
  },
  'Red Snapper': {
    sizeLimit: { min: 16, max: null, unit: 'in', notes: 'Total length' },
    bagLimit: 2,
    openSeasons: null,
    specialRegulations: [
      'Season very limited - check proclamations',
      'Federal season typically only a few days per year',
    ],
  },
  'Gray Triggerfish': {
    sizeLimit: { min: 15, max: null, unit: 'in', notes: 'Fork length' },
    bagLimit: 1,
    openSeasons: null,
  },
  'Vermilion Snapper': {
    sizeLimit: { min: null, max: null, unit: 'in' },
    bagLimit: null,
    openSeasons: null,
    specialRegulations: ['Aggregate snapper complex limits may apply'],
  },
  'Wahoo': {
    sizeLimit: { min: null, max: null, unit: 'in' },
    bagLimit: 2,
    openSeasons: null,
  },
  'Yellowfin Tuna': {
    sizeLimit: { min: 27, max: null, unit: 'in', notes: 'Curved fork length' },
    bagLimit: 3,
    openSeasons: null,
    specialRegulations: ['Federal regulations apply in federal waters'],
  },
};

// =============================================================================
// Species Descriptions and Habitat Data
// =============================================================================

const speciesDetails = {
  'Flounder': {
    description: 'Southern flounder are flatfish that lie on the bottom, often partially buried in sand or mud. They are ambush predators with both eyes on the left side of the body.',
    habitat: 'Coastal estuaries, sounds, and nearshore ocean waters. Prefer sandy or muddy bottoms near structure.',
    identification: 'Flat body with both eyes on the left side. Brown to olive coloration with darker spots for camouflage.',
    maxSize: '30+ inches, 20+ lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Flatfish'],
  },
  'Red Drum': {
    description: 'Red drum, also called redfish or channel bass, are powerful gamefish known for the distinctive black spot(s) near their tail.',
    habitat: 'Coastal waters, estuaries, and sounds. Young fish prefer grass flats and oyster beds; adults found in deeper channels and nearshore ocean.',
    identification: 'Bronze to copper colored body with one or more black spots at the base of the tail. Large scales.',
    maxSize: '60+ inches, 90+ lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Drum'],
  },
  'Spotted Seatrout': {
    description: 'Spotted seatrout, commonly called "specks" or "speckled trout," are popular gamefish known for their beauty and excellent taste.',
    habitat: 'Shallow coastal waters, seagrass beds, and around oyster bars. Prefer water temperatures between 58-81°F.',
    identification: 'Silvery body with numerous black spots on upper sides and extending onto dorsal and tail fins. Two prominent canine teeth.',
    maxSize: '25+ inches, 12+ lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Drum'],
  },
  'Striped Bass': {
    description: 'Striped bass are anadromous fish that migrate between fresh and salt water. They are highly prized for their fight and excellent eating quality.',
    habitat: 'Coastal ocean, estuaries, and rivers. Found in both salt and fresh water depending on season and life stage.',
    identification: 'Silvery body with dark horizontal stripes running the length of the body. Two separate dorsal fins.',
    maxSize: '60+ inches, 70+ lbs',
    waterTypes: ['Saltwater', 'Freshwater', 'Brackish'],
    group: ['Bass'],
  },
  'Gray Trout (Weakfish)': {
    description: 'Weakfish, also called gray trout, get their name from their easily torn mouth. Once abundant, their populations have declined significantly.',
    habitat: 'Shallow coastal waters over sandy and muddy bottoms. Found in sounds and estuaries.',
    identification: 'Silvery with numerous small spots forming irregular diagonal lines. Soft, easily torn mouth.',
    maxSize: '35 inches, 19 lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Drum'],
  },
  'Weakfish': {
    description: 'Weakfish, also called gray trout, get their name from their easily torn mouth. Once abundant, their populations have declined significantly.',
    habitat: 'Shallow coastal waters over sandy and muddy bottoms. Found in sounds and estuaries.',
    identification: 'Silvery with numerous small spots forming irregular diagonal lines. Soft, easily torn mouth.',
    maxSize: '35 inches, 19 lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Drum'],
  },
  'Black Drum': {
    description: 'Black drum are the largest members of the drum family and known for the drumming sounds they produce.',
    habitat: 'Coastal waters, estuaries, and around structures like docks and bridges. Prefer brackish water.',
    identification: 'Gray to black body with 4-5 dark vertical bars that fade in larger fish. Barbels on chin.',
    maxSize: '60+ inches, 100+ lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Drum'],
  },
  'Bluefish': {
    description: 'Bluefish are aggressive predators known for their sharp teeth and voracious feeding habits.',
    habitat: 'Coastal and offshore waters. Highly migratory, following schools of baitfish.',
    identification: 'Blue-green above, silvery below. Sharp teeth and forked tail.',
    maxSize: '40 inches, 30+ lbs',
    waterTypes: ['Saltwater'],
    group: ['Pelagic'],
  },
  'Spanish Mackerel': {
    description: 'Spanish mackerel are fast, streamlined predators popular with anglers for their fight and excellent taste.',
    habitat: 'Nearshore coastal waters, often around piers, jetties, and inlets.',
    identification: 'Silvery body with bronze/yellow spots. No stripes on first dorsal fin (unlike king mackerel).',
    maxSize: '36 inches, 13 lbs',
    waterTypes: ['Saltwater'],
    group: ['Mackerel', 'Pelagic'],
  },
  'King Mackerel': {
    description: 'King mackerel, also called kingfish, are large predatory fish prized by offshore anglers.',
    habitat: 'Offshore and nearshore waters. Found near structure, reefs, and wrecks.',
    identification: 'Streamlined body, iridescent silvery coloration. Lateral line dips sharply below second dorsal fin.',
    maxSize: '72 inches, 90+ lbs',
    waterTypes: ['Saltwater'],
    group: ['Mackerel', 'Pelagic'],
  },
  'Cobia': {
    description: 'Cobia are large, powerful fish known for their curiosity and willingness to follow boats and large marine animals.',
    habitat: 'Coastal and offshore waters. Often found near buoys, wrecks, and floating debris. Follow rays and turtles.',
    identification: 'Dark brown above, white below. Single dorsal fin with 7-9 short, depressible spines. Broad, flat head.',
    maxSize: '78 inches, 135 lbs',
    waterTypes: ['Saltwater'],
    group: ['Pelagic'],
  },
  'Black Sea Bass': {
    description: 'Black sea bass are a popular bottom-dwelling fish found on natural and artificial reefs.',
    habitat: 'Rocky bottoms, wrecks, and artificial reefs. Found from nearshore to 100+ feet.',
    identification: 'Dark gray to black with light centers to scales forming a pattern. Large males develop a pronounced hump on head.',
    maxSize: '25 inches, 8 lbs',
    waterTypes: ['Saltwater'],
    group: ['Sea Bass', 'Bottom fish'],
  },
  'Dolphinfish': {
    description: 'Mahi-mahi, also called dolphin or dorado, are spectacular offshore gamefish known for their acrobatic fights and brilliant colors.',
    habitat: 'Offshore blue water, often near floating debris, weed lines, and current edges.',
    identification: 'Brilliant green, blue, and yellow coloration. Blunt, prominent forehead in males (bulls).',
    maxSize: '72 inches, 80+ lbs',
    waterTypes: ['Saltwater'],
    group: ['Pelagic', 'Offshore'],
  },
  'Yellowfin Tuna': {
    description: 'Yellowfin tuna are powerful offshore predators highly prized for sport and table fare.',
    habitat: 'Offshore blue water, often near temperature breaks and structure.',
    identification: 'Dark blue above, silvery below with bright yellow finlets and fins. Elongated second dorsal and anal fins in large fish.',
    maxSize: '84 inches, 400+ lbs',
    waterTypes: ['Saltwater'],
    group: ['Tuna', 'Pelagic', 'Offshore'],
  },
  'Wahoo': {
    description: 'Wahoo are one of the fastest fish in the ocean, prized for their blistering runs and excellent eating quality.',
    habitat: 'Offshore blue water, often found alone or in small groups near structure and current edges.',
    identification: 'Elongated body with dark blue vertical bars. Long, pointed snout and sharp teeth.',
    maxSize: '84 inches, 180 lbs',
    waterTypes: ['Saltwater'],
    group: ['Pelagic', 'Offshore'],
  },
  'Red Snapper': {
    description: 'Red snapper are highly sought-after reef fish known for their excellent taste and limited seasons.',
    habitat: 'Offshore reefs, wrecks, and hard bottom areas in 60-300 feet of water.',
    identification: 'Red to pink body with red eyes. Pointed anal fin.',
    maxSize: '40 inches, 50+ lbs',
    waterTypes: ['Saltwater'],
    group: ['Snapper', 'Bottom fish', 'Offshore'],
  },
  'Sheepshead': {
    description: 'Sheepshead are known for their human-like teeth and excellent taste. They are structure-oriented fish.',
    habitat: 'Around pilings, jetties, bridges, and oyster bars. Found in both coastal and offshore waters.',
    identification: 'Gray body with 5-7 dark vertical bars. Human-like incisors and molars.',
    maxSize: '30 inches, 20 lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Porgy'],
  },
  'Pompano': {
    description: 'Pompano are highly prized for their excellent flavor and are considered one of the best eating fish on the coast.',
    habitat: 'Surf zone, beaches, and nearshore waters. Often found around sand fleas and other crustaceans.',
    identification: 'Deep, compressed body. Silvery with yellowish coloration on fins and belly.',
    maxSize: '25 inches, 8 lbs',
    waterTypes: ['Saltwater'],
    group: ['Jack'],
  },
  'Blue Crab': {
    description: 'Blue crabs are one of the most iconic species of the Atlantic coast, prized for their sweet, delicate meat.',
    habitat: 'Estuaries, sounds, and coastal waters. Found in a variety of salinities from fresh to full salt water.',
    identification: 'Olive-green to blue-gray carapace. Bright blue claws, especially in males. Paddle-like back legs for swimming.',
    maxSize: '9 inches across carapace',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Crustacean'],
  },
  'Croaker': {
    description: 'Atlantic croaker get their name from the croaking sound they make by vibrating their swim bladder.',
    habitat: 'Coastal waters, sounds, and estuaries over sand and mud bottoms.',
    identification: 'Silvery with brownish-yellow overtones. Small barbels on chin.',
    maxSize: '20 inches, 5 lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Drum'],
  },
  'Spot': {
    description: 'Spot are small, abundant fish popular for their mild flavor and ease of catching.',
    habitat: 'Coastal waters, sounds, and estuaries. Often found in schools over sandy or muddy bottoms.',
    identification: 'Silvery with golden sheen. Distinctive dark spot behind the gill cover.',
    maxSize: '14 inches, 1 lb',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Drum'],
  },
  'Mullet': {
    description: 'Mullet are schooling fish that feed on algae and detritus. They are important baitfish and also eaten.',
    habitat: 'Coastal waters, estuaries, and sometimes freshwater. Found in schools near the surface.',
    identification: 'Silvery body with blue-gray back. Small mouth and thick lips.',
    maxSize: '30 inches, 12 lbs',
    waterTypes: ['Saltwater', 'Brackish', 'Freshwater'],
    group: ['Mullet'],
  },
  'Shad': {
    description: 'American shad are anadromous fish that return to rivers to spawn. They are the largest herring in North America.',
    habitat: 'Ocean and coastal waters, migrating to rivers in spring to spawn.',
    identification: 'Deep body with silvery sides. Row of dark spots along the side.',
    maxSize: '30 inches, 12 lbs',
    waterTypes: ['Saltwater', 'Freshwater', 'Brackish'],
    group: ['Herring'],
  },
  'Menhaden': {
    description: 'Menhaden, also called bunker or pogies, are extremely important forage fish and are used to make fish meal and oil.',
    habitat: 'Coastal waters in large schools. Filter feeders that strain plankton from the water.',
    identification: 'Deep, compressed body. Silvery with brassy sides. Large head.',
    maxSize: '18 inches, 3 lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Herring', 'Baitfish'],
  },
  'Greater Amberjack': {
    description: 'Greater amberjack are powerful reef fish known for their strength and stamina.',
    habitat: 'Offshore reefs, wrecks, and oil platforms in 60-200 feet of water.',
    identification: 'Elongated body with brownish to blue-green back. Dark diagonal band through eye.',
    maxSize: '72 inches, 180 lbs',
    waterTypes: ['Saltwater'],
    group: ['Jack', 'Offshore'],
  },
  'Gag Grouper': {
    description: 'Gag grouper are prized for their excellent flavor and are a popular target for offshore anglers.',
    habitat: 'Reefs, ledges, and wrecks in 60-200 feet of water. Juveniles found inshore.',
    identification: 'Pale gray body with darker wavy lines. Can darken dramatically when excited.',
    maxSize: '50 inches, 80 lbs',
    waterTypes: ['Saltwater'],
    group: ['Grouper', 'Offshore', 'Bottom fish'],
  },
  'Red Grouper': {
    description: 'Red grouper are bottom dwellers that prefer hard bottom areas and artificial reefs.',
    habitat: 'Hard bottom areas, reefs, and wrecks in 80-300 feet of water.',
    identification: 'Reddish-brown body with darker blotches. Head profile is more sloped than other groupers.',
    maxSize: '40 inches, 50 lbs',
    waterTypes: ['Saltwater'],
    group: ['Grouper', 'Offshore', 'Bottom fish'],
  },
  'Gray Triggerfish': {
    description: 'Gray triggerfish are known for their hard-fighting ability and excellent taste.',
    habitat: 'Offshore reefs, wrecks, and hard bottom areas.',
    identification: 'Gray body with small scales and a distinctive trigger-like spine on dorsal fin. Blue markings around eyes.',
    maxSize: '24 inches, 14 lbs',
    waterTypes: ['Saltwater'],
    group: ['Triggerfish', 'Offshore'],
  },
  'Pinfish': {
    description: 'Pinfish are small, spiny fish commonly used as bait. They are abundant in coastal waters.',
    habitat: 'Seagrass beds, around piers, and in estuaries. Very common in shallow coastal waters.',
    identification: 'Compressed, oval body with sharp dorsal spines. Silvery with blue and yellow stripes.',
    maxSize: '10 inches, 1 lb',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Porgy', 'Baitfish'],
  },
  'Pigfish': {
    description: 'Pigfish, also called hogfish, are named for the grunting sound they make. They are popular baitfish.',
    habitat: 'Shallow coastal waters, around structure and grass beds.',
    identification: 'Silvery body with slight blue and yellow markings. Produces grunting sounds.',
    maxSize: '14 inches, 1 lb',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Grunt', 'Baitfish'],
  },
  'Bluefin Tuna': {
    description: 'Atlantic bluefin tuna are the largest tuna species and among the most prized gamefish in the world.',
    habitat: 'Offshore pelagic waters. Highly migratory, found in the Gulf Stream.',
    identification: 'Dark blue above, silvery below. Pectoral fins are short. Very streamlined body.',
    maxSize: '144 inches, 1500 lbs',
    waterTypes: ['Saltwater'],
    group: ['Tuna', 'Pelagic', 'Offshore'],
  },
  'Blue Marlin': {
    description: 'Blue marlin are the ultimate offshore gamefish, known for their size, speed, and spectacular fights.',
    habitat: 'Deep offshore waters, often along current edges and underwater structure.',
    identification: 'Cobalt blue above, silvery white below. Long pointed bill and tall first dorsal fin.',
    maxSize: '180 inches, 1800 lbs',
    waterTypes: ['Saltwater'],
    group: ['Billfish', 'Pelagic', 'Offshore'],
  },
  'Yellowtail Snapper': {
    description: 'Yellowtail snapper are colorful reef fish prized for their excellent flavor.',
    habitat: 'Coral reefs and hard bottom areas, often in schools above the reef.',
    identification: 'Yellow stripe from snout to bright yellow tail. Pink to red body.',
    maxSize: '30 inches, 10 lbs',
    waterTypes: ['Saltwater'],
    group: ['Snapper', 'Offshore', 'Reef'],
  },
  'White Grunt': {
    description: 'White grunts are common reef fish that produce grunting sounds by grinding their pharyngeal teeth.',
    habitat: 'Reefs, wrecks, and hard bottom areas. Often in schools.',
    identification: 'Blue and yellow striped head, silvery body. Makes grunting sounds.',
    maxSize: '18 inches, 4 lbs',
    waterTypes: ['Saltwater'],
    group: ['Grunt', 'Reef', 'Offshore'],
  },
  'Hogfish': {
    description: 'Hogfish are highly prized for their excellent flavor. Large males develop a distinctive pig-like snout.',
    habitat: 'Coral reefs and hard bottom areas. Often found near gorgonians and sea fans.',
    identification: 'Reddish body with darker blotches. Large males have elongated snout and first dorsal spine.',
    maxSize: '36 inches, 25 lbs',
    waterTypes: ['Saltwater'],
    group: ['Wrasse', 'Reef', 'Offshore'],
  },
  'Vermilion Snapper': {
    description: 'Vermilion snapper, also called beeliners, are popular bottom fish found on offshore reefs.',
    habitat: 'Offshore reefs and hard bottom areas in 80-300 feet of water.',
    identification: 'Reddish body with blue streaks below eyes. Relatively small snapper.',
    maxSize: '24 inches, 6 lbs',
    waterTypes: ['Saltwater'],
    group: ['Snapper', 'Offshore', 'Bottom fish'],
  },
  'Gray Trout': {
    description: 'Gray trout, also called weakfish, get their name from their easily torn mouth. Once abundant, their populations have declined significantly.',
    habitat: 'Shallow coastal waters over sandy and muddy bottoms. Found in sounds and estuaries.',
    identification: 'Silvery with numerous small spots forming irregular diagonal lines. Soft, easily torn mouth.',
    maxSize: '35 inches, 19 lbs',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Drum'],
  },
  'Summer Flounder': {
    description: 'Summer flounder, also called fluke, are flatfish that migrate seasonally between inshore and offshore waters.',
    habitat: 'Sandy and muddy bottoms from inshore estuaries to offshore continental shelf.',
    identification: 'Flat body with both eyes on left side. Brown to gray with numerous spots.',
    maxSize: '26 inches, 26 lbs',
    waterTypes: ['Saltwater'],
    group: ['Flatfish'],
  },
  'Blue Crab': {
    description: 'Blue crabs are one of the most iconic species of the Atlantic coast, prized for their sweet, delicate meat.',
    habitat: 'Estuaries, sounds, and coastal waters. Found in a variety of salinities.',
    identification: 'Olive-green to blue-gray carapace. Bright blue claws in males. Paddle-like back legs for swimming.',
    maxSize: '9 inches across carapace',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Crustacean'],
  },
  'Oysters': {
    description: 'Eastern oysters are filter feeders that form reefs and are prized for both eating and their ecological importance.',
    habitat: 'Intertidal and subtidal areas attached to hard surfaces. Form extensive reefs.',
    identification: 'Irregularly shaped shells. Gray to tan exterior, white interior with purple muscle scar.',
    maxSize: '8 inches',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Shellfish'],
  },
  'Shrimp': {
    description: 'Penaeid shrimp are commercially and recreationally important crustaceans found in NC coastal waters.',
    habitat: 'Estuaries and nearshore waters. Brown, white, and pink shrimp have different habitat preferences.',
    identification: 'Elongated body with jointed exoskeleton. Long antennae and fan-shaped tail.',
    maxSize: '8 inches',
    waterTypes: ['Saltwater', 'Brackish'],
    group: ['Crustacean'],
  },
  'Snowy Grouper': {
    description: 'Snowy grouper are deepwater reef fish found at depths of 300-600 feet.',
    habitat: 'Deep offshore reefs and hard bottom areas.',
    identification: 'Dark brown body with white spots that resemble snow. Large mouth.',
    maxSize: '48 inches, 70 lbs',
    waterTypes: ['Saltwater'],
    group: ['Grouper', 'Offshore', 'Bottom fish'],
  },
  'Amberjack': {
    description: 'Greater amberjack are powerful reef fish known for their strength and stamina.',
    habitat: 'Offshore reefs, wrecks, and oil platforms in 60-200 feet of water.',
    identification: 'Elongated body with brownish to blue-green back. Dark diagonal band through eye.',
    maxSize: '72 inches, 180 lbs',
    waterTypes: ['Saltwater'],
    group: ['Jack', 'Offshore'],
  },
  'Dolphin': {
    description: 'Mahi-mahi, also called dolphin or dorado, are spectacular offshore gamefish known for their acrobatic fights.',
    habitat: 'Offshore blue water, often near floating debris, weed lines, and current edges.',
    identification: 'Brilliant green, blue, and yellow coloration. Blunt forehead in males.',
    maxSize: '72 inches, 80+ lbs',
    waterTypes: ['Saltwater'],
    group: ['Pelagic', 'Offshore'],
  },
  'Triggerfish': {
    description: 'Gray triggerfish are known for their hard-fighting ability and excellent taste.',
    habitat: 'Offshore reefs, wrecks, and hard bottom areas.',
    identification: 'Gray body with trigger-like spine on dorsal fin. Blue markings around eyes.',
    maxSize: '24 inches, 14 lbs',
    waterTypes: ['Saltwater'],
    group: ['Triggerfish', 'Offshore'],
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function createSpeciesRecord(speciesData, index, isInshore) {
  const details = speciesDetails[speciesData.name];
  const regulations = regulationsMap[speciesData.name];

  const displayName = speciesData.name.includes('(') ? speciesData.name.split('(')[0].trim() : speciesData.name;
  const altName = speciesData.name.match(/\(([^)]+)\)/)?.[1];

  // Don't include id - let Supabase generate UUID
  return {
    name: displayName,
    common_names: altName ? [displayName, altName] : [displayName],
    scientific_name: speciesData.scientificName,
    image_primary: speciesData.imageUrl,
    image_additional: [],
    description: details?.description || `${speciesData.name} is a popular fish found in North Carolina coastal waters.`,
    identification: details?.identification || 'Identification details pending.',
    max_size: details?.maxSize || null,
    habitat: details?.habitat || (isInshore ? 'Coastal and inshore waters of North Carolina.' : 'Offshore waters of North Carolina.'),
    distribution: 'North Carolina coastal and offshore waters.',
    regulations: regulations || { sizeLimit: { min: null, max: null, unit: 'in' }, bagLimit: null, openSeasons: null },
    conservation_status: 'Least Concern',
    fishing_tips: {
      techniques: isInshore
        ? ['Bottom fishing', 'Live bait fishing', 'Artificial lures']
        : ['Trolling', 'Jigging', 'Live bait fishing'],
      baits: isInshore
        ? ['Live shrimp', 'Cut bait', 'Soft plastics']
        : ['Live bait', 'Trolling lures', 'Jigs'],
      equipment: isInshore
        ? ['Medium action rod', 'Spinning reel', '10-20 lb line']
        : ['Heavy action rod', 'Conventional reel', '30-80 lb line'],
      locations: isInshore
        ? ['Sounds', 'Estuaries', 'Nearshore waters']
        : ['Offshore reefs', 'Wrecks', 'Gulf Stream'],
    },
    water_types: details?.waterTypes || (isInshore ? ['Saltwater', 'Brackish'] : ['Saltwater']),
    species_group: details?.group || (isInshore ? ['Inshore'] : ['Offshore']),
    season_spring: true,
    season_summer: true,
    season_fall: true,
    season_winter: isInshore,
    similar_species: [],
    is_active: true,
    sort_order: index + 1,
  };
}

// =============================================================================
// Main Import Function
// =============================================================================

async function importSpecies() {
  console.log('🐟 Starting fish species import...\n');

  // Create records for all species
  const allSpecies = [
    ...inshoreSpecies.map((s, i) => createSpeciesRecord(s, i, true)),
    ...offshoreSpecies.map((s, i) => createSpeciesRecord(s, inshoreSpecies.length + i, false)),
  ];

  console.log(`📋 Prepared ${allSpecies.length} species for import:\n`);

  // Display species list
  console.log('Inshore Species:');
  inshoreSpecies.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
  console.log('\nOffshore Species:');
  offshoreSpecies.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));

  // Show sample record
  console.log('\n📝 Sample record (Flounder):');
  const sampleRecord = allSpecies.find(s => s.name === 'Flounder');
  console.log(JSON.stringify(sampleRecord, null, 2));

  // Prompt for confirmation
  console.log('\n⚠️  This will upsert data in the fish_species table.');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  // First, check for existing species
  console.log('⏳ Checking for existing species...\n');

  const { data: existingData } = await supabase
    .from('fish_species')
    .select('id, name');

  const existingNames = new Set((existingData || []).map(s => s.name));
  const newSpecies = allSpecies.filter(s => !existingNames.has(s.name));
  const existingSpecies = allSpecies.filter(s => existingNames.has(s.name));

  console.log(`Found ${existingNames.size} existing species in database.`);
  console.log(`${newSpecies.length} new species to insert.`);
  console.log(`${existingSpecies.length} existing species to update.\n`);

  // Insert new species
  if (newSpecies.length > 0) {
    console.log('⏳ Inserting new species...\n');

    const { data: insertData, error: insertError } = await supabase
      .from('fish_species')
      .insert(newSpecies)
      .select();

    if (insertError) {
      if (insertError.code === '42501') {
        console.error('❌ RLS Policy Error: Cannot insert new species with anon key.');
        console.error('   To insert new species, set SUPABASE_SERVICE_KEY environment variable:');
        console.error('   export SUPABASE_SERVICE_KEY="your-service-role-key"');
        console.error('   Then re-run: node scripts/importSpeciesData.mjs\n');
      } else {
        console.error('❌ Error inserting new species:', insertError.message);
        console.error('Details:', insertError);
      }
    } else {
      console.log(`✅ Inserted ${insertData?.length || 0} new species!\n`);
    }
  }

  // Update existing species
  if (existingSpecies.length > 0) {
    console.log('⏳ Updating existing species...\n');

    for (const species of existingSpecies) {
      const existingRecord = existingData.find(e => e.name === species.name);
      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('fish_species')
          .update(species)
          .eq('id', existingRecord.id);

        if (updateError) {
          console.error(`❌ Error updating ${species.name}:`, updateError.message);
        }
      }
    }
    console.log(`✅ Updated ${existingSpecies.length} existing species!\n`);
  }

  const data = [...(existingData || [])];
  const error = null;

  if (error) {
    console.error('❌ Error inserting species:', error.message);
    console.error('Details:', error);
    return;
  }

  console.log(`✅ Successfully imported ${data?.length || allSpecies.length} species!\n`);

  // Verify by fetching mandatory harvest species
  console.log('🔍 Verifying mandatory harvest reporting species...\n');

  const { data: verifyData, error: verifyError } = await supabase
    .from('fish_species')
    .select('name, regulations')
    .in('name', ['Flounder', 'Red Drum', 'Spotted Seatrout', 'Striped Bass', 'Gray Trout', 'Weakfish']);

  if (verifyError) {
    console.error('❌ Verification error:', verifyError.message);
  } else {
    console.log('Mandatory Harvest Species in database:');
    verifyData?.forEach(s => {
      console.log(`  ✓ ${s.name} - Bag limit: ${s.regulations?.bagLimit || 'N/A'}, Size limit: ${s.regulations?.sizeLimit?.min || 'N/A'}" min`);
    });
  }

  console.log('\n🎉 Import complete!');
}

// Run the import
importSpecies().catch(console.error);

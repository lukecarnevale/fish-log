// constants/speciesAliases.ts
//
// Species name aliases for matching across the app.
// Used by CatchFeedScreen for image matching and species identification.
// All variations of a species name map to each other.
//

export const SPECIES_ALIASES: Record<string, string[]> = {
  // Weakfish / Gray Trout are the same species (Cynoscion regalis)
  'weakfish': ['gray trout', 'grey trout', 'sea trout', 'squeteague'],
  'gray trout': ['weakfish', 'grey trout', 'sea trout', 'squeteague'],
  'grey trout': ['weakfish', 'gray trout', 'sea trout', 'squeteague'],
  // Spotted Seatrout variations (Cynoscion nebulosus)
  'spotted seatrout': ['speckled trout', 'specks', 'speck', 'seatrout', 'spotted sea trout'],
  'speckled trout': ['spotted seatrout', 'specks', 'speck', 'seatrout', 'spotted sea trout'],
  'specks': ['spotted seatrout', 'speckled trout', 'seatrout', 'speck', 'spotted sea trout'],
  'speck': ['spotted seatrout', 'speckled trout', 'seatrout', 'specks', 'spotted sea trout'],
  'seatrout': ['spotted seatrout', 'speckled trout', 'specks', 'speck', 'spotted sea trout'],
  // Flounder variations
  'flounder': ['southern flounder', 'summer flounder', 'fluke'],
  'southern flounder': ['flounder', 'summer flounder', 'fluke'],
  'summer flounder': ['flounder', 'southern flounder', 'fluke'],
  // Red Drum variations
  'red drum': ['redfish', 'channel bass', 'puppy drum', 'red'],
  'redfish': ['red drum', 'channel bass', 'puppy drum'],
  // Dolphinfish variations
  'dolphinfish': ['mahi-mahi', 'mahi mahi', 'dorado', 'dolphin'],
  'mahi-mahi': ['dolphinfish', 'mahi mahi', 'dorado', 'dolphin'],
  'dolphin': ['dolphinfish', 'mahi-mahi', 'mahi mahi', 'dorado'],
};

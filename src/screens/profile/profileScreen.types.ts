import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";

export type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Profile"
>;

export interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

// Fishing statistics type
export interface FishingStats {
  totalCatches: number;
  uniqueSpecies: number;
  largestFish: number | null; // in inches
}

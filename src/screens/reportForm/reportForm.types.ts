// screens/reportForm/reportForm.types.ts
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";

type ReportFormScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReportForm"
>;

interface ReportFormScreenProps {
  navigation: ReportFormScreenNavigationProp;
}

// Define types for individual fish entry
interface FishEntry {
  species: string;
  count: number;
  lengths: string[]; // Array of lengths, one per fish
  tagNumber?: string;
}

// Reporting type options
type ReportingType = "myself" | "myself_and_minors" | null;

// Define types for our form fields
interface FormState {
  // Reporting type
  reportingType: ReportingType;
  totalPeopleCount: number;
  // Fish info
  species: string;
  count: number;
  lengths: string[]; // Array of lengths for each fish
  tagNumber: string;
  // Trip details
  waterbody: string;
  date: Date;
  // DMF gear/method fields
  usedHookAndLine: boolean;
  gearType: string; // Only used when usedHookAndLine is false
  // DMF confirmation preferences
  wantTextConfirmation: boolean;
  wantEmailConfirmation: boolean;
  // Identity (loaded from profile)
  hasLicense: boolean;
  wrcId: string;
  zipCode: string;
  // Angler info
  angler: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

interface PickerData {
  species: string[];
  waterbody: string[];
  gearType: string[];
  [key: string]: string[];
}

export type {
  ReportFormScreenNavigationProp,
  ReportFormScreenProps,
  FishEntry,
  ReportingType,
  FormState,
  PickerData,
};

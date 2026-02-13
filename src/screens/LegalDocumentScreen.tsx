// screens/LegalDocumentScreen.tsx
//
// Screen for displaying legal documents (Privacy Policy, Terms of Use, Licenses).
// Displays key sections with a link to the full document.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList, LegalDocumentType } from '../types';
import { colors, spacing, borderRadius, typography } from '../styles/common';

type LegalDocumentScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'LegalDocument'
>;

type LegalDocumentScreenRouteProp = RouteProp<
  RootStackParamList,
  'LegalDocument'
>;

interface LegalDocumentScreenProps {
  navigation: LegalDocumentScreenNavigationProp;
  route: LegalDocumentScreenRouteProp;
}

// Base URL for hosted legal documents (update when domain is configured)
const WEBSITE_BASE_URL = 'https://fishlogco.github.io';

// Document content configuration
const DOCUMENTS: Record<LegalDocumentType, {
  title: string;
  lastUpdated: string;
  sections: Array<{ title: string; content: string }>;
  fullDocumentUrl?: string;
}> = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'February 2026',
    fullDocumentUrl: `${WEBSITE_BASE_URL}/privacy.html`,
    sections: [
      {
        title: 'Information We Collect',
        content: 'We collect information you provide directly, including your name, email, phone number, date of birth, zip code, profile photo, fishing license information, and catch data (species, quantities, lengths, photos, harvest area, and fishing method).\n\nWe also collect certain information automatically: a unique device identifier generated on first launch, your device platform and OS version, and aggregated advertisement impression and click counts. We do not automatically collect your GPS location.',
      },
      {
        title: 'How We Use Your Information',
        content: 'We use your information to submit harvest reports to the NC Division of Marine Fisheries on your behalf, manage your Rewards Member account, administer the quarterly rewards program, display your catches in the community feed (Rewards Members only, showing first name and last initial), diagnose bugs and respond to feedback, and send confirmation messages if you opt in.',
      },
      {
        title: 'Information Sharing',
        content: 'We do not sell your personal information. We share data with: NC Division of Marine Fisheries (harvest report data submitted to their official reporting system), Supabase (our database, authentication, and storage provider), Zippopotam.us (your zip code is sent to this service for validation when you update your profile), and other Rewards Members (your catches may appear in the community feed with your first name and last initial).',
      },
      {
        title: 'Data Retention & Deletion',
        content: 'We retain your data for as long as your account is active. You can delete your account at any time from the app (Profile > Edit Profile > Delete Account) or by emailing fishlogco@gmail.com. Deletion permanently removes all your profile data, harvest reports, photos, achievements, rewards entries, and feed posts. Reports already submitted to NC DMF cannot be removed from their systems.',
      },
      {
        title: 'Your Rights',
        content: 'You have the right to access, correct, or delete your personal data at any time. California residents have additional rights under the CCPA. European users have rights under the GDPR. We do not discriminate against users who exercise their privacy rights. Contact us at fishlogco@gmail.com to exercise these rights.',
      },
      {
        title: "Children's Privacy",
        content: 'Fish Log is not directed at children under 13. We do not knowingly collect personal information from children under 13. The Rewards Member program requires users to be at least 18. Users between 13 and 17 may use the app for harvest reporting with parent or guardian consent. Contact us immediately if you believe a child under 13 has provided us with personal information.',
      },
      {
        title: 'Data Security',
        content: 'We implement encryption for data in transit (HTTPS), secure token storage using your device\'s secure storage system (Keychain/Keystore), and row-level security policies in our database. However, no method of transmission or storage is 100% secure.',
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    lastUpdated: 'February 2026',
    fullDocumentUrl: `${WEBSITE_BASE_URL}/terms.html`,
    sections: [
      {
        title: 'Agreement to Terms',
        content: 'By using Fish Log, you agree to these Terms of Use. You must be at least 13 years old to use this app. If you are between 13 and 17, a parent or guardian must agree on your behalf. The Rewards Member program is open only to NC residents 18 years of age or older.',
      },
      {
        title: 'Account Responsibilities',
        content: 'You are responsible for maintaining the security of your account and for all activities under your account. You must provide accurate information and keep it updated. We authenticate Rewards Members via passwordless magic link email.',
      },
      {
        title: 'Harvest Reporting',
        content: 'You are solely responsible for the accuracy of your harvest reports. Fish Log helps you submit reports to the NC Division of Marine Fisheries but does not verify catch information, species identification, or regulatory compliance. Fish Log does not guarantee successful transmission to NC DMF. Always consult official NC DMF sources for current regulations. Submitting false harvest reports may violate North Carolina law.',
      },
      {
        title: 'Rewards Program',
        content: 'The quarterly rewards program is open to NC residents 18+. Entries are earned by submitting valid harvest reports. No purchase or report is necessary to enter or win — alternative free entry is available. Winners are selected randomly and notified by email. We reserve the right to disqualify fraudulent entries.',
      },
      {
        title: 'User Content',
        content: 'You retain ownership of content you submit (photos, catch data). By submitting content, you grant us a non-exclusive, royalty-free license to display it in the app and community feed. Rewards Members\' catches may appear in the feed showing first name and last initial. Do not submit content that is false, illegal, offensive, or infringes on others\' rights.',
      },
      {
        title: 'Disclaimers',
        content: 'THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. We do not guarantee uninterrupted service, accuracy of fishing information, successful report transmission, or error-free operation. Fish Log is not affiliated with, endorsed by, or operated by the NC Division of Marine Fisheries or any government agency.',
      },
      {
        title: 'Limitation of Liability',
        content: 'To the maximum extent permitted by law, Fish Log Co. is not liable for indirect, incidental, special, consequential, or punitive damages, including loss of data, fines, penalties, or regulatory consequences, arising from your use of the app. These Terms are governed by the laws of the State of North Carolina.',
      },
    ],
  },
  licenses: {
    title: 'Open Source Licenses',
    lastUpdated: 'February 2026',
    fullDocumentUrl: undefined,
    sections: [
      {
        title: 'About This App',
        content: 'Fish Log is built using open source software. We are grateful to the developers and contributors of these projects.',
      },
      {
        title: 'Core Technologies',
        content: 'React Native (MIT License) - Meta Platforms, Inc.\nExpo (MIT License) - 650 Industries, Inc.\nReact (MIT License) - Meta Platforms, Inc.',
      },
      {
        title: 'Backend & Storage',
        content: 'Supabase JS (MIT License) - Supabase Inc.',
      },
      {
        title: 'Navigation',
        content: 'React Navigation (MIT License) - React Navigation Contributors\nReact Native Screens (MIT License) - Software Mansion',
      },
      {
        title: 'UI Components',
        content: 'Expo Vector Icons (MIT License)\nReact Native SVG (MIT License)\nExpo Image (MIT License)\nExpo Linear Gradient (MIT License)',
      },
      {
        title: 'Utilities',
        content: 'Async Storage (MIT License)\nYup (MIT License)\nZod (MIT License)\nUUID (MIT License)\nlibphonenumber-js (MIT License)',
      },
      {
        title: 'MIT License',
        content: 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software to deal in the Software without restriction, including the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.',
      },
    ],
  },
};

const LegalDocumentScreen: React.FC<LegalDocumentScreenProps> = ({
  navigation,
  route,
}) => {
  const { type } = route.params;
  const document = DOCUMENTS[type];

  const handleOpenFullDocument = () => {
    if (document.fullDocumentUrl) {
      Linking.openURL(document.fullDocumentUrl).catch((err) =>
        console.error('Failed to open URL:', err)
      );
    }
  };

  const handleContact = () => {
    Linking.openURL('mailto:fishlogco@gmail.com').catch((err) =>
      console.error('Failed to open email:', err)
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{document.title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Last Updated */}
          <View style={styles.metaCard}>
            <Feather name="calendar" size={16} color={colors.primary} />
            <Text style={styles.metaText}>
              Last Updated: {document.lastUpdated}
            </Text>
          </View>

          {/* Sections */}
          {document.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}

          {/* Full Document Link */}
          {document.fullDocumentUrl && (
            <TouchableOpacity
              style={styles.fullDocButton}
              onPress={handleOpenFullDocument}
              activeOpacity={0.7}
            >
              <Feather name="external-link" size={18} color={colors.primary} />
              <Text style={styles.fullDocButtonText}>
                View Full {document.title}
              </Text>
            </TouchableOpacity>
          )}

          {/* Contact Section */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Questions?</Text>
            <Text style={styles.contactText}>
              If you have questions about this {document.title.toLowerCase()}, please contact us.
            </Text>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContact}
              activeOpacity={0.7}
            >
              <Feather name="mail" size={16} color={colors.white} />
              <Text style={styles.contactButtonText}>Contact Us</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
    fontSize: 20,
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  metaText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  fullDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  fullDocButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  contactSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  contactTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  contactText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
});

export default LegalDocumentScreen;

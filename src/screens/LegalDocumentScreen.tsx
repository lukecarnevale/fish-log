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

// Document content configuration
const DOCUMENTS: Record<LegalDocumentType, {
  title: string;
  lastUpdated: string;
  sections: Array<{ title: string; content: string }>;
  fullDocumentUrl?: string;
}> = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'January 2025',
    fullDocumentUrl: undefined, // TODO: Add hosted URL
    sections: [
      {
        title: 'Information We Collect',
        content: 'We collect information you provide directly, including your name, email, phone number, profile photo, fishing license information, and catch data (species, locations, photos). We also collect device information and usage data automatically.',
      },
      {
        title: 'How We Use Your Information',
        content: 'We use your information to provide harvest reporting services to NC DMF, manage your account, administer the rewards program, display catches in the community feed, and improve our services.',
      },
      {
        title: 'Information Sharing',
        content: 'We share data with: Supabase (our database and storage provider), NC Division of Marine Fisheries (for harvest reporting), and other users (community feed posts, with your consent). We do not sell your personal information.',
      },
      {
        title: 'Your Rights',
        content: 'You have the right to access, correct, or delete your personal data. California residents have additional rights under CCPA. European users have rights under GDPR. Contact us to exercise these rights.',
      },
      {
        title: "Children's Privacy",
        content: 'This app is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.',
      },
      {
        title: 'Data Security',
        content: 'We implement encryption, access controls, and secure authentication to protect your data. However, no method of transmission or storage is 100% secure.',
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    lastUpdated: 'January 2025',
    fullDocumentUrl: undefined, // TODO: Add hosted URL
    sections: [
      {
        title: 'Agreement to Terms',
        content: 'By using Fish Log, you agree to these Terms of Use. You must be at least 13 years old to use this app. If you are under 18, a parent or guardian must agree on your behalf.',
      },
      {
        title: 'Account Responsibilities',
        content: 'You are responsible for maintaining the security of your account and for all activities under your account. You must provide accurate information and keep it updated.',
      },
      {
        title: 'Harvest Reporting',
        content: 'You are solely responsible for the accuracy of your harvest reports. This app assists with voluntary reporting but does not verify catch information or guarantee regulatory compliance. Always consult official NC DMF sources for current regulations.',
      },
      {
        title: 'Rewards Program',
        content: 'The quarterly rewards program is open to NC residents 18+. Entries are earned by submitting valid harvest reports. Winners are selected randomly and notified by email. We reserve the right to disqualify fraudulent entries.',
      },
      {
        title: 'User Content',
        content: 'You retain ownership of content you submit (photos, catch data). By submitting content, you grant us a license to display it in the app. Do not submit content that is false, illegal, offensive, or infringes on others\' rights.',
      },
      {
        title: 'Disclaimers',
        content: 'THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES. We do not guarantee uninterrupted service, accuracy of fishing information, or that the app is error-free. Use at your own risk.',
      },
      {
        title: 'Limitation of Liability',
        content: 'To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the app.',
      },
    ],
  },
  licenses: {
    title: 'Open Source Licenses',
    lastUpdated: 'January 2025',
    fullDocumentUrl: undefined, // TODO: Add hosted URL
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
    Linking.openURL('mailto:support@fishlog.app').catch((err) =>
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

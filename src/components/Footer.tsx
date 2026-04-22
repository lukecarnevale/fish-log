// components/Footer.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { APP_VERSION } from '../config/appConfig';
import { usePartners } from '../hooks/usePartners';
import { trackPartnerClick } from '../services/partnersService';
import { GhostFish, WaveTransition } from './icons/FooterIcons';
import { safeOpenURL } from '../utils/openURL';

interface FooterProps {
  onPrivacyPress?: () => void;
  onTermsPress?: () => void;
  onLicensesPress?: () => void;
  onContactPress?: () => void;
  onInfoPress?: () => void;
}

const Footer: React.FC<FooterProps> = ({
  onPrivacyPress,
  onTermsPress,
  onLicensesPress,
  onContactPress,
  onInfoPress,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { partners } = usePartners();

  const handlePartnerPress = (partnerId: string, url: string) => {
    trackPartnerClick(partnerId);
    safeOpenURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Wave transition from content to navy */}
      <WaveTransition />

      {/* Footer content on navy background */}
      <View style={styles.footerContent}>
        {/* Ghost fish decorations */}
        <GhostFish style={styles.fishLeft} width={80} height={50} />
        <GhostFish style={styles.fishRight} width={60} height={40} flip />

        {/* Partners Section - only render when there are active partners */}
        {partners.length > 0 && (
          <View style={styles.partnersSection}>
            <Text style={styles.partnersLabel}>Our Partners</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.partnersCarousel}
              scrollEventThrottle={16}
              decelerationRate="fast"
            >
              {partners.map((partner) => (
                <TouchableOpacity
                  key={partner.id}
                  style={styles.partnerCard}
                  onPress={() => handlePartnerPress(partner.id, partner.websiteUrl)}
                  activeOpacity={0.8}
                >
                  <View style={styles.partnerLogoContainer}>
                    <Image
                      source={{ uri: partner.iconUrl }}
                      style={styles.partnerLogo}
                      contentFit="contain"
                      cachePolicy="disk"
                      placeholder={require('../assets/icon.png')}
                      placeholderContentFit="contain"
                      transition={200}
                    />
                  </View>
                  <Text style={styles.partnerName} numberOfLines={2}>
                    {partner.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* App Branding */}
        <View style={styles.brandingSection}>
          <Text style={styles.appName}>Fish Log Co.</Text>
          <Text style={styles.appOrg}>Catch. Report. Win.</Text>
        </View>

        {/* Action Links */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionLink}
            onPress={onContactPress}
          >
            <Feather name="mail" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.actionText}>Contact Us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionLink} onPress={onInfoPress}>
            <Feather name="info" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.actionText}>Info</Text>
          </TouchableOpacity>
        </View>

        {/* Legal Section */}
        <View style={styles.legalSection}>
          <Text style={styles.copyright}>
            © {new Date().getFullYear()} Fish Log Co. All rights reserved.
          </Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={onPrivacyPress} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={onTermsPress} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={onLicensesPress} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Licenses</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.version}>Version {APP_VERSION}</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    // No background - wave handles the transition
  },

  // Wave
  waveContainer: {
    backgroundColor: theme.colors.background, // Light background above wave
    height: 35,
  },

  // Footer content area
  // Use primaryDark so the body matches WaveTransition's fill in both modes
  // and stays grounded — primary is too washed-out in dark mode for a large
  // surface like the footer.
  footerContent: {
    backgroundColor: theme.colors.primaryDark,
    paddingTop: 16,
    paddingBottom: 60, // Extended to cover safe area
    position: 'relative',
  },

  // Ghost fish
  fishLeft: {
    position: 'absolute',
    left: -15,
    bottom: 80,
    opacity: 0.08,
  },
  fishRight: {
    position: 'absolute',
    right: -10,
    bottom: 40,
    opacity: 0.06,
  },

  // Partners
  partnersSection: {
    marginBottom: 20,
  },
  partnersLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  partnersCarousel: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  partnerCard: {
    width: 80,
    // In light mode keep the white background brand logos expect.
    // In dark mode use an elevated surface so the cards don't look stark
    // against the navy footer.
    backgroundColor: theme.mode === 'dark' ? theme.colors.surfaceElevated : 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    paddingHorizontal: 8,
    marginRight: 10,
    alignItems: 'center',
    // Subtle border in dark mode for definition; transparent in light mode.
    borderWidth: theme.mode === 'dark' ? 1 : 0,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partnerLogoContainer: {
    width: 40,
    height: 40,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerLogo: {
    width: 36,
    height: 36,
    borderRadius: 4,
  },
  partnerName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },

  // Branding
  brandingSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    // Footer background is theme.colors.primaryDark in both modes; use
    // textOnPrimary (always white) so the brand name reads correctly
    // and avoids theme.colors.white, whose dark-mode alias is navy.
    color: theme.colors.textOnPrimary,
    marginBottom: 2,
  },
  appOrg: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  // Actions
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },

  // Legal
  legalSection: {
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  copyright: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 6,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLink: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  legalDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 8,
  },
  version: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
  },
});

export default React.memo(Footer);

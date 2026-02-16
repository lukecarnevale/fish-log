// components/Footer.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../styles/common';
import { APP_VERSION } from '../config/appConfig';
import { usePartners } from '../hooks/usePartners';
import { GhostFish, WaveTransition, FOOTER_BG } from './icons/FooterIcons';

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
  const { partners } = usePartners();

  const handlePartnerPress = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('An error occurred', err)
    );
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
                  onPress={() => handlePartnerPress(partner.websiteUrl)}
                  activeOpacity={0.8}
                >
                  <View style={styles.partnerLogoContainer}>
                    <Image
                      source={{ uri: partner.iconUrl }}
                      style={styles.partnerLogo}
                      resizeMode="contain"
                      defaultSource={require('../assets/icon.png')}
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

const styles = StyleSheet.create({
  container: {
    // No background - wave handles the transition
  },

  // Wave
  waveContainer: {
    backgroundColor: colors.background, // Light background above wave
    height: 35,
  },

  // Footer content area
  footerContent: {
    backgroundColor: FOOTER_BG,
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    paddingHorizontal: 8,
    marginRight: 10,
    alignItems: 'center',
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
    fontSize: 9,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 12,
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
    color: '#FFFFFF',
    marginBottom: 2,
  },
  appOrg: {
    fontSize: 10,
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
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 6,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLink: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
  },
  legalDot: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 8,
  },
  version: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
  },
});

export default Footer;

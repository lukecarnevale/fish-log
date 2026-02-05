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
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Ellipse } from 'react-native-svg';
import { colors } from '../styles/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Navy blue for footer background (matches app's base)
const FOOTER_BG = '#0B548B';

// Sponsor data (same as before)
const sponsors = [
  {
    id: 'seatow',
    name: 'Sea Tow',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSugeDjI5I1D2Jb_AA1IT2MtQmPVaFxMOqjpw&s',
    website: 'https://www.seatow.com',
  },
  {
    id: 'towboatus',
    name: 'TowBoatUS',
    icon: 'https://play-lh.googleusercontent.com/Rzmm-rbPNmiFM2r4Z7yBvCurvsFAkZ5IQTbsw8M_5n7Pmgk0VhDTUbiOlAgGnm6gO7rH',
    website: 'https://www.boatus.com/towing',
  },
  {
    id: 'qualifiedcaptain',
    name: 'The Qualified Captain',
    icon: 'https://thequalifiedcaptain.com/cdn/shop/files/TQC_Logo_TQC.png?v=1696538834&width=600',
    website: 'https://www.thequalifiedcaptain.com',
  },
  {
    id: 'ncwildlife',
    name: 'NC Wildlife',
    icon: 'https://upload.wikimedia.org/wikipedia/en/f/f3/Logo_of_the_North_Carolina_Wildlife_Resources_Commission.png',
    website: 'https://www.ncwildlife.org',
  },
  {
    id: 'biggersmarket',
    name: 'Biggers Market',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSS57_0_nBQ6DV4JkMHWk0-LiNg6m2w3p_-pg&s',
    website: 'https://www.biggersmarket.com',
  },
  {
    id: 'intracoastalangler',
    name: 'Intracoastal Angler',
    icon: 'https://cdn.shopify.com/s/files/1/0563/7124/9361/t/1/assets/IASO_P_White.png?v=1629906044',
    website: 'https://www.intracoastalangler.com',
  },
];

// Ghost fish decoration component
const GhostFish: React.FC<{
  style?: object;
  width?: number;
  height?: number;
  flip?: boolean;
}> = ({ style, width = 80, height = 50, flip = false }) => (
  <View style={[{ transform: [{ scaleX: flip ? -1 : 1 }] }, style]}>
    <Svg width={width} height={height} viewBox="0 0 80 50">
      <Ellipse cx="35" cy="25" rx="30" ry="14" fill="white" />
      <Path d="M63 25 Q80 12 74 25 Q80 38 63 25" fill="white" />
    </Svg>
  </View>
);

// Wave SVG component
const WaveTransition: React.FC = () => (
  <View style={styles.waveContainer}>
    <Svg
      width={SCREEN_WIDTH}
      height={35}
      viewBox={`0 0 ${SCREEN_WIDTH} 35`}
      preserveAspectRatio="none"
    >
      <Path
        d={`M0 0 Q${SCREEN_WIDTH * 0.1} 25 ${SCREEN_WIDTH * 0.2} 18 Q${SCREEN_WIDTH * 0.3} 11 ${SCREEN_WIDTH * 0.4} 20 Q${SCREEN_WIDTH * 0.5} 29 ${SCREEN_WIDTH * 0.6} 18 Q${SCREEN_WIDTH * 0.7} 7 ${SCREEN_WIDTH * 0.8} 16 Q${SCREEN_WIDTH * 0.9} 25 ${SCREEN_WIDTH} 15 L${SCREEN_WIDTH} 35 L0 35 Z`}
        fill={FOOTER_BG}
      />
    </Svg>
  </View>
);

interface FooterProps {
  onPrivacyPress?: () => void;
  onTermsPress?: () => void;
  onLicensesPress?: () => void;
}

const Footer: React.FC<FooterProps> = ({
  onPrivacyPress,
  onTermsPress,
  onLicensesPress,
}) => {
  const handleSponsorPress = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('An error occurred', err)
    );
  };

  const handleContactPress = () => {
    Linking.openURL('mailto:contact@ncfishreport.gov').catch((err) =>
      console.error('Could not open email app', err)
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

        {/* Partners Section - Scrollable Carousel */}
        <View style={styles.partnersSection}>
          <Text style={styles.partnersLabel}>Our Partners</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.partnersCarousel}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            {sponsors.map((sponsor) => (
              <TouchableOpacity
                key={sponsor.id}
                style={styles.partnerCard}
                onPress={() => handleSponsorPress(sponsor.website)}
                activeOpacity={0.8}
              >
                <View style={styles.partnerLogoContainer}>
                  <Image
                    source={{ uri: sponsor.icon }}
                    style={styles.partnerLogo}
                    resizeMode="contain"
                    defaultSource={require('../assets/icon.png')}
                  />
                </View>
                <Text style={styles.partnerName} numberOfLines={2}>
                  {sponsor.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* App Branding */}
        <View style={styles.brandingSection}>
          <Text style={styles.appName}>Fish Report</Text>
          <Text style={styles.appOrg}>Catch. Report. Win.</Text>
        </View>

        {/* Action Links */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionLink}
            onPress={handleContactPress}
          >
            <Feather name="mail" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.actionText}>Contact Us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionLink}>
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
          <Text style={styles.version}>Version 1.8.9</Text>
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

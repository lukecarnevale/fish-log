// components/Footer.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../styles/common';

// Sponsor data
const sponsors = [
  {
    id: 'seatow',
    name: 'Sea Tow',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSugeDjI5I1D2Jb_AA1IT2MtQmPVaFxMOqjpw&s', 
    website: 'https://www.seatow.com'
  },
  {
    id: 'towboatus',
    name: 'TowBoatUS',
    icon: 'https://play-lh.googleusercontent.com/Rzmm-rbPNmiFM2r4Z7yBvCurvsFAkZ5IQTbsw8M_5n7Pmgk0VhDTUbiOlAgGnm6gO7rH',
    website: 'https://www.boatus.com/towing'
  },
  {
    id: 'qualifiedcaptain',
    name: 'The Qualified Captain',
    icon: 'https://thequalifiedcaptain.com/cdn/shop/files/TQC_Logo_TQC.png?v=1696538834&width=600',
    website: 'https://www.thequalifiedcaptain.com'
  },
  {
    id: 'ncwildlife',
    name: 'NC Wildlife',
    icon: 'https://upload.wikimedia.org/wikipedia/en/f/f3/Logo_of_the_North_Carolina_Wildlife_Resources_Commission.png',
    website: 'https://www.ncwildlife.org'
  },
  {
    id: 'biggersmarket',
    name: 'Biggers Market',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSS57_0_nBQ6DV4JkMHWk0-LiNg6m2w3p_-pg&s',
    website: 'https://www.biggersmarket.com'
  },
  {
    id: 'intracoastalangler',
    name: 'Intracoastal Angler',
    icon: 'https://cdn.shopify.com/s/files/1/0563/7124/9361/t/1/assets/IASO_P_White.png?v=1629906044',
    website: 'https://www.intracoastalangler.com'
  }
];

const Footer = () => {
  const handleSponsorPress = (url: string) => {
    Linking.openURL(url).catch(err => console.error('An error occurred', err));
  };

  const handleContactPress = () => {
    Linking.openURL('mailto:contact@ncfishreport.gov').catch(err => 
      console.error('Could not open email app', err)
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      
      {/* Sponsors section - Simplified static version without auto-scrolling */}
      <Text style={styles.sectionTitle}>Our Partners</Text>
      <View style={styles.sponsorOuterContainer}>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sponsorScrollContainer}
          scrollEnabled={true}
          scrollEventThrottle={16}
          snapToAlignment="center"
          decelerationRate="fast"
        >
          <View style={styles.sponsorRow}>
            {sponsors.map((sponsor) => (
              <TouchableOpacity 
                key={sponsor.id}
                style={styles.sponsorItem}
                onPress={() => handleSponsorPress(sponsor.website)}
                activeOpacity={0.7}
              >
                <View style={styles.sponsorIconContainer}>
                  <Image 
                    source={{ uri: sponsor.icon }} 
                    style={styles.sponsorLogo}
                    resizeMode="contain"
                    defaultSource={require('../assets/icon.png')}
                  />
                </View>
                <Text style={styles.sponsorName}>
                  {sponsor.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      
      {/* Contact section */}
      <View style={styles.contactContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/adaptive-icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Fish Report</Text>
        </View>
        
        <View style={styles.contactInfo}>
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={handleContactPress}
          >
            <Feather name="mail" size={16} color={colors.primary} style={styles.contactIcon} />
            <Text style={styles.contactText}>Contact Us</Text>
          </TouchableOpacity>
          
          <View style={styles.contactItem}>
            <Feather name="info" size={16} color={colors.primary} style={styles.contactIcon} />
            <Text style={styles.contactText}>Version 1.8.2</Text>
          </View>
        </View>
      </View>
      
      {/* Copyright */}
      <Text style={styles.copyright}>
        © {new Date().getFullYear()} North Carolina Department of Environmental Quality.
        All rights reserved.
      </Text>
      
      {/* Legal links */}
      <View style={styles.legalLinks}>
        <TouchableOpacity>
          <Text style={styles.legalText}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.legalDivider}>•</Text>
        <TouchableOpacity>
          <Text style={styles.legalText}>Terms of Use</Text>
        </TouchableOpacity>
        <Text style={styles.legalDivider}>•</Text>
        <TouchableOpacity>
          <Text style={styles.legalText}>Licenses</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    marginBottom: -1, // Prevent any potential gap at the bottom
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  sponsorOuterContainer: {
    marginBottom: spacing.lg,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  sponsorScrollContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  sponsorRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sponsorItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'column',
    alignItems: 'center',
    width: 140, // Slightly narrower for better fit
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sponsorIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 4, 
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    padding: 2,
  },
  sponsorLogo: {
    width: 52,
    height: 52,
    borderRadius: 3,
  },
  sponsorName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flexWrap: 'wrap',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    width: '100%',
  },
  contactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: spacing.xs,
    borderRadius: 18,
    overflow: 'hidden',
  },
  appName: {
    ...typography.heading,
    color: colors.primary,
    fontSize: 18,
  },
  contactInfo: {
    alignItems: 'flex-end',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  contactIcon: {
    marginRight: spacing.xs,
  },
  contactText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  copyright: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  legalText: {
    ...typography.caption,
    color: colors.primary,
    marginHorizontal: spacing.xs,
  },
  legalDivider: {
    ...typography.caption,
    color: colors.textTertiary,
    marginHorizontal: 2,
  },
});

export default Footer;
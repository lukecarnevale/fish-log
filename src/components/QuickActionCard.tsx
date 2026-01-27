// components/QuickActionCard.tsx
//
// Cash App-inspired quick action card with custom fish illustrations.

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ImageSourcePropType,
  ImageStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface QuickActionCardProps {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  image: ImageSourcePropType;
  imageStyle?: ImageStyle;
  onPress: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  subtitle,
  subtitleColor,
  image,
  imageStyle,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, subtitleColor && { color: subtitleColor }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Feather
        name="chevron-right"
        size={16}
        color="#CCC"
        style={styles.chevron}
      />
      <View style={styles.imageContainer}>
        <Image source={image} style={[styles.image, imageStyle]} resizeMode="contain" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    height: 170,
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 3,
  },
  textContainer: {
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  chevron: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '85%',
  },
});

export default QuickActionCard;

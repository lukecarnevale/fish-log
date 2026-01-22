// components/PrizesComponent.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { colors } from '../styles/common';
import styles from '../styles/prizeComponentStyles';
import { RootStackParamList } from '../types';
import { Prize, PrizeDrawing } from '../types/prizes';
import { activePrizeDrawing, sampleUserEntry } from '../data/prizesData';

type PrizesComponentNavigationProp = StackNavigationProp<RootStackParamList>;

interface PrizesComponentProps {
  onReportPress?: () => void;
}

const PrizesComponent: React.FC<PrizesComponentProps> = ({ onReportPress }) => {
  const navigation = useNavigation<PrizesComponentNavigationProp>();
  
  const [prizeDrawing, setPrizeDrawing] = useState<PrizeDrawing>(activePrizeDrawing);
  const [userEntryCount, setUserEntryCount] = useState<number>(0);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  
  // Load user's entry count from AsyncStorage
  useEffect(() => {
    const loadUserEntries = async () => {
      try {
        // In a real app, this would be based on actual catch reports
        // For now, we'll use the sample data or a stored value
        const storedEntries = await AsyncStorage.getItem('prizeEntryCount');
        if (storedEntries) {
          setUserEntryCount(parseInt(storedEntries, 10));
        } else {
          // Use sample data as fallback
          setUserEntryCount(sampleUserEntry.drawings[0].entriesCount);
        }
      } catch (error) {
        console.error("Error loading prize entries:", error);
      }
    };
    
    loadUserEntries();
  }, []);
  
  // Calculate days remaining until drawing
  const getDaysRemaining = (): number => {
    const today = new Date();
    
    // Parse the date string correctly with time set to midnight
    const drawingDateStr = prizeDrawing.drawingDate; // Format: '2026-01-01'
    const [year, month, day] = drawingDateStr.split('-').map(num => parseInt(num, 10));
    
    // JavaScript months are 0-indexed (0=Jan, 11=Dec)
    const drawingDate = new Date(year, month - 1, day);
    
    // Calculate difference in milliseconds
    const timeDiff = drawingDate.getTime() - today.getTime();
    
    // Convert to days and round up
    return Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  };
  
  const daysRemaining = getDaysRemaining();
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Handle the "Report Catch" button press
  const handleReportPress = () => {
    if (onReportPress) {
      onReportPress();
    } else {
      navigation.navigate('ReportForm');
    }
  };
  
  // Calculate progress percentage for progress bar based on time elapsed in raffle period
  const calcProgressPercentage = () => {
    const today = new Date();
    const [startYear, startMonth, startDay] = prizeDrawing.startDate.split('-').map(num => parseInt(num, 10));
    const [endYear, endMonth, endDay] = prizeDrawing.drawingDate.split('-').map(num => parseInt(num, 10));

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();

    // Return percentage of time elapsed (0-100)
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };
  
  // Render individual prize item in the carousel
  const renderPrizeItem = ({ item }: { item: Prize }) => (
    <View style={styles.prizeCard}>
      <View style={styles.prizeImage}>
        <Feather 
          name={getPrizeIcon(item.category)} 
          size={40} 
          color={colors.primary}
          style={{ alignSelf: 'center', marginTop: 24 }}
        />
      </View>
      <View style={styles.prizeContent}>
        <Text style={styles.prizeName}>{item.name}</Text>
        <Text style={styles.prizeValue}>Value: {item.value}</Text>
      </View>
    </View>
  );
  
  // Get icon name based on prize category
  const getPrizeIcon = (category: Prize['category']): string => {
    switch (category) {
      case 'license':
        return 'credit-card';
      case 'gear':
        return 'anchor';
      case 'apparel':
        return 'shopping-bag';
      case 'experience':
        return 'compass';
      default:
        return 'gift';
    }
  };
  
  // Render the prizes modal
  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <Text style={styles.modalHeader}>{prizeDrawing.name}</Text>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalText}>{prizeDrawing.description}</Text>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Raffle Period</Text>
              <Text style={styles.modalText}>
                Start: {formatDate(prizeDrawing.startDate)}
              </Text>
              <Text style={styles.modalText}>
                End: {formatDate(prizeDrawing.endDate)}
              </Text>
              <Text style={styles.modalText}>
                Drawing Date: {formatDate(prizeDrawing.drawingDate)}
              </Text>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Prize List</Text>
              <View style={styles.modalPrizeList}>
                {prizeDrawing.prizes.map((prize, index) => (
                  <View key={prize.id} style={styles.modalPrizeItem}>
                    <Feather 
                      name={getPrizeIcon(prize.category)} 
                      size={20} 
                      color={colors.primary} 
                      style={styles.modalPrizeIcon} 
                    />
                    <Text style={styles.modalPrizeText}>
                      {prize.name} ({prize.value})
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Eligibility Requirements</Text>
              {prizeDrawing.eligibilityRequirements.map((requirement, index) => (
                <Text key={index} style={styles.modalText}>
                  • {requirement}
                </Text>
              ))}
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Your Entries</Text>
              <Text style={styles.modalText}>
                You currently have {userEntryCount} {userEntryCount === 1 ? 'entry' : 'entries'} in this drawing.
              </Text>
              <Text style={styles.modalText}>
                Each verified catch report counts as one entry into the drawing. The more reports you submit, the better your chances to win!
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <View style={styles.container}>
      {/* Header with background image */}
      <ImageBackground
        source={require('../assets/fish-logo.png')} // Use a fishing/trophy image as background
        style={styles.headerContainer}
        resizeMode="cover"
      >
        <View style={styles.headerOverlay} />
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{prizeDrawing.name}</Text>
            <Text style={styles.headerSubtitle}>Win amazing prizes for your catches!</Text>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} until drawing
            </Text>
          </View>
        </View>
      </ImageBackground>

      {/* Raffle time progress bar (no text) */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${calcProgressPercentage()}%` }
            ]}
          />
        </View>
      </View>

      {/* Info section */}
      <View style={styles.infoContainer}>
        <TouchableOpacity 
          style={styles.infoRow}
          onPress={() => setShowDetailsModal(true)}
        >
          <View style={styles.infoIcon}>
            <Feather name="info" size={18} color={colors.primary} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>How It Works</Text>
            <Text style={styles.infoText}>
              Each fish report you submit counts as one entry. More entries = better chance to win!
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Feather name="calendar" size={18} color={colors.primary} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Drawing Date</Text>
            <Text style={styles.infoText}>
              The winners will be selected on {formatDate(prizeDrawing.drawingDate)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Featured prizes carousel */}
      <View style={styles.carouselContainer}>
        <Text style={styles.carouselTitle}>Featured Prizes</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          scrollEnabled={true}
          directionalLockEnabled={true}
          alwaysBounceHorizontal={true}
        >
          {prizeDrawing.prizes.map((prize) => (
            <View key={prize.id} style={styles.prizeCard}>
              <View style={styles.prizeImage}>
                <Feather 
                  name={getPrizeIcon(prize.category)} 
                  size={40} 
                  color={colors.primary}
                  style={{ alignSelf: 'center', marginTop: 24 }}
                />
              </View>
              <View style={styles.prizeContent}>
                <Text style={styles.prizeName}>{prize.name}</Text>
                <Text style={styles.prizeValue}>Value: {prize.value}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
      
      {/* Info bubble - clickable to navigate to Profile */}
      <TouchableOpacity 
        style={styles.infoBubble}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.8}
      >
        <Feather 
          name="bell" 
          size={20} 
          color={colors.white} 
          style={styles.infoBubbleIcon} 
        />
        <Text style={styles.infoBubbleText}>
          Winners will be notified via email. Make sure your account info is up to date!
        </Text>
        <Feather 
          name="chevron-right" 
          size={18} 
          color={colors.white}
          style={{opacity: 0.8}}
        />
      </TouchableOpacity>
      
      {/* Footer with call to action */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Report your catches to earn more entries!
        </Text>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={handleReportPress}
        >
          <Feather name="file-plus" size={16} color={colors.white} />
          <Text style={styles.reportButtonText}>Report Catch</Text>
        </TouchableOpacity>
      </View>
      
      {/* Details modal */}
      {renderDetailsModal()}
    </View>
  );
};

export default PrizesComponent;
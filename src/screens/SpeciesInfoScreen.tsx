// screens/SpeciesInfoScreen.tsx

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  ListRenderItem,
  Animated,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { EnhancedFishSpecies } from "../types/fishSpecies";
import { useAllFishSpecies } from "../api/speciesApi";
import styles from "../styles/enhancedSpeciesStyles";
import { Feather } from "@expo/vector-icons";
import { colors } from "../styles/common";
import ScreenLayout from "../components/ScreenLayout";
import { SCREEN_LABELS } from "../constants/screenLabels";
import { SpeciesListBulletinIndicator } from "../components/SpeciesListBulletinIndicator";
import { SpeciesDetailBulletinBanner } from "../components/SpeciesDetailBulletinBanner";
import { useSpeciesAlerts } from "../contexts/SpeciesAlertsContext";
import { useBulletinsForSpecies } from "../api/speciesBulletinApi";
import SpeciesFilterChips from "../components/SpeciesFilterChips";

type SpeciesInfoScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SpeciesInfo"
>;

type SpeciesInfoScreenRouteProp = RouteProp<RootStackParamList, "SpeciesInfo">;

interface SpeciesInfoScreenProps {
  navigation: SpeciesInfoScreenNavigationProp;
  route: SpeciesInfoScreenRouteProp;
}

// Skeleton loader for species cards
const SkeletonCard: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.speciesCard}>
      <View style={styles.imageContainer}>
        <Animated.View
          style={[
            styles.imageWrapper,
            {
              backgroundColor: '#E0E0E0',
              opacity: pulseAnim,
            },
          ]}
        />
      </View>
      <View style={styles.speciesBasicInfo}>
        <Animated.View
          style={{
            height: 18,
            width: '70%',
            backgroundColor: '#E0E0E0',
            borderRadius: 4,
            marginBottom: 8,
            opacity: pulseAnim,
          }}
        />
        <Animated.View
          style={{
            height: 14,
            width: '50%',
            backgroundColor: '#E0E0E0',
            borderRadius: 4,
            marginBottom: 8,
            opacity: pulseAnim,
          }}
        />
        <Animated.View
          style={{
            height: 12,
            width: '90%',
            backgroundColor: '#E0E0E0',
            borderRadius: 4,
            marginBottom: 12,
            opacity: pulseAnim,
          }}
        />
        {/* Season dots skeleton */}
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#E0E0E0',
                marginRight: 4,
                opacity: pulseAnim,
              }}
            />
          ))}
        </View>
        {/* Regulation badges skeleton */}
        <View style={{ flexDirection: 'row' }}>
          <Animated.View
            style={{
              height: 20,
              width: 60,
              backgroundColor: '#E0E0E0',
              borderRadius: 4,
              marginRight: 8,
              opacity: pulseAnim,
            }}
          />
          <Animated.View
            style={{
              height: 20,
              width: 50,
              backgroundColor: '#E0E0E0',
              borderRadius: 4,
              opacity: pulseAnim,
            }}
          />
        </View>
      </View>
    </View>
  );
};

// Species that require mandatory harvest reporting
const HARVEST_TRACKED_SPECIES = [
  'Red Drum',
  'Southern Flounder',
  'Spotted Seatrout',
  'Striped Bass',
  'Weakfish',
];

// Alphabet for the A-Z scroll component
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const SpeciesInfoScreen: React.FC<SpeciesInfoScreenProps> = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSpecies, setSelectedSpecies] = useState<EnhancedFishSpecies | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [showTrackedOnly, setShowTrackedOnly] = useState<boolean>(
    route.params?.showRequiredOnly ?? false
  );
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get("window");
  const flatListRef = useRef<FlatList<EnhancedFishSpecies>>(null);

  // Species alert seen-tracking (stops badge pulsing after user taps)
  const { markSpeciesAlertSeen } = useSpeciesAlerts();

  // Fetch bulletins for the selected species (only when it has an active status change)
  const { data: speciesBulletins = [] } = useBulletinsForSpecies(
    selectedSpecies?.harvestStatus !== 'open' ? selectedSpecies?.id ?? null : null
  );

  // Filter dropdown state — defaults off, activated by route param on each navigation
  const [showUpdatesOnly, setShowUpdatesOnly] = useState<boolean>(false);
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);

  // Sync filters to route params on every navigation (handles re-entry correctly)
  useEffect(() => {
    const fromBadge = route.params?.fromAlertBadge ?? false;
    setShowUpdatesOnly(fromBadge);
    setFiltersExpanded(fromBadge);
  }, [route.params?.fromAlertBadge]);

  // Animation for detail view
  const detailAnim = useRef(new Animated.Value(0)).current;

  // Handle selecting a species with animation
  const handleSelectSpecies = (species: EnhancedFishSpecies) => {
    setSelectedSpecies(species);
    setCurrentImageIndex(0);
    detailAnim.setValue(0);
    Animated.spring(detailAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();

    // Mark species alerts as seen (stops badge pulsing)
    markSpeciesAlertSeen(species.id);
  };

  // Handle closing detail view with animation
  const handleCloseDetail = useCallback(() => {
    Animated.timing(detailAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedSpecies(null);
    });
  }, [detailAnim]);

  // Intercept back navigation when viewing species detail
  // This prevents swipe-back from going to HomeScreen instead of back to list
  useEffect(() => {
    if (!selectedSpecies) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default back behavior
      e.preventDefault();
      // Close detail view instead
      handleCloseDetail();
    });

    return unsubscribe;
  }, [navigation, selectedSpecies, handleCloseDetail]);

  // Fetch fish species from Supabase
  const { data: fishSpeciesData = [], isLoading, error } = useAllFishSpecies();

  // Filter species based on search query and tracked filter, then sort alphabetically
  // Count species with active updates (from unfiltered data for badge)
  const speciesWithUpdatesCount = fishSpeciesData.filter(
    s => s.harvestStatus !== 'open'
  ).length;

  const filteredSpecies = fishSpeciesData
    .filter((species) => {
      // Check updates filter
      if (showUpdatesOnly && species.harvestStatus === 'open') {
        return false;
      }
      // Check tracked filter
      if (showTrackedOnly && !HARVEST_TRACKED_SPECIES.includes(species.name)) {
        return false;
      }

      // Then check search query
      if (searchQuery === "") return true;

      const query = searchQuery.toLowerCase();
      return (
        species.name.toLowerCase().includes(query) ||
        species.scientificName.toLowerCase().includes(query) ||
        (species.commonNames &&
          species.commonNames.some((name) =>
            name.toLowerCase().includes(query)
          ))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Get available letters from filtered species
  const availableLetters = new Set(
    filteredSpecies.map((species) => species.name.charAt(0).toUpperCase())
  );

  // Ref to hold latest filteredSpecies for PanResponder (avoids stale closures)
  const filteredSpeciesRef = useRef(filteredSpecies);
  filteredSpeciesRef.current = filteredSpecies;

  // State for the active letter being touched
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const alphabetContainerRef = useRef<View>(null);
  const alphabetLayoutRef = useRef<{ y: number; height: number }>({ y: 0, height: 0 });

  // Use ref to store latest available letters for PanResponder (avoids stale closure)
  const availableLettersRef = useRef(availableLetters);
  availableLettersRef.current = availableLetters;

  // Get letter from Y position within the alphabet container
  const getLetterFromY = (pageY: number) => {
    const { y, height } = alphabetLayoutRef.current;
    const relativeY = pageY - y;
    const letterHeight = height / ALPHABET.length;
    const index = Math.floor(relativeY / letterHeight);

    if (index >= 0 && index < ALPHABET.length) {
      return ALPHABET[index];
    }
    return null;
  };

  // Handle alphabet layout measurement
  const onAlphabetLayout = useCallback((_event: LayoutChangeEvent) => {
    alphabetContainerRef.current?.measureInWindow((_x, y, _width, height) => {
      alphabetLayoutRef.current = { y, height };
    });
  }, []);

  // Handle touch/pan on alphabet sidebar - uses refs to get latest values
  const handleAlphabetTouch = (pageY: number) => {
    const letter = getLetterFromY(pageY);
    if (letter) {
      setActiveLetter(letter);

      // Only scroll if letter has species
      if (availableLettersRef.current.has(letter)) {
        const index = filteredSpeciesRef.current.findIndex(
          (species) => species.name.charAt(0).toUpperCase() === letter
        );
        if (index !== -1 && flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index,
            animated: false, // Immediate for smooth scrubbing
            viewPosition: 0,
          });
        }
      }
    }
  };

  // PanResponder for alphabet sidebar
  const alphabetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        handleAlphabetTouch(evt.nativeEvent.pageY);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handleAlphabetTouch(evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        setActiveLetter(null);
      },
      onPanResponderTerminate: () => {
        setActiveLetter(null);
      },
    })
  ).current;

  // Render fish species item in the list
  const renderSpeciesItem: ListRenderItem<EnhancedFishSpecies> = ({ item }) => {
    const isRequiredSpecies = HARVEST_TRACKED_SPECIES.includes(item.name);
    const isUpdatedSpecies = item.harvestStatus !== 'open';

    const cardBorderStyle =
      isRequiredSpecies && isUpdatedSpecies ? localStyles.requiredAndUpdatedCard
      : isRequiredSpecies ? localStyles.requiredSpeciesCard
      : isUpdatedSpecies ? localStyles.updatedSpeciesCard
      : undefined;

    return (
    <TouchableOpacity
      style={[
        styles.speciesCard,
        cardBorderStyle,
      ]}
      onPress={() => handleSelectSpecies(item)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          {item.images && item.images.primary && item.images.primary.length > 0 ? (
            <Image
              source={{ uri: item.images.primary }}
              style={styles.speciesImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImageContainer}>
              <Image 
                source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfeCxIPFR/9TNibAAAEzklEQVRo3u2ZW0hUQRjHf3vUI5pk27YVlSWUERFFF6JWsizsQRS9h70EPfRWDz1EQRF090IPUhFJQaRpRPdITLOkNM1S2qJM19XS2s35evhmd0/n7Dln95y1Ivz2ZWdn5vt/MzPf981cFDLLBAp6zDJUUcBCiimgCPBRQh9qmUUB9CMVZCT5NhrZRTHmqGIOpZznBRrQRqLXKSLRF6FzgRzDuecxgyruo4HuOF0DnYmeoJDLtP0zHQRwl/nkM5kxZKMyjAVs4RrvoXeS9xFdA5c9y9XTQbCQCRRQxH5eQpAj5AOVtPcQH6CKGWR21N8gO3KU0xD0hqt6iL/KDtJRRupd5FXRjxWcpS7Cq+Y0FcwXDrSYU+LwbuD4y4xGZaRRy0aW6yYfZCcqKbgTawt+0sSzJPHvsJSt7kYHKGMrL2mmnWbquGCqZUzpvKKVVlqYj+JOBA2/1+vSrKzK8VWrM01Y09E+atzS6YBsG1OWZnx2rvuSsrIrWWvHUO3Ct8yBuYbDSdFVlgirXuTCtyGEv+ZAhVF6n6To/uaVA2dA+C1xYRZQlSRdFw8dOFqoBcdxYDZTnxTdM1o5J6zQI/wWGgHYa3YkQXeN0S6sF5H+WcZDYCSVtjtNm8sZmHDcn4sBGhNofkU32VB5TBtP+cpkChkHKAymHRk/Wy4qN7nBW1ppm2CsaFEOi5LQQV/4rYpw2WQ4c5nKSMrZyidB101ql8Jz82kH00UKjM8f0eONLqP4xjb+SkSWYYBxjdgwhQmUMImxFDGCPH5HGh50xRfwJg+vHnkP6cDnIh/CiNUo3LGWY8JqOl9Y8SjWcFhYocd6LgQRnozSLbUwVoWS+rrIbqwBrEGixe3CeW2RjJ4ZX+nnuCdwE5jBIW6FtukDFUSXjO7Fdb5zlhKT/pKnhK2eQ3WTrcNhDyT+/IQGCJv1i0oKAHZwhrO0R/pneDKrLrscYgGfNpB6pnOVl9xgJhMoZYGXXLBJ8Uw1aFNtoTFgH2VoQDsTGOUoFzhJK97ZTDHrOAUE0cLjZyxRDUDjO02ii+2U4EtGBx36BocVy5hlvLS1WELrUHSdMzT8YXK9YJRRTnmBxlvepHLrDvALNJ5EtI8k3X+BMtZw1ArGYWHXSwzgBS9TOPGQKbPPTBXD6Mdt2imPsGOE2Wa8O48y5tJAA400k2enMxwrHQywh0P0YQtPQ52zTLItfBIHGMhdrllG+LlpZgEW4GO03UyTY5TLwsZ9nKWPwg3mhL9fPbA3tBY+7jMKlaHZiAEMtdJ9CbTiC5vAT16zm8Ee0CfHTGcPUCHK2Ik1UD0e2BGNvS5YsIe0Rx3dAEUstB5zcZDnXKfe0Nz0QB44xCg7gHQUlOxNp/nOajZRAFTxMol0UBKMKGOTsRtaKcHlKxGy11jOLp6HeozpIeB9SzFXN9ARZW6s5wkDuRCZGvyf6cAlxH0GGMM2wCOaQ4OBJFClcBCdh6xnBDnkxsQKIuWPU4q3NzLZQRMBmlnj2hJkpgqmcpBnvBGn0HWbTTGtVKIXVhNQ9nCXcLO1wXzrB9bTmTlk00/4dB8KcA9sKkr4P7KF4Gj5Ykr19gBtBOH98mDMAAAAAElFTkSuQmCC' }}
                style={styles.placeholderImage}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
        
        {/* Conservation status badge for threatened species - now positioned over the image */}
        {item.conservationStatus !== "Least Concern" && (
          <View style={[
            styles.statusBadge,
            {backgroundColor: item.conservationStatus === "Near Threatened" ? colors.warning : colors.danger}
          ]}>
            <Text style={styles.statusText}>{item.conservationStatus}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.speciesBasicInfo}>
        <Text style={styles.speciesName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
        <Text style={styles.speciesScientific}>{item.scientificName}</Text>
        <Text style={styles.speciesBrief} numberOfLines={1}>
          {item.description.substring(0, 60)}...
        </Text>
        
        {/* Season indicators */}
        <View style={styles.seasonIndicator}>
          <View style={[styles.seasonDot, item.seasons.spring ? styles.seasonActive : styles.seasonInactive]} />
          <View style={[styles.seasonDot, item.seasons.summer ? styles.seasonActive : styles.seasonInactive]} />
          <View style={[styles.seasonDot, item.seasons.fall ? styles.seasonActive : styles.seasonInactive]} />
          <View style={[styles.seasonDot, item.seasons.winter ? styles.seasonActive : styles.seasonInactive]} />
          <Text style={styles.seasonText}>
            {getActiveSeasons(item.seasons)}
          </Text>
        </View>
        
        {/* Regulation indicators */}
        {formatCompactRegulations(item.regulations)}

        {/* Bulletin indicators (closures, advisories) — reads directly from species data */}
        {item.harvestStatus !== 'open' && (
          <View style={{ marginTop: 4 }}>
            <SpeciesListBulletinIndicator harvestStatus={item.harvestStatus} showLabels />
          </View>
        )}

        <Text style={styles.tapPrompt}>Tap for more info</Text>
      </View>
    </TouchableOpacity>
    );
  };

  // Get text representation of active seasons
  const getActiveSeasons = (seasons: { spring: boolean; summer: boolean; fall: boolean; winter: boolean }): string => {
    const activeSeasons = [];
    if (seasons.spring) activeSeasons.push("Spring");
    if (seasons.summer) activeSeasons.push("Summer");
    if (seasons.fall) activeSeasons.push("Fall");
    if (seasons.winter) activeSeasons.push("Winter");
    
    if (activeSeasons.length === 4) return "Year-round";
    return activeSeasons.join(", ");
  };
  
  // Format compact size limit for list view
  const formatCompactSizeLimit = (sizeLimit: any): string => {
    if (!sizeLimit) return "";
    
    if (sizeLimit.min && sizeLimit.max) {
      return `${sizeLimit.min}-${sizeLimit.max}${sizeLimit.unit}`;
    } else if (sizeLimit.min) {
      return `Min: ${sizeLimit.min}${sizeLimit.unit}`;
    } else if (sizeLimit.max) {
      return `Max: ${sizeLimit.max}${sizeLimit.unit}`;
    }
    
    return "No limit";
  };
  
  // Format compact regulations for list view
  const formatCompactRegulations = (regulations: any): React.ReactElement => {
    return (
      <View style={styles.cardRegulationsContainer}>
        {/* Bag limit */}
        {regulations.bagLimit !== null && (
          <View style={styles.cardRegulationItem}>
            <Feather name="package" size={12} color={colors.primary} style={styles.cardRegulationIcon} />
            <Text style={styles.cardRegulationText}>
              {regulations.bagLimit === 0 ? "Catch & release only" : `${regulations.bagLimit}/day`}
            </Text>
          </View>
        )}
        
        {/* Size limit */}
        {(regulations.sizeLimit.min !== null || regulations.sizeLimit.max !== null) && (
          <View style={styles.cardRegulationItem}>
            <Feather name="maximize-2" size={12} color={colors.primary} style={styles.cardRegulationIcon} />
            <Text style={styles.cardRegulationText}>
              {formatCompactSizeLimit(regulations.sizeLimit)}
            </Text>
          </View>
        )}
        
        {/* Season indicator */}
        {regulations.openSeasons && regulations.openSeasons.length > 0 && (
          <View style={styles.cardRegulationItem}>
            <Feather name="calendar" size={12} color={colors.primary} style={styles.cardRegulationIcon} />
            <Text style={styles.cardRegulationText}>Seasonal</Text>
          </View>
        )}
      </View>
    );
  };
  
  // Render the image gallery in detail view
  const renderImageGallery = () => {
    if (!selectedSpecies) return null;
    
    const images = [
      selectedSpecies.images.primary,
      ...selectedSpecies.images.additional
    ];
    
    return (
      <View>
        <Animated.FlatList
          data={images}
          keyExtractor={(_, index) => `image-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setCurrentImageIndex(index);
          }}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={[styles.galleryImage, { width: screenWidth }]}
              resizeMode="cover"
            />
          )}
        />
        
        {/* Pagination dots */}
        <View style={styles.paginationDots}>
          {images.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.paginationDot,
                currentImageIndex === index && styles.paginationActiveDot
              ]}
            />
          ))}
        </View>
      </View>
    );
  };
  
  // Format size limit for display
  const formatSizeLimit = (min: number | null, max: number | null, unit: string): string => {
    if (min && max) return `${min}-${max} ${unit} (slot limit)`;
    if (min) return `Min ${min} ${unit}`;
    if (max) return `Max ${max} ${unit}`;
    return "No size limit";
  };
  
  // Format open seasons for display
  const formatOpenSeasons = (seasons: { from: string, to: string }[] | null): string => {
    if (!seasons || seasons.length === 0) return "Open year-round";
    
    return seasons.map(season => {
      const fromDate = new Date(`2000-${season.from}`);
      const toDate = new Date(`2000-${season.to}`);
      
      const fromMonth = fromDate.toLocaleString('default', { month: 'short' });
      const toMonth = toDate.toLocaleString('default', { month: 'short' });
      
      const fromDay = fromDate.getDate();
      const toDay = toDate.getDate();
      
      return `${fromMonth} ${fromDay} - ${toMonth} ${toDay}`;
    }).join(", ");
  };
  
  // Format harvest status date for display
  const formatStatusDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Render regulations section
  const renderRegulations = () => {
    if (!selectedSpecies) return null;

    const { regulations } = selectedSpecies;
    const isClosed = selectedSpecies.harvestStatus === 'closed';
    const isRestricted = selectedSpecies.harvestStatus === 'restricted' || selectedSpecies.harvestStatus === 'catch_and_release';

    return (
      <View style={styles.regulationsBox}>
        <Text style={styles.regulationsTitle}>Fishing Regulations</Text>

        {/* Harvest closure card — prominent, inside the regulations section */}
        {isClosed && (
          <View style={closureStyles.closureCard}>
            <Feather name="alert-octagon" size={24} color={colors.white} />
            <View style={closureStyles.closureContent}>
              <Text style={closureStyles.closureTitle}>HARVEST CLOSED</Text>
              {selectedSpecies.harvestStatusNote && (
                <Text style={closureStyles.closureNote}>
                  {selectedSpecies.harvestStatusNote}
                </Text>
              )}
              {selectedSpecies.harvestStatusExpirationDate && (
                <Text style={closureStyles.closureDate}>
                  Until {formatStatusDate(selectedSpecies.harvestStatusExpirationDate)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Harvest restriction card */}
        {isRestricted && (
          <View style={closureStyles.restrictionCard}>
            <Feather name="alert-triangle" size={24} color={colors.white} />
            <View style={closureStyles.closureContent}>
              <Text style={closureStyles.closureTitle}>
                {selectedSpecies.harvestStatus === 'catch_and_release'
                  ? 'CATCH & RELEASE ONLY'
                  : 'HARVEST RESTRICTED'}
              </Text>
              {selectedSpecies.harvestStatusNote && (
                <Text style={closureStyles.closureNote}>
                  {selectedSpecies.harvestStatusNote}
                </Text>
              )}
              {selectedSpecies.harvestStatusExpirationDate && (
                <Text style={closureStyles.closureDate}>
                  Until {formatStatusDate(selectedSpecies.harvestStatusExpirationDate)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Standard regulation rows (dimmed if closed to signal they're superseded) */}
        <View style={isClosed ? { opacity: 0.5 } : undefined}>
          <View style={styles.regulationRow}>
            <Feather name="maximize-2" size={24} color={colors.primary} style={styles.regulationIcon} />
            <Text style={styles.regulationLabel}>Size Limit:</Text>
            <Text style={styles.regulationValue}>
              {formatSizeLimit(
                regulations.sizeLimit.min,
                regulations.sizeLimit.max,
                regulations.sizeLimit.unit
              )}
            </Text>
          </View>

          <View style={styles.regulationRow}>
            <Feather name="package" size={24} color={colors.primary} style={styles.regulationIcon} />
            <Text style={styles.regulationLabel}>Bag Limit:</Text>
            <Text style={styles.regulationValue}>
              {regulations.bagLimit
                ? `${regulations.bagLimit} fish per person per day`
                : "No bag limit"}
            </Text>
          </View>

          <View style={styles.regulationRow}>
            <Feather name="calendar" size={24} color={colors.primary} style={styles.regulationIcon} />
            <Text style={styles.regulationLabel}>Season:</Text>
            <Text style={styles.regulationValue}>
              {formatOpenSeasons(regulations.openSeasons)}
            </Text>
          </View>

          {regulations.specialRegulations && regulations.specialRegulations.length > 0 && (
            <Text style={styles.regulationsNotes}>
              {regulations.specialRegulations.join("\n")}
            </Text>
          )}
        </View>

        <Text style={styles.regulationsFooter}>
          Always check current regulations at ncwildlife.org before fishing
        </Text>
      </View>
    );
  };
  
  // Render fishing tips section
  const renderFishingTips = () => {
    if (!selectedSpecies || !selectedSpecies.fishingTips) return null;
    
    const { fishingTips } = selectedSpecies;
    
    return (
      <View>
        <Text style={styles.sectionTitle}>Fishing Tips</Text>
        
        <View style={styles.tipCategory}>
          <Text style={styles.tipCategoryTitle}>Best Techniques</Text>
          <View style={styles.tipsList}>
            {fishingTips.techniques.map((technique, index) => (
              <View key={`technique-${index}`} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{technique}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.tipCategory}>
          <Text style={styles.tipCategoryTitle}>Recommended Baits</Text>
          <View style={styles.tipsList}>
            {fishingTips.baits.map((bait, index) => (
              <View key={`bait-${index}`} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{bait}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.tipCategory}>
          <Text style={styles.tipCategoryTitle}>Suggested Equipment</Text>
          <View style={styles.tipsList}>
            {fishingTips.equipment.map((equipment, index) => (
              <View key={`equipment-${index}`} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{equipment}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.tipCategory}>
          <Text style={styles.tipCategoryTitle}>Best Locations</Text>
          <View style={styles.tipsList}>
            {fishingTips.locations.map((location, index) => (
              <View key={`location-${index}`} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{location}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation interpolations for detail view
  const detailTranslateY = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const detailOpacity = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // When a species is selected, show the detail view
  if (selectedSpecies) {
    return (
      <ScreenLayout
        navigation={{ goBack: handleCloseDetail }}
        title={selectedSpecies.name}
        subtitle={selectedSpecies.scientificName}
        scrollViewRef={scrollViewRef}
      >
        <Animated.View
          style={{
            flex: 1,
            opacity: detailOpacity,
            transform: [{ translateY: detailTranslateY }],
          }}
        >
          {/* Image gallery */}
          <View style={styles.imageGallery}>
            {renderImageGallery()}
          </View>

          <View style={styles.detailInfo}>
          {/* Bulletin banner (closures, advisories) — fetched via lightweight hook */}
          <SpeciesDetailBulletinBanner
            bulletins={speciesBulletins}
          />

          <Text style={styles.detailName}>{selectedSpecies.name}</Text>
          <Text style={styles.detailScientific}>
            {selectedSpecies.scientificName}
          </Text>

          {selectedSpecies.commonNames && selectedSpecies.commonNames.length > 0 && (
            <Text style={styles.commonNames}>
              Also known as: {selectedSpecies.commonNames.join(", ")}
            </Text>
          )}

          <View style={styles.detailsRow}>
            <View style={styles.detailsColumn}>
              <Text style={styles.detailsLabel}>Type</Text>
              <Text style={styles.detailsValue}>
                {selectedSpecies.categories.type.join(", ")}
              </Text>
            </View>

            <View style={styles.detailsColumn}>
              <Text style={styles.detailsLabel}>Max Size</Text>
              <Text style={styles.detailsValue}>{selectedSpecies.maxSize}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionText}>
            {selectedSpecies.description}
          </Text>

          <Text style={styles.sectionTitle}>Identification</Text>
          <Text style={styles.sectionText}>{selectedSpecies.identification}</Text>

          <Text style={styles.sectionTitle}>Habitat & Distribution</Text>
          <Text style={styles.sectionText}>{selectedSpecies.habitat}</Text>
          <Text style={styles.sectionText}>{selectedSpecies.distribution}</Text>

          {/* Regulations section */}
          {renderRegulations()}

          {/* Conservation status */}
          <View style={[
            styles.conservationStatus,
            {
              backgroundColor:
                selectedSpecies.conservationStatus === "Least Concern" ? colors.lightestGray :
                selectedSpecies.conservationStatus === "Near Threatened" ? colors.warningLight :
                colors.dangerLight
            }
          ]}>
            <Feather
              name={selectedSpecies.conservationStatus === "Least Concern" ? "check-circle" : "alert-circle"}
              size={24}
              color={
                selectedSpecies.conservationStatus === "Least Concern" ? colors.success :
                selectedSpecies.conservationStatus === "Near Threatened" ? colors.warning :
                colors.danger
              }
            />
            <Text style={styles.statusDescription}>
              Conservation Status: <Text style={{fontWeight: 'bold'}}>{selectedSpecies.conservationStatus}</Text>
            </Text>
          </View>

          {/* Fishing tips section */}
          {renderFishingTips()}

          {/* Report button - only show for mandatory harvest report species */}
          {HARVEST_TRACKED_SPECIES.includes(selectedSpecies.name) && (
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => {
                handleCloseDetail();
                navigation.navigate("ReportForm");
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.reportButtonText}>
                Report Catching This Species
              </Text>
            </TouchableOpacity>
          )}
        </View>
        </Animated.View>
      </ScreenLayout>
    );
  }

  // List view of all species
  return (
    <ScreenLayout
      navigation={navigation}
      title={SCREEN_LABELS.speciesGuide.title}
      subtitle="Find and learn about North Carolina's fish species"
      noScroll
    >
      <View style={localStyles.container}>
        {/* Floating sticky search bar with collapsible filter dropdown */}
        <View style={localStyles.floatingSearchContainer}>
          <View style={localStyles.searchRow}>
            <TextInput
              style={[styles.searchInput, localStyles.searchInput, localStyles.searchInputFlex]}
              placeholder="Search by name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            <TouchableOpacity
              style={[
                localStyles.filtersToggleButton,
                (showTrackedOnly || showUpdatesOnly) && localStyles.filtersToggleActive,
              ]}
              onPress={() => setFiltersExpanded(!filtersExpanded)}
              activeOpacity={0.7}
            >
              <Feather name="filter" size={16} color={colors.primary} />
              <Text style={localStyles.filtersToggleText}>Filters</Text>
              <Feather
                name={filtersExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
          <SpeciesFilterChips
            filters={[
              {
                key: 'required',
                label: 'Required',
                icon: 'file-text',
                isActive: showTrackedOnly,
                onToggle: () => setShowTrackedOnly(!showTrackedOnly),
                color: '#00897B',
              },
              {
                key: 'updates',
                label: 'Updates',
                icon: 'alert-circle',
                isActive: showUpdatesOnly,
                onToggle: () => setShowUpdatesOnly(!showUpdatesOnly),
                count: speciesWithUpdatesCount,
                color: colors.accent,
              },
            ]}
            isExpanded={filtersExpanded}
          />
        </View>

        {/* Species list - scrolls under the search bar */}
        {isLoading ? (
          <FlatList
            data={[1, 2, 3, 4, 5]}
            renderItem={() => <SkeletonCard />}
            keyExtractor={(item) => `skeleton-${item}`}
            contentContainerStyle={localStyles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={localStyles.listWithAlphabetContainer}>
            <FlatList
              ref={flatListRef}
              data={filteredSpecies}
              renderItem={renderSpeciesItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={localStyles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  {error ? (
                    <Text style={styles.emptyText}>
                      Unable to load species data. Please check your connection.
                    </Text>
                  ) : (
                    <Text style={styles.emptyText}>
                      No species found matching your search.
                    </Text>
                  )}
                </View>
              }
            />

            {/* A-Z Scroll Sidebar */}
            {filteredSpecies.length > 0 && (
              <View
                style={localStyles.alphabetSidebar}
                {...alphabetPanResponder.panHandlers}
              >
                <View
                  ref={alphabetContainerRef}
                  style={localStyles.alphabetSidebarInner}
                  onLayout={onAlphabetLayout}
                >
                  {ALPHABET.map((letter) => {
                    const isAvailable = availableLetters.has(letter);
                    const isActive = activeLetter === letter;
                    return (
                      <View
                        key={letter}
                        style={localStyles.alphabetLetterContainer}
                      >
                        <Text
                          style={[
                            localStyles.alphabetLetter,
                            !isAvailable && localStyles.alphabetLetterDisabled,
                            isActive && localStyles.alphabetLetterActive,
                          ]}
                        >
                          {letter}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Active letter indicator bubble */}
            {activeLetter && (
              <View style={localStyles.letterBubble}>
                <Text style={localStyles.letterBubbleText}>{activeLetter}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScreenLayout>
  );
};

// Local styles for floating search bar
const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingSearchContainer: {
    position: 'absolute',
    top: -24, // Pull up to float between header and content
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchInputFlex: {
    flex: 1,
  },
  filtersToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  filtersToggleActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filtersToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  requiredSpeciesCard: {
    borderWidth: 2,
    borderColor: '#00897B',
  },
  updatedSpeciesCard: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  requiredAndUpdatedCard: {
    borderWidth: 2,
    borderTopColor: '#00897B',
    borderLeftColor: '#00897B',
    borderBottomColor: colors.accent,
    borderRightColor: colors.accent,
  },
  listContent: {
    paddingTop: 84, // Space for floating search bar + filter dropdown
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingRight: 32, // Extra space for alphabet sidebar
  },
  listWithAlphabetContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  alphabetSidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  alphabetSidebarInner: {
    backgroundColor: 'rgba(227, 242, 253, 0.95)', // Light blue to match content area
    borderRadius: 9,
    paddingVertical: 4,
    alignItems: 'center',
  },
  alphabetLetterContainer: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  alphabetLetter: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
  },
  alphabetLetterDisabled: {
    color: colors.lightGray,
    opacity: 0.5,
  },
  alphabetLetterActive: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    textAlign: 'center',
    lineHeight: 16,
    overflow: 'hidden',
  },
  letterBubble: {
    position: 'absolute',
    right: 40,
    top: '45%',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  letterBubbleText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
});

// Styles for harvest closure / restriction cards within regulations section
const closureStyles = StyleSheet.create({
  closureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  restrictionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  closureContent: {
    flex: 1,
  },
  closureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  closureNote: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    lineHeight: 18,
  },
  closureDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default SpeciesInfoScreen;
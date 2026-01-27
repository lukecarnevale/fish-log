// screens/SpeciesInfoScreen.tsx

import React, { useState, useRef } from "react";
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
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { EnhancedFishSpecies } from "../types/fishSpecies";
import { useAllFishSpecies } from "../api/speciesApi";
import styles from "../styles/enhancedSpeciesStyles";
import { Feather } from "@expo/vector-icons";
import { colors } from "../styles/common";
import ScreenLayout from "../components/ScreenLayout";
import { SCREEN_LABELS } from "../constants/screenLabels";

type SpeciesInfoScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SpeciesInfo"
>;

interface SpeciesInfoScreenProps {
  navigation: SpeciesInfoScreenNavigationProp;
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

const SpeciesInfoScreen: React.FC<SpeciesInfoScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSpecies, setSelectedSpecies] = useState<EnhancedFishSpecies | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get("window");

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
  };

  // Handle closing detail view with animation
  const handleCloseDetail = () => {
    Animated.timing(detailAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedSpecies(null);
    });
  };

  // Fetch fish species from Supabase
  const { data: fishSpeciesData = [], isLoading, error } = useAllFishSpecies();

  // Filter species based on search query
  const filteredSpecies = fishSpeciesData.filter((species) => {
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
  });

  // Render fish species item in the list
  const renderSpeciesItem: ListRenderItem<EnhancedFishSpecies> = ({ item }) => (
    <TouchableOpacity
      style={styles.speciesCard}
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
        
        <Text style={styles.tapPrompt}>Tap for more info</Text>
      </View>
    </TouchableOpacity>
  );
  
  // Get text representation of active seasons
  const getActiveSeasons = (seasons: any): string => {
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
  
  // Render regulations section
  const renderRegulations = () => {
    if (!selectedSpecies) return null;
    
    const { regulations } = selectedSpecies;
    
    return (
      <View style={styles.regulationsBox}>
        <Text style={styles.regulationsTitle}>Fishing Regulations</Text>
        
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
          {['Red Drum', 'Southern Flounder', 'Spotted Seatrout', 'Striped Bass', 'Weakfish'].includes(selectedSpecies.name) && (
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
      <View style={styles.searchFilterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          renderItem={() => <SkeletonCard />}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredSpecies}
          renderItem={renderSpeciesItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
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
      )}
    </ScreenLayout>
  );
};

export default SpeciesInfoScreen;
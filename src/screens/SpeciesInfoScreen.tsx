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
  Modal,
  Dimensions,
  ListRenderItem,
  Animated,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { EnhancedFishSpecies } from "../types/fishSpecies";
import fishSpeciesData from "../data/fishSpeciesData";
import styles from "../styles/enhancedSpeciesStyles";
import { Feather } from "@expo/vector-icons";
import { colors } from "../styles/common";
import ScreenLayout from "../components/ScreenLayout";

type SpeciesInfoScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SpeciesInfo"
>;

interface SpeciesInfoScreenProps {
  navigation: SpeciesInfoScreenNavigationProp;
}

// Filter options
type FilterType = "all" | "freshwater" | "saltwater" | "brackish";
type SeasonFilter = "all" | "spring" | "summer" | "fall" | "winter";

const SpeciesInfoScreen: React.FC<SpeciesInfoScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSpecies, setSelectedSpecies] = useState<EnhancedFishSpecies | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>("all");
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [showRegulations, setShowRegulations] = useState<boolean>(true);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get("window");

  // Filter species based on search query and filters
  const filteredSpecies = fishSpeciesData.filter((species) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      species.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      species.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (species.commonNames &&
        species.commonNames.some((name) =>
          name.toLowerCase().includes(searchQuery.toLowerCase())
        ));

    // Type filter
    const matchesType =
      typeFilter === "all" ||
      (species.categories &&
        species.categories.type &&
        species.categories.type.some(
          (type) => type.toLowerCase() === typeFilter.toLowerCase()
        ));

    // Season filter
    const matchesSeason =
      seasonFilter === "all" ||
      (species.seasons && species.seasons[seasonFilter as keyof typeof species.seasons]);

    return matchesSearch && matchesType && matchesSeason;
  });

  // Render fish species item in the list
  const renderSpeciesItem: ListRenderItem<EnhancedFishSpecies> = ({ item }) => (
    <TouchableOpacity
      style={styles.speciesCard}
      onPress={() => setSelectedSpecies(item)}
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
        {showRegulations && formatCompactRegulations(item.regulations)}
        
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
  const formatCompactRegulations = (regulations: any): JSX.Element => {
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
  
  // Render similar species section
  const renderSimilarSpecies = () => {
    if (!selectedSpecies || !selectedSpecies.similarSpecies) return null;
    
    return (
      <View>
        <Text style={styles.sectionTitle}>Similar Species</Text>
        
        {selectedSpecies.similarSpecies.map((similar) => {
          const similarSpecies = fishSpeciesData.find(s => s.id === similar.id);
          return (
            <TouchableOpacity
              key={similar.id}
              style={styles.similarSpeciesCard}
              onPress={() => {
                if (similarSpecies) {
                  // Reset the current image index
                  setCurrentImageIndex(0);
                  
                  // Update the selected species with a forced refresh approach
                  setSelectedSpecies(null);
                  
                  // Use a short timeout to ensure the state updates in sequence
                  setTimeout(() => {
                    setSelectedSpecies(similarSpecies);
                    
                    // Scroll back to top after a short delay to ensure content is rendered
                    setTimeout(() => {
                      if (scrollViewRef.current) {
                        scrollViewRef.current.scrollTo({ y: 0, animated: true });
                      }
                    }, 150);
                  }, 50);
                }
              }}
            >
              {similarSpecies && (
                <Image
                  source={{ uri: similarSpecies.images.primary }}
                  style={styles.similarSpeciesImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.similarSpeciesInfo}>
                <Text style={styles.similarSpeciesName}>{similar.name}</Text>
                <Text style={styles.similarSpeciesFeatures}>
                  {similar.differentiatingFeatures}
                </Text>
              </View>
              <View style={styles.chevronContainer}>
                <Feather name="chevron-right" size={24} color={colors.white} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };
  
  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Species</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Feather name="x" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Water Type</Text>
            <View style={styles.filterOptionRow}>
              {["all", "freshwater", "saltwater", "brackish"].map((type) => (
                <TouchableOpacity
                  key={`type-${type}`}
                  style={[
                    styles.filterOption,
                    typeFilter === type && styles.filterOptionSelected
                  ]}
                  onPress={() => setTypeFilter(type as FilterType)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      typeFilter === type && styles.filterOptionSelectedText
                    ]}
                  >
                    {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Season</Text>
            <View style={styles.filterOptionRow}>
              {["all", "spring", "summer", "fall", "winter"].map((season) => (
                <TouchableOpacity
                  key={`season-${season}`}
                  style={[
                    styles.filterOption,
                    seasonFilter === season && styles.filterOptionSelected
                  ]}
                  onPress={() => setSeasonFilter(season as SeasonFilter)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      seasonFilter === season && styles.filterOptionSelectedText
                    ]}
                  >
                    {season === "all" ? "All Seasons" : season.charAt(0).toUpperCase() + season.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.resetFiltersButton}
            onPress={() => {
              setTypeFilter("all");
              setSeasonFilter("all");
            }}
          >
            <Text style={styles.resetFiltersText}>Reset All Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // When a species is selected, show the detail view
  if (selectedSpecies) {
    return (
      <ScreenLayout
        navigation={{ goBack: () => setSelectedSpecies(null) }}
        title={selectedSpecies.name}
        subtitle={selectedSpecies.scientificName}
        scrollViewRef={scrollViewRef}
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

          {/* Similar species section */}
          {renderSimilarSpecies()}

          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => {
              setSelectedSpecies(null);
              navigation.navigate("ReportForm");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.reportButtonText}>
              Report Catching This Species
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // List view of all species
  return (
    <ScreenLayout
      navigation={navigation}
      title="Fish Species Guide"
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

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Feather name="filter" size={16} color={colors.textPrimary} />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                typeFilter === "all" && styles.filterActiveButton
              ]}
              onPress={() => setTypeFilter("all")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  typeFilter === "all" && styles.filterActiveText
                ]}
              >
                All Types
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                typeFilter === "freshwater" && styles.filterActiveButton
              ]}
              onPress={() => setTypeFilter("freshwater")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  typeFilter === "freshwater" && styles.filterActiveText
                ]}
              >
                Freshwater
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                typeFilter === "saltwater" && styles.filterActiveButton
              ]}
              onPress={() => setTypeFilter("saltwater")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  typeFilter === "saltwater" && styles.filterActiveText
                ]}
              >
                Saltwater
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                showRegulations && styles.filterActiveButton
              ]}
              onPress={() => setShowRegulations(!showRegulations)}
            >
              <Feather
                name="clipboard"
                size={16}
                color={showRegulations ? colors.white : colors.textPrimary}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  showRegulations && styles.filterActiveText
                ]}
              >
                Regs
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
        >
          <TouchableOpacity
            style={[
              styles.categoryTab,
              seasonFilter === "all" && styles.categoryActiveTab
            ]}
            onPress={() => setSeasonFilter("all")}
          >
            <Text
              style={[
                styles.categoryTabText,
                seasonFilter === "all" && styles.categoryActiveTabText
              ]}
            >
              All Seasons
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryTab,
              seasonFilter === "spring" && styles.categoryActiveTab
            ]}
            onPress={() => setSeasonFilter("spring")}
          >
            <Text
              style={[
                styles.categoryTabText,
                seasonFilter === "spring" && styles.categoryActiveTabText
              ]}
            >
              Spring
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryTab,
              seasonFilter === "summer" && styles.categoryActiveTab
            ]}
            onPress={() => setSeasonFilter("summer")}
          >
            <Text
              style={[
                styles.categoryTabText,
                seasonFilter === "summer" && styles.categoryActiveTabText
              ]}
            >
              Summer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryTab,
              seasonFilter === "fall" && styles.categoryActiveTab
            ]}
            onPress={() => setSeasonFilter("fall")}
          >
            <Text
              style={[
                styles.categoryTabText,
                seasonFilter === "fall" && styles.categoryActiveTabText
              ]}
            >
              Fall
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryTab,
              seasonFilter === "winter" && styles.categoryActiveTab
            ]}
            onPress={() => setSeasonFilter("winter")}
          >
            <Text
              style={[
                styles.categoryTabText,
                seasonFilter === "winter" && styles.categoryActiveTabText
              ]}
            >
              Winter
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filteredSpecies}
        renderItem={renderSpeciesItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No species found matching your search.
            </Text>
          </View>
        }
      />

      {renderFilterModal()}
    </ScreenLayout>
  );
};

export default SpeciesInfoScreen;
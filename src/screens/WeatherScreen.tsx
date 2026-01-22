// screens/WeatherScreen.tsx

import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { Feather } from "@expo/vector-icons";
import { RootStackParamList } from "../types";
import {
  WeatherData,
  WeatherLocation,
  WeatherCondition,
  ForecastItem,
  TideEvent,
  MarineWarning,
} from "../types/weather";
import styles from "../styles/weatherScreenStyles";
import { colors } from "../styles/common";
import { sampleWeatherData, savedLocations } from "../data/weatherData";
import AsyncStorage from "@react-native-async-storage/async-storage";

type WeatherScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Weather"
>;

interface WeatherScreenProps {
  navigation: WeatherScreenNavigationProp;
}

const WeatherScreen: React.FC<WeatherScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation>(savedLocations[0]);
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load weather data for selected location
  useEffect(() => {
    loadWeatherData();
  }, [selectedLocation]);

  // Load user's last selected location from storage
  useEffect(() => {
    const loadLastLocation = async () => {
      try {
        const locationId = await AsyncStorage.getItem("lastWeatherLocation");
        if (locationId) {
          const location = savedLocations.find(loc => loc.id === locationId);
          if (location) {
            setSelectedLocation(location);
          }
        }
      } catch (error) {
        console.error("Failed to load last location:", error);
      }
    };

    loadLastLocation();
  }, []);

  const loadWeatherData = async () => {
    setLoading(true);
    setError(null);

    try {
      // In a real app, you would fetch data from a weather API here
      // For now, we'll use sample data
      setTimeout(() => {
        setWeatherData({
          ...sampleWeatherData,
          location: selectedLocation,
          lastUpdated: new Date().toISOString()
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error loading weather data:", error);
      setError("Failed to load weather data. Please try again.");
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWeatherData().finally(() => setRefreshing(false));
  };

  const handleLocationSelect = async (location: WeatherLocation) => {
    setSelectedLocation(location);
    setShowLocationPicker(false);
    
    // Save selected location to AsyncStorage
    try {
      await AsyncStorage.setItem("lastWeatherLocation", location.id);
    } catch (error) {
      console.error("Failed to save location preference:", error);
    }
  };

  // Format date and time helpers
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatDay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Render weather icon based on condition
  const renderWeatherIcon = (icon: string, size: 'small' | 'medium' | 'large' = 'medium') => {
    const iconSizes = {
      small: { width: 28, height: 28 },
      medium: { width: 36, height: 36 },
      large: { width: 64, height: 64 }
    };

    // Use Feather icons as placeholders instead of image files
    let iconName = "sun";
    
    switch (icon) {
      case 'clear-day':
        iconName = "sun";
        break;
      case 'clear-night':
        iconName = "moon";
        break;
      case 'partly-cloudy-day':
        iconName = "cloud";
        break;
      case 'partly-cloudy-night':
        iconName = "cloud";
        break;
      case 'cloudy':
        iconName = "cloud";
        break;
      case 'rain':
        iconName = "cloud-rain";
        break;
      case 'snow':
        iconName = "cloud-snow";
        break;
      case 'wind':
        iconName = "wind";
        break;
      case 'fog':
        iconName = "cloud";
        break;
      case 'thunderstorm':
        iconName = "cloud-lightning";
        break;
      default:
        iconName = "cloud";
    }

    return (
      <View style={{ 
        justifyContent: 'center', 
        alignItems: 'center',
        width: iconSizes[size].width, 
        height: iconSizes[size].height 
      }}>
        <Feather 
          name={iconName} 
          size={size === 'large' ? 48 : size === 'medium' ? 32 : 24} 
          color={icon.includes('night') ? colors.textSecondary : colors.primary} 
        />
      </View>
    );
  };

  // Render a single hourly forecast item
  const renderHourlyItem = ({ item }: { item: WeatherCondition }) => {
    const time = new Date(item.timestamp);
    const now = new Date();
    let timeText = "";
    
    if (time.getDate() === now.getDate()) {
      if (time.getHours() === now.getHours()) {
        timeText = "Now";
      } else {
        timeText = time.toLocaleTimeString([], { hour: 'numeric' });
      }
    } else {
      timeText = "Tomorrow";
    }

    return (
      <View style={styles.hourlyForecastItem}>
        <Text style={styles.hourlyForecastTime}>{timeText}</Text>
        {renderWeatherIcon(item.icon, 'small')}
        <Text style={styles.hourlyForecastTemperature}>{Math.round(item.temperature)}°</Text>
        {item.precipitation > 0 && (
          <Text style={styles.hourlyForecastPrecip}>{item.precipitation}%</Text>
        )}
      </View>
    );
  };

  // Render a single daily forecast item
  const renderForecastItem = ({ item }: { item: ForecastItem }) => (
    <View style={styles.forecastItem}>
      <Text style={styles.forecastDay}>{item.dayOfWeek}</Text>
      <View style={styles.forecastIconContainer}>
        {renderWeatherIcon(item.icon)}
      </View>
      <View style={styles.forecastDetails}>
        <Text style={styles.forecastDescription}>{item.description}</Text>
      </View>
      <Text style={styles.forecastTemp}>{item.high}° / {item.low}°</Text>
    </View>
  );

  // Render tide data
  const renderTides = () => {
    if (!weatherData?.tides || weatherData.tides.events.length === 0) {
      return null;
    }

    const formatTideTime = (timeString: string) => {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    return (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tides</Text>
        </View>
        
        <View style={styles.tideContainer}>
          <View style={styles.tideHeader}>
            <Text style={styles.tideTitle}>Tide Chart</Text>
            <Text style={styles.tideStation}>{weatherData.tides.station}</Text>
          </View>
          
          <View style={styles.tideEvents}>
            {weatherData.tides.events.map((event: TideEvent, index: number) => (
              <View key={index} style={styles.tideEvent}>
                <Text style={styles.tideEventType}>
                  {event.type === 'high' ? 'High Tide' : 'Low Tide'}
                </Text>
                <Text style={styles.tideEventTime}>{formatTideTime(event.time)}</Text>
                <Text style={styles.tideEventHeight}>{event.height.toFixed(1)} ft</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Render marine warnings
  const renderWarnings = () => {
    if (!weatherData?.marineWarnings || weatherData.marineWarnings.length === 0) {
      return null;
    }

    return (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Marine Advisories</Text>
        </View>
        
        {weatherData.marineWarnings.map((warning: MarineWarning, index: number) => (
          <View key={index} style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Feather 
                name="alert-triangle" 
                size={20} 
                color={colors.warning} 
                style={styles.warningIcon} 
              />
              <Text style={styles.warningTitle}>{warning.title}</Text>
              <Text style={styles.warningSeverity}>
                {warning.severity.toUpperCase()}
              </Text>
            </View>
            
            <Text style={styles.warningText}>{warning.description}</Text>
            
            <Text style={styles.warningMeta}>
              Affected areas: {warning.affectedAreas.join(', ')}
            </Text>
            <Text style={styles.warningMeta}>
              Expires: {new Date(warning.expiresTime).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Render location picker modal
  const renderLocationPicker = () => (
    <Modal
      visible={showLocationPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLocationPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLocationPicker(false)}
            >
              <Feather name="x" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView>
            {savedLocations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationItem,
                  selectedLocation.id === location.id && styles.locationItemSelected
                ]}
                onPress={() => handleLocationSelect(location)}
              >
                <Feather 
                  name={location.isCoastal ? "anchor" : "map"} 
                  size={20} 
                  color={colors.primary} 
                  style={{ marginRight: 12 }} 
                />
                <Text style={styles.locationItemText}>{location.name}</Text>
                {selectedLocation.id === location.id && (
                  <Feather name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.addLocationButton}
              onPress={() => {
                setShowLocationPicker(false);
                Alert.alert(
                  "Custom Location",
                  "Adding custom locations will be available in a future update."
                );
              }}
            >
              <Feather name="plus-circle" size={20} color={colors.primary} />
              <Text style={styles.addLocationText}>Add Custom Location</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (loading && !weatherData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weather & Tides</Text>
          <Text style={styles.headerSubtitle}>
            Check conditions before heading out
          </Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, color: colors.textSecondary }}>
            Loading weather data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weather & Tides</Text>
          <Text style={styles.headerSubtitle}>
            Check conditions before heading out
          </Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Feather name="cloud-off" size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={loadWeatherData}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main render with weather data
  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weather & Tides</Text>
          <Text style={styles.headerSubtitle}>
            Check conditions before heading out
          </Text>
        </View>

        {/* Location selector */}
        <TouchableOpacity
          style={styles.locationSelector}
          onPress={() => setShowLocationPicker(true)}
        >
          <Feather name="map-pin" size={20} color={colors.primary} />
          <Text style={styles.locationText}>{selectedLocation.name}</Text>
          <Feather
            name="chevron-down"
            size={20}
            color={colors.primary}
            style={styles.dropdownIcon}
          />
        </TouchableOpacity>

        {/* Current weather */}
        <View style={styles.currentWeatherCard}>
          <View style={styles.currentWeatherHeader}>
            <Text style={styles.temperature}>
              {Math.round(weatherData?.current.temperature || 0)}°
            </Text>
            {renderWeatherIcon(weatherData?.current.icon || 'cloudy', 'large')}
          </View>
          
          <Text style={styles.weatherDescription}>
            {weatherData?.current.description}
            {weatherData?.current.feelsLike && weatherData?.current.feelsLike !== weatherData?.current.temperature && 
              ` · Feels like ${Math.round(weatherData?.current.feelsLike)}°`
            }
          </Text>
          
          <View style={styles.weatherDetailsGrid}>
            <View style={styles.weatherDetailItem}>
              <Feather name="wind" size={20} color={colors.textSecondary} style={styles.weatherDetailIcon} />
              <Text style={styles.weatherDetailText}>
                {weatherData?.current.windSpeed} mph {weatherData?.current.windDirection}
              </Text>
            </View>
            
            <View style={styles.weatherDetailItem}>
              <Feather name="droplet" size={20} color={colors.textSecondary} style={styles.weatherDetailIcon} />
              <Text style={styles.weatherDetailText}>
                {weatherData?.current.humidity}% humidity
              </Text>
            </View>
            
            <View style={styles.weatherDetailItem}>
              <Feather name="sun" size={20} color={colors.textSecondary} style={styles.weatherDetailIcon} />
              <Text style={styles.weatherDetailText}>
                UV Index: {weatherData?.current.uvIndex}
              </Text>
            </View>
            
            <View style={styles.weatherDetailItem}>
              <Feather name="cloud-rain" size={20} color={colors.textSecondary} style={styles.weatherDetailIcon} />
              <Text style={styles.weatherDetailText}>
                {weatherData?.current.precipitation}% chance of rain
              </Text>
            </View>
          </View>
        </View>

        {/* Hourly forecast */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hourly Forecast</Text>
          <Text style={styles.refreshText}>
            Updated: {new Date(weatherData?.lastUpdated || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <View style={styles.hourlyForecastContainer}>
          <FlatList
            data={weatherData?.hourlyForecast || []}
            renderItem={renderHourlyItem}
            keyExtractor={(item, index) => `hourly-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hourlyForecastList}
          />
        </View>

        {/* 5-day forecast */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>5-Day Forecast</Text>
        </View>
        
        <View style={styles.forecastCard}>
          {weatherData?.dailyForecast.map((item, index) => (
            <View key={`forecast-${index}`}>
              {renderForecastItem({ item })}
            </View>
          ))}
        </View>

        {/* Tides */}
        {selectedLocation.isCoastal && renderTides()}

        {/* Marine warnings */}
        {selectedLocation.isCoastal && renderWarnings()}
      </ScrollView>

      {/* Location picker modal */}
      {renderLocationPicker()}
    </SafeAreaView>
  );
};

export default WeatherScreen;
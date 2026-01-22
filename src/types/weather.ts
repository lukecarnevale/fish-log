// types/weather.ts

export interface WeatherCondition {
  timestamp: string;
  temperature: number;
  feelsLike: number;
  icon: string;
  description: string;
  windSpeed: number;
  windDirection: string;
  humidity: number;
  uvIndex: number;
  precipitation: number;
  pressure: number;
}

export interface ForecastItem {
  date: string;
  dayOfWeek: string;
  high: number;
  low: number;
  icon: string;
  description: string;
  precipitation: number;
  windSpeed: number;
}

export interface TideInfo {
  station: string;
  events: TideEvent[];
}

export interface TideEvent {
  time: string;
  height: number;
  type: 'high' | 'low';
}

export interface MarineWarning {
  id: string;
  title: string;
  severity: 'advisory' | 'watch' | 'warning';
  issuedTime: string;
  expiresTime: string;
  description: string;
  affectedAreas: string[];
}

export interface WeatherLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  isCoastal: boolean;
}

export interface WeatherData {
  location: WeatherLocation;
  current: WeatherCondition;
  hourlyForecast: WeatherCondition[];
  dailyForecast: ForecastItem[];
  tides?: TideInfo;
  marineWarnings: MarineWarning[];
  lastUpdated: string;
}
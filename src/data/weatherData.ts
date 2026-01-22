// data/weatherData.ts
import { WeatherData, WeatherLocation } from '../types/weather';

// Saved locations that users might want to check
export const savedLocations: WeatherLocation[] = [
  {
    id: 'outer_banks',
    name: 'Outer Banks',
    lat: 35.2246,
    lon: -75.6903,
    isCoastal: true
  },
  {
    id: 'wrightsville_beach',
    name: 'Wrightsville Beach',
    lat: 34.2085,
    lon: -77.7960,
    isCoastal: true
  },
  {
    id: 'lake_norman',
    name: 'Lake Norman',
    lat: 35.4865,
    lon: -80.9532,
    isCoastal: false
  },
  {
    id: 'cape_fear',
    name: 'Cape Fear',
    lat: 33.8433,
    lon: -77.9583,
    isCoastal: true
  },
  {
    id: 'jordan_lake',
    name: 'Jordan Lake',
    lat: 35.7365,
    lon: -79.0169,
    isCoastal: false
  }
];

// Sample weather data for demo purposes
export const sampleWeatherData: WeatherData = {
  location: savedLocations[0], // Outer Banks
  current: {
    timestamp: new Date().toISOString(),
    temperature: 76,
    feelsLike: 78,
    icon: 'partly-cloudy-day',
    description: 'Partly Cloudy',
    windSpeed: 12,
    windDirection: 'ESE',
    humidity: 65,
    uvIndex: 7,
    precipitation: 0,
    pressure: 1012
  },
  hourlyForecast: [
    {
      timestamp: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      temperature: 77,
      feelsLike: 79,
      icon: 'partly-cloudy-day',
      description: 'Partly Cloudy',
      windSpeed: 13,
      windDirection: 'ESE',
      humidity: 67,
      uvIndex: 7,
      precipitation: 0,
      pressure: 1012
    },
    {
      timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      temperature: 78,
      feelsLike: 80,
      icon: 'partly-cloudy-day',
      description: 'Partly Cloudy',
      windSpeed: 14,
      windDirection: 'ESE',
      humidity: 68,
      uvIndex: 6,
      precipitation: 10,
      pressure: 1011
    },
    {
      timestamp: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      temperature: 79,
      feelsLike: 81,
      icon: 'cloudy',
      description: 'Mostly Cloudy',
      windSpeed: 15,
      windDirection: 'SE',
      humidity: 70,
      uvIndex: 5,
      precipitation: 20,
      pressure: 1010
    },
    {
      timestamp: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      temperature: 77,
      feelsLike: 79,
      icon: 'rain',
      description: 'Light Rain',
      windSpeed: 14,
      windDirection: 'SE',
      humidity: 75,
      uvIndex: 4,
      precipitation: 40,
      pressure: 1009
    },
    {
      timestamp: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      temperature: 75,
      feelsLike: 77,
      icon: 'rain',
      description: 'Rain',
      windSpeed: 12,
      windDirection: 'SE',
      humidity: 80,
      uvIndex: 3,
      precipitation: 60,
      pressure: 1008
    },
    {
      timestamp: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      temperature: 74,
      feelsLike: 76,
      icon: 'rain',
      description: 'Rain',
      windSpeed: 10,
      windDirection: 'E',
      humidity: 82,
      uvIndex: 2,
      precipitation: 70,
      pressure: 1008
    }
  ],
  dailyForecast: [
    {
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: 'Today',
      high: 79,
      low: 68,
      icon: 'partly-cloudy-day',
      description: 'Partly cloudy with a chance of afternoon showers',
      precipitation: 40,
      windSpeed: 15
    },
    {
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dayOfWeek: 'Tomorrow',
      high: 74,
      low: 65,
      icon: 'rain',
      description: 'Rainy with occasional thunderstorms',
      precipitation: 80,
      windSpeed: 18
    },
    {
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dayOfWeek: 'Wednesday',
      high: 72,
      low: 64,
      icon: 'rain',
      description: 'Scattered showers throughout the day',
      precipitation: 60,
      windSpeed: 12
    },
    {
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dayOfWeek: 'Thursday',
      high: 75,
      low: 66,
      icon: 'partly-cloudy-day',
      description: 'Partly cloudy with decreasing winds',
      precipitation: 20,
      windSpeed: 10
    },
    {
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dayOfWeek: 'Friday',
      high: 78,
      low: 68,
      icon: 'clear-day',
      description: 'Mostly sunny and pleasant',
      precipitation: 10,
      windSpeed: 8
    }
  ],
  tides: {
    station: 'Duck, NC',
    events: [
      {
        time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        height: 3.2,
        type: 'high'
      },
      {
        time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        height: 0.5,
        type: 'low'
      },
      {
        time: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
        height: 3.4,
        type: 'high'
      },
      {
        time: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(),
        height: 0.4,
        type: 'low'
      }
    ]
  },
  marineWarnings: [
    {
      id: 'warning1',
      title: 'Small Craft Advisory',
      severity: 'advisory',
      issuedTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      expiresTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      description: 'Winds 15 to 25 kt with gusts up to 30 kt and seas 5 to 8 feet expected.',
      affectedAreas: ['Outer Banks Coastal Waters', 'Pamlico Sound']
    }
  ],
  lastUpdated: new Date().toISOString()
};
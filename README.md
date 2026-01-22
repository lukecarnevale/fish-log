# Fish Log

A React Native mobile application for North Carolina anglers to log their fishing harvest reports, track catches, and stay informed about fishing regulations.

Designed to submit and track harvesting of fish in accordance to a recent change from the Division of Marine Fisheries.

## Features

- **Harvest Reporting**: Submit fishing harvest reports with species, location, gear type, and catch details
- **Fish Species Guide**: Browse NC fish species with filtering by season, water type, and search
- **Fishing License Management**: Store and manage your NC fishing license information
- **Leaderboard**: View community statistics and your personal fishing stats
- **Past Reports**: Access your harvest report history
- **Weather Integration**: Check fishing conditions and weather forecasts
- **Offline Support**: Queue reports when offline and sync when connected
- **Prize/Raffle System**: Participate in fishing-related promotions

## Screenshots

*Coming soon*

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack Navigator)
- **State Management**: Redux Toolkit
- **Storage**: AsyncStorage for persistence
- **Styling**: React Native StyleSheet with custom design system

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/lukecarnevale/fish-log.git
   cd fish-log
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your preferred platform:
   ```bash
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   npm run web     # Web browser
   ```

## Project Structure

```
fish-log/
├── src/
│   ├── api/           # API clients and query configuration
│   ├── components/    # Reusable UI components
│   ├── config/        # App configuration
│   ├── constants/     # Static data (species, gear options, etc.)
│   ├── data/          # Mock data for development
│   ├── hooks/         # Custom React hooks
│   ├── models/        # Data schemas
│   ├── screens/       # Screen components
│   ├── services/      # Business logic services
│   ├── store/         # Redux store and slices
│   ├── styles/        # Shared styles and design system
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── assets/            # Images and static assets
└── App.js             # App entry point
```

## Key Components

### ScreenLayout
A reusable layout component providing consistent UI patterns across screens:
- SafeAreaView with proper edge handling
- Header with back button and title
- Support for scrollable and non-scrollable layouts
- Pull-to-refresh support

### Design System
Custom styling system in `src/styles/common.ts` with:
- Ocean-themed color palette
- Consistent spacing scale
- Typography definitions
- Shadow presets
- Reusable button and card styles

## Development

### Code Style

- Functional components with hooks
- TypeScript for type safety
- PascalCase for components, camelCase for variables/functions
- Styles defined with StyleSheet.create()

### Adding a New Screen

1. Create the screen component in `src/screens/`
2. Add corresponding styles in `src/styles/`
3. Add the screen to the navigation stack in `App.js`
4. Add any new types to `src/types/`

## License

This project is proprietary software developed for the North Carolina Wildlife Resources Commission.

## Contributing

This is a private project. Please contact the maintainers for contribution guidelines.

## Contact

For questions or support, please open an issue in this repository.

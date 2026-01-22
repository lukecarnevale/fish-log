# Fish-Log Application Guide

## Commands
- `npm start` - Start the Expo development server
- `npm run ios` - Start the app in iOS simulator
- `npm run android` - Start the app in Android simulator
- `npm run web` - Start the app in web browser

## Code Style Guidelines
- **Imports**: Group imports by source (React, React Native, third-party, local)
- **Component Structure**: Functional components with hooks (useState, useRef, etc.)
- **Styling**: Use StyleSheet.create with descriptive names
- **Colors**: Use hex codes (#0066cc for primary blue, etc.)
- **Naming**: 
  - PascalCase for components
  - camelCase for variables and functions
  - Descriptive names for all elements
- **Error Handling**: Use try/catch for async operations
- **File Organization**: Each screen in its own file under screens/
- **Navigation**: Stack-based using @react-navigation/stack
- **Assets**: Store in assets/ directory
- **State Management**: Local state with hooks, AsyncStorage for persistence

Follow consistent indentation (2 spaces) and keep components focused on a single responsibility.
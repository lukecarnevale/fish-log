# Third-Party Licenses

**Last Updated: [INSERT DATE]**

Fish Log uses the following open-source software. We are grateful to these projects and their contributors.

---

## Summary

| Package | License | URL |
|---------|---------|-----|
| React | MIT | https://github.com/facebook/react |
| React Native | MIT | https://github.com/facebook/react-native |
| Expo | MIT | https://github.com/expo/expo |
| Supabase JS | MIT | https://github.com/supabase/supabase-js |
| React Navigation | MIT | https://github.com/react-navigation/react-navigation |
| And others listed below | Various | See details |

---

## Core Framework

### React
- **License:** MIT
- **Copyright:** Meta Platforms, Inc.
- **URL:** https://github.com/facebook/react

### React Native
- **License:** MIT
- **Copyright:** Meta Platforms, Inc.
- **URL:** https://github.com/facebook/react-native

### Expo
- **License:** MIT
- **Copyright:** 650 Industries, Inc.
- **URL:** https://github.com/expo/expo
- **Includes:** expo, expo-font, expo-status-bar, expo-image, expo-image-picker, expo-file-system, expo-location, expo-secure-store, expo-clipboard, expo-linking, expo-linear-gradient

---

## Navigation

### React Navigation
- **License:** MIT
- **Copyright:** React Navigation Contributors
- **URL:** https://github.com/react-navigation/react-navigation
- **Includes:** @react-navigation/native, @react-navigation/stack

### React Native Screens
- **License:** MIT
- **Copyright:** Software Mansion
- **URL:** https://github.com/software-mansion/react-native-screens

### React Native Gesture Handler
- **License:** MIT
- **Copyright:** Software Mansion
- **URL:** https://github.com/software-mansion/react-native-gesture-handler

---

## Backend & Authentication

### Supabase JS
- **License:** MIT
- **Copyright:** Supabase Inc.
- **URL:** https://github.com/supabase/supabase-js

---

## State Management

### Redux Toolkit
- **License:** MIT
- **Copyright:** Redux Team
- **URL:** https://github.com/reduxjs/redux-toolkit
- **Includes:** @reduxjs/toolkit, react-redux

### TanStack React Query
- **License:** MIT
- **Copyright:** Tanner Linsley
- **URL:** https://github.com/TanStack/query

---

## UI Components

### Expo Vector Icons
- **License:** MIT
- **Copyright:** 650 Industries, Inc.
- **URL:** https://github.com/expo/vector-icons
- **Note:** Includes fonts under various licenses (SIL OFL, Apache 2.0)

### React Native SVG
- **License:** MIT
- **Copyright:** React Native Community
- **URL:** https://github.com/react-native-svg/react-native-svg

### React Native Safe Area Context
- **License:** MIT
- **Copyright:** Th3rd Wave
- **URL:** https://github.com/th3rdwave/react-native-safe-area-context

---

## Storage & Data

### Async Storage
- **License:** MIT
- **Copyright:** React Native Community
- **URL:** https://github.com/react-native-async-storage/async-storage

### Base64 ArrayBuffer
- **License:** MIT
- **Copyright:** Nicolo Ribaudo
- **URL:** https://github.com/nicolo-ribaudo/base64-arraybuffer

---

## Form & Input

### React Native Mask Input
- **License:** MIT
- **URL:** https://github.com/CaioQuiriworking/react-native-mask-input

### libphonenumber-js
- **License:** MIT
- **Copyright:** Nikolay Kuchumov
- **URL:** https://github.com/catamphetamine/libphonenumber-js

### Yup
- **License:** MIT
- **Copyright:** Jason Quense
- **URL:** https://github.com/jquense/yup

### Zod
- **License:** MIT
- **Copyright:** Colin McDonnell
- **URL:** https://github.com/colinhacks/zod

### React Native Community DateTimePicker
- **License:** MIT
- **Copyright:** React Native Community
- **URL:** https://github.com/react-native-datetimepicker/datetimepicker

### React Native Picker
- **License:** MIT
- **Copyright:** React Native Community
- **URL:** https://github.com/react-native-picker/picker

---

## Utilities

### UUID
- **License:** MIT
- **URL:** https://github.com/uuidjs/uuid

### NetInfo
- **License:** MIT
- **Copyright:** React Native Community
- **URL:** https://github.com/react-native-netinfo/react-native-netinfo

### Google Places Autocomplete
- **License:** MIT
- **URL:** https://github.com/FaridSafi/react-native-google-places-autocomplete

---

## Development Dependencies

### TypeScript
- **License:** Apache-2.0
- **Copyright:** Microsoft Corporation
- **URL:** https://github.com/microsoft/TypeScript

### Babel
- **License:** MIT
- **Copyright:** Babel Contributors
- **URL:** https://github.com/babel/babel

### Jest
- **License:** MIT
- **Copyright:** Meta Platforms, Inc.
- **URL:** https://github.com/facebook/jest

---

## Full MIT License Text

The MIT License is the most common license used by our dependencies:

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Apache License 2.0 (Summary)

Used by TypeScript and some other dependencies:

```
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Icon Fonts

Expo Vector Icons includes icon fonts under various licenses:

### FontAwesome
- **License:** SIL OFL 1.1 (fonts), MIT (code)
- **URL:** https://fontawesome.com

### Material Icons
- **License:** Apache 2.0
- **Copyright:** Google
- **URL:** https://fonts.google.com/icons

### Ionicons
- **License:** MIT
- **Copyright:** Ionic
- **URL:** https://ionic.io/ionicons

### Feather Icons
- **License:** MIT
- **Copyright:** Cole Bemis
- **URL:** https://feathericons.com

---

## Additional Notices

### Expo Image
Uses native image libraries which may have their own licenses on iOS (Core Graphics) and Android (Fresco).

### Hermes Engine
- **License:** MIT
- **Copyright:** Meta Platforms, Inc.
- **URL:** https://github.com/facebook/hermes

---

## Generating a Complete License Report

For a complete list of all transitive dependencies and their licenses, you can run:

```bash
npx license-checker --summary
npx license-checker --json > licenses.json
```

---

## Questions

If you have questions about the licensing of any component, please contact us at [INSERT EMAIL].

---

*This document was last updated on [INSERT DATE].*

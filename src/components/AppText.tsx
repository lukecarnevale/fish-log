// AppText.tsx - Accessibility-aware Text wrappers
//
// Purpose: centralize Dynamic Type / large-text behavior so the app stays
// usable when users enable iOS/Android accessibility text sizes. Every new
// `<Text>` in the codebase should use one of these wrappers instead of the
// raw react-native `Text`.
//
// Scaling caps (maxFontSizeMultiplier):
//   - AppText    (default): 1.3  — body copy, headings, general UI text
//   - CaptionText:           1.15 — small captions / helper text (fontSize 12-13)
//   - BadgeText:             1.1  — tiny labels inside fixed-size badges/chips/pills
//   - TitleText:             1.2  — large display titles that already read well
//
// Using a cap of `1` would disable scaling entirely. Prefer a cap >= 1.1 so
// users still get *some* benefit from their accessibility setting.

import React from 'react';
import { Text, TextProps } from 'react-native';

type Props = TextProps & { children?: React.ReactNode };

const makeScaledText = (defaultMultiplier: number) => {
  const Component: React.FC<Props> = ({
    allowFontScaling = true,
    maxFontSizeMultiplier,
    style,
    children,
    ...rest
  }) => (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? defaultMultiplier}
      style={style}
      {...rest}
    >
      {children}
    </Text>
  );
  return Component;
};

export const AppText = makeScaledText(1.3);
export const TitleText = makeScaledText(1.2);
export const CaptionText = makeScaledText(1.15);
export const BadgeText = makeScaledText(1.1);

export default AppText;

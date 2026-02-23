import React from 'react';
import { render } from '@testing-library/react-native';

// WaveBackground uses react-native-svg which needs mocking
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Path: View,
    G: View,
    Circle: View,
    Rect: View,
  };
});

import WaveBackground from '../../src/components/WaveBackground';

describe('WaveBackground', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<WaveBackground />);
    expect(toJSON()).toBeTruthy();
  });
});

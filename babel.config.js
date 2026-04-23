module.exports = function(api) {
  api.cache(true);

  const plugins = [
    '@babel/plugin-transform-export-namespace-from',
  ];

  // Strip all console.* calls in production builds
  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  // react-native-worklets/plugin (Reanimated 4's worklets transform) MUST be
  // the last plugin in the array — required for the drag-and-drop photo reorder
  // UI in the catch_log form.
  plugins.push('react-native-worklets/plugin');

  return {
    presets: ['babel-preset-expo', '@babel/preset-typescript'],
    plugins,
  };
};

module.exports = function(api) {
  api.cache(true);

  const plugins = [
    '@babel/plugin-transform-export-namespace-from',
  ];

  // Strip all console.* calls in production builds
  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo', '@babel/preset-typescript'],
    plugins,
  };
};

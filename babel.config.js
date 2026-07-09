module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        reactCompiler: true,
        unstable_transformProfile: 'hermes-v0',
      }],
    ],
    plugins: [],
  };
};

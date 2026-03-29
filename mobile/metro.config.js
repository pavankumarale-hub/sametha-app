const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve firebase/auth/react-native
config.resolver.unstable_enablePackageExports = true;

module.exports = config;

const appJson = require('./app.json');

const LIVE_ANDROID_PACKAGE = 'dev.beleap.joplintodo';
const ALPHA_ANDROID_PACKAGE = 'dev.beleap.joplintodo.alpha';

module.exports = ({ config }) => {
  const branchName = process.env.EAS_BUILD_GIT_BRANCH || process.env.GIT_BRANCH || '';
  const shouldUseAlphaPackage = branchName === 'develop';

  return {
    ...appJson.expo,
    ...config,
    android: {
      ...appJson.expo.android,
      ...(config?.android ?? {}),
      package: shouldUseAlphaPackage ? ALPHA_ANDROID_PACKAGE : LIVE_ANDROID_PACKAGE,
    },
    extra: {
      ...appJson.expo.extra,
      ...(config?.extra ?? {}),
      appVariant: shouldUseAlphaPackage ? 'alpha' : 'live',
      buildGitBranch: branchName || null,
    },
  };
};

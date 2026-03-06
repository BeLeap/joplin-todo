const appJson = require('./app.json');

const LIVE_ANDROID_PACKAGE = 'dev.beleap.joplintodo';
const ALPHA_ANDROID_PACKAGE = 'dev.beleap.joplintodo.alpha';

module.exports = ({ config }) => {
  const branchName = process.env.EAS_BUILD_GIT_BRANCH || process.env.GIT_BRANCH || '';
  const shouldUseAlphaPackage = branchName === 'develop';
  const version = resolveTagNameVersion();

  return {
    ...appJson.expo,
    ...config,
    version,
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

function resolveTagNameVersion() {
  const tagName = process.env.TAG_NAME;

  if (!tagName) {
    throw new Error('버전 계산 실패: TAG_NAME 환경변수가 비어 있습니다.');
  }

  if (!/^\d+\.\d+\.\d+$/.test(tagName)) {
    throw new Error(`버전 계산 실패: TAG_NAME 값 형식이 잘못되었습니다("${tagName}").`);
  }

  return tagName;
}

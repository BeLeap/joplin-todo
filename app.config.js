const appJson = require('./app.json');
const { execSync } = require('node:child_process');

const LIVE_ANDROID_PACKAGE = 'dev.beleap.joplintodo';
const ALPHA_ANDROID_PACKAGE = 'dev.beleap.joplintodo.alpha';

module.exports = ({ config }) => {
  const branchName = process.env.EAS_BUILD_GIT_BRANCH || process.env.GIT_BRANCH || '';
  const shouldUseAlphaPackage = branchName === 'develop';
  const version = resolveHeadverVersion(appJson.expo.version);

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

function resolveHeadverVersion(baseVersion) {
  const predefinedTagVersion = process.env.TAG_NAME;

  if (predefinedTagVersion) {
    if (!/^\d+\.\d+\.\d+$/.test(predefinedTagVersion)) {
      throw new Error(
        `HeadVer 계산 실패: TAG_NAME 값 형식이 잘못되었습니다("${predefinedTagVersion}").`,
      );
    }

    return predefinedTagVersion;
  }

  const head = parseHead(baseVersion);
  const yearWeek = getIsoYearWeek(new Date());
  const build = resolveBuildNumber();

  return `${head}.${yearWeek}.${build}`;
}

function parseHead(baseVersion) {
  const matched = /^(\d+)\./.exec(baseVersion);

  if (!matched) {
    throw new Error(
      `HeadVer 계산 실패: app.json expo.version("${baseVersion}")에서 head(major)를 읽을 수 없습니다.`,
    );
  }

  return matched[1];
}

function resolveBuildNumber() {
  const envBuildNumber = process.env.EAS_BUILD_NUMBER || process.env.BUILD_NUMBER;

  if (envBuildNumber) {
    if (!/^\d+$/.test(envBuildNumber)) {
      throw new Error(
        `HeadVer 계산 실패: EAS_BUILD_NUMBER/BUILD_NUMBER 값이 숫자가 아닙니다("${envBuildNumber}").`,
      );
    }

    return envBuildNumber;
  }

  try {
    const gitBuildNumber = execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();

    if (!/^\d+$/.test(gitBuildNumber)) {
      throw new Error(`git rev-list 결과가 숫자가 아닙니다("${gitBuildNumber}").`);
    }

    return gitBuildNumber;
  } catch (error) {
    throw new Error(`HeadVer 계산 실패: 빌드 번호를 구할 수 없습니다. ${error.message}`);
  }
}

function getIsoYearWeek(date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);

  return `${String(isoYear).slice(-2)}${String(week).padStart(2, '0')}`;
}

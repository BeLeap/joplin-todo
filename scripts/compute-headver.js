#!/usr/bin/env node

const { execSync } = require('node:child_process');
const appJson = require('../app.json');

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
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

function resolveBuildNumber() {
  const envBuild = process.env.EAS_BUILD_NUMBER || process.env.BUILD_NUMBER;

  if (envBuild) {
    if (!/^\d+$/.test(envBuild)) {
      fail(`HeadVer 계산 실패: 빌드 번호가 숫자가 아닙니다("${envBuild}").`);
    }

    return envBuild;
  }

  try {
    const gitBuild = execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();

    if (!/^\d+$/.test(gitBuild)) {
      fail(`HeadVer 계산 실패: 빌드 번호가 숫자가 아닙니다("${gitBuild}").`);
    }

    return gitBuild;
  } catch (error) {
    fail(`HeadVer 계산 실패: 빌드 번호를 구할 수 없습니다. ${error.message}`);
  }
}

const matched = /^(\d+)\./.exec(appJson.expo.version);

if (!matched) {
  fail(`HeadVer 계산 실패: app.json expo.version("${appJson.expo.version}")에서 head(major)를 읽을 수 없습니다.`);
}

const tagName = `${matched[1]}.${getIsoYearWeek(new Date())}.${resolveBuildNumber()}`;

if (!/^\d+\.\d+\.\d+$/.test(tagName)) {
  fail(`TAG_NAME 형식이 잘못되었습니다: ${tagName}`);
}

process.stdout.write(`${tagName}\n`);

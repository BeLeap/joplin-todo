# Jest check workflow migration

## Summary
- `node:test` 기반 동기화 테스트를 Jest `describe`/`it`/`expect` 스타일로 변환했다.
- Jest 실행을 위한 `jest.config.cjs`, `test/mocks/async-storage.ts`, `npm test` 스크립트를 추가했다.
- `Justfile`의 `check`에 Jest 테스트를 포함하고, `.github/workflows/check.yml`이 해당 통합 체크를 실행하도록 조정했다.

## Validation
- `npm install`
- `TAG_NAME=0.0.0 npm run test`
- `TAG_NAME=0.0.0 npm run lint`
- `TAG_NAME=0.0.0 npx tsc --noEmit`

export class EncryptedJoplinSyncError extends Error {
  constructor(message = '암호화된 Joplin 저장소(E2EE)는 지원하지 않습니다.') {
    super(message);
    this.name = 'EncryptedJoplinSyncError';
  }
}

export class OneDriveAuthError extends Error {
  constructor(message = 'OneDrive 인증이 필요합니다. 다시 로그인해 주세요.', detail?: string) {
    super(detail ? `${message} | ${detail}` : message);
    this.name = 'OneDriveAuthError';
  }
}

export class OneDrivePermissionError extends Error {
  constructor(message = 'OneDrive 접근 권한이 부족합니다. 권한 설정을 확인해 주세요.', detail?: string) {
    super(detail ? `${message} | ${detail}` : message);
    this.name = 'OneDrivePermissionError';
  }
}

export class OneDriveNetworkError extends Error {
  constructor(message = '네트워크 문제로 OneDrive 동기화에 실패했습니다.') {
    super(message);
    this.name = 'OneDriveNetworkError';
  }
}

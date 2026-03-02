export class EncryptedJoplinSyncError extends Error {
  constructor(message = '암호화된 Joplin 저장소(E2EE)는 지원하지 않습니다.') {
    super(message);
    this.name = 'EncryptedJoplinSyncError';
  }
}

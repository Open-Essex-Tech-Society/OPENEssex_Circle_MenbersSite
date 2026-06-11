// SkyWay Auth Token v3 生成ヘルパー
// 公式ドキュメント: https://skyway.ntt.com/ja/docs/user-guide/authentication/skyway-auth-token/

import { SkyWayAuthToken, uuidV4, nowInSec } from '@skyway-sdk/token';

const APP_ID = import.meta.env.VITE_SKYWAY_APP_ID;
const SECRET_KEY = import.meta.env.VITE_SKYWAY_SECRET_KEY;

/**
 * SkyWay Auth Token v3 を生成する
 * Room名に一致する rooms スコープを付与し、全メンバーに publish/subscribe を許可する
 */
export function createSkyWayToken(roomName?: string): string {
  if (!APP_ID || !SECRET_KEY) {
    throw new Error('VITE_SKYWAY_APP_ID または VITE_SKYWAY_SECRET_KEY が .env に設定されていません');
  }

  const token = new SkyWayAuthToken({
    // v3 必須フィールド
    version: 3,
    jti: uuidV4(),
    iat: nowInSec(),
    exp: nowInSec() + 60 * 60 * 24, // 24時間有効
    scope: {
      // v3: appId (旧: app.id)
      appId: APP_ID,
      // TURN サーバーを有効化
      turn: { enabled: true },
      // 全ルームへのアクセスを許可（ルーム名を指定する場合は roomName を使う）
      rooms: [
        {
          id: '*',
          name: roomName ?? '*',
          // ルームの作成・削除を許可
          methods: ['create', 'close', 'updateMetadata'],
          member: {
            id: '*',
            name: '*',
            // メンバーの全操作を許可
            methods: ['publish', 'subscribe', 'updateMetadata'],
          },
        },
      ],
    },
  }).encode(SECRET_KEY);

  return token;
}

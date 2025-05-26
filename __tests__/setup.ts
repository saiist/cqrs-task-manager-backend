
import dotenv from 'dotenv';

// テスト用環境変数読み込み
dotenv.config({ path: '.env.test' });

// グローバルテスト設定
beforeAll(async () => {
  // テスト用DB接続など
});

afterAll(async () => {
  // クリーンアップ
});
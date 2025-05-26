
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * データベース設定
 */
export const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'cqrs_taskmanager',
  user: process.env.DATABASE_USER || 'user',
  password: process.env.DATABASE_PASSWORD || 'password',
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

/**
 * PostgreSQL接続プール
 */
export const pool = new Pool(dbConfig);

/**
 * データベース接続テスト
 */
export async function testDatabaseConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * データベース初期化（テーブル作成）
 */
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  
  try {
    // イベントストアテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_store (
        id SERIAL PRIMARY KEY,
        event_id UUID UNIQUE NOT NULL,
        aggregate_id UUID NOT NULL,
        event_type VARCHAR(255) NOT NULL,
        version INTEGER NOT NULL,
        payload JSONB NOT NULL,
        metadata JSONB,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(aggregate_id, version)
      );
    `);

    // インデックス作成
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_id 
      ON event_store(aggregate_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_store_timestamp 
      ON event_store(timestamp);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_store_event_type 
      ON event_store(event_type);
    `);

    // Read Model用テーブル（タスクビュー）
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_views (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // タスクビューのインデックス
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_task_views_status 
      ON task_views(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_task_views_priority 
      ON task_views(priority);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_task_views_created_at 
      ON task_views(created_at);
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
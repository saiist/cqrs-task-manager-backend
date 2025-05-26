
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, EventStore } from '@/types/core';
import { Logger } from '@/config/logger';
import { ConflictError, NotFoundError } from '@/middleware/error-handler';

/**
 * PostgreSQL実装のEvent Store
 * 
 * 重要な概念:
 * - イベントの不変性: 一度保存されたイベントは変更されない
 * - 楽観的ロック: バージョン番号で並行制御
 * - イベント順序: タイムスタンプとバージョンで順序保証
 */
export class PostgreSQLEventStore implements EventStore {
  constructor(private pool: Pool) {}

  /**
   * イベントを保存
   * 
   * @param aggregateId 集約ID
   * @param events 保存するイベント配列
   * @param expectedVersion 期待するバージョン（楽観的ロック用）
   */
  async saveEvents(
    aggregateId: string, 
    events: DomainEvent[], 
    expectedVersion: number
  ): Promise<void> {
    if (events.length === 0) {
      Logger.debug('No events to save', { aggregateId });
      return;
    }

    const client = await this.pool.connect();
    
    try {
      // トランザクション開始
      await client.query('BEGIN');
      
      // 現在のバージョンをチェック（楽観的ロック）
      const currentVersion = await this.getCurrentVersion(client, aggregateId);
      
      if (currentVersion !== expectedVersion) {
        throw new ConflictError(
          `Concurrency conflict: Expected version ${expectedVersion}, but current version is ${currentVersion} for aggregate ${aggregateId}`
        );
      }

      // イベントを順番に保存
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const newVersion = expectedVersion + i + 1;
        
        await this.insertEvent(client, event, newVersion);
        
        Logger.debug('Event saved', {
          aggregateId,
          eventId: event.id,
          eventType: event.eventType,
          version: newVersion
        });
      }

      // トランザクションコミット
      await client.query('COMMIT');
      
      Logger.info('Events saved successfully', {
        aggregateId,
        eventCount: events.length,
        fromVersion: expectedVersion + 1,
        toVersion: expectedVersion + events.length
      });

    } catch (error) {
      // トランザクションロールバック
      await client.query('ROLLBACK');
      
      Logger.error('Failed to save events', {
        aggregateId,
        expectedVersion,
        error: error instanceof Error ? error.message : error
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 集約のイベントを取得
   * 
   * @param aggregateId 集約ID
   * @param fromVersion 開始バージョン（省略時は最初から）
   */
  async getEvents(aggregateId: string, fromVersion: number = 0): Promise<DomainEvent[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          event_id,
          aggregate_id,
          event_type,
          version,
          payload,
          metadata,
          timestamp
        FROM event_store 
        WHERE aggregate_id = $1 
          AND version > $2
        ORDER BY version ASC
      `;
      
      const result = await client.query(query, [aggregateId, fromVersion]);
      
      const events: DomainEvent[] = result.rows.map(row => ({
        id: row.event_id,
        aggregateId: row.aggregate_id,
        eventType: row.event_type,
        version: row.version,
        payload: row.payload,
        metadata: row.metadata,
        timestamp: new Date(row.timestamp)
      }));

      Logger.debug('Events retrieved', {
        aggregateId,
        fromVersion,
        eventCount: events.length
      });

      return events;
      
    } catch (error) {
      Logger.error('Failed to get events', {
        aggregateId,
        fromVersion,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * すべてのイベントを取得（イベント再生用）
   * 
   * @param fromPosition 開始位置（省略時は最初から）
   */
  async getAllEvents(fromPosition: number = 0): Promise<DomainEvent[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          event_id,
          aggregate_id,
          event_type,
          version,
          payload,
          metadata,
          timestamp
        FROM event_store 
        WHERE id > $1
        ORDER BY id ASC
        LIMIT 1000
      `;
      
      const result = await client.query(query, [fromPosition]);
      
      const events: DomainEvent[] = result.rows.map(row => ({
        id: row.event_id,
        aggregateId: row.aggregate_id,
        eventType: row.event_type,
        version: row.version,
        payload: row.payload,
        metadata: row.metadata,
        timestamp: new Date(row.timestamp)
      }));

      Logger.debug('All events retrieved', {
        fromPosition,
        eventCount: events.length
      });

      return events;
      
    } catch (error) {
      Logger.error('Failed to get all events', {
        fromPosition,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 集約の現在のバージョンを取得
   */
  async getCurrentVersion(client: any, aggregateId: string): Promise<number> {
    const query = `
      SELECT COALESCE(MAX(version), 0) as current_version
      FROM event_store 
      WHERE aggregate_id = $1
    `;
    
    const result = await client.query(query, [aggregateId]);
    return result.rows[0].current_version;
  }

  /**
   * イベントをデータベースに挿入
   */
  private async insertEvent(client: any, event: DomainEvent, version: number): Promise<void> {
    const query = `
      INSERT INTO event_store (
        event_id,
        aggregate_id,
        event_type,
        version,
        payload,
        metadata,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    const params = [
      event.id,
      event.aggregateId,
      event.eventType,
      version,
      JSON.stringify(event.payload),
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.timestamp
    ];
    
    await client.query(query, params);
  }

  /**
   * 集約が存在するかチェック
   */
  async aggregateExists(aggregateId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT EXISTS(
          SELECT 1 FROM event_store WHERE aggregate_id = $1
        ) as exists
      `;
      
      const result = await client.query(query, [aggregateId]);
      return result.rows[0].exists;
      
    } catch (error) {
      Logger.error('Failed to check aggregate existence', {
        aggregateId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * イベントストアの統計情報を取得
   */
  async getStatistics(): Promise<EventStoreStatistics> {
    const client = await this.pool.connect();
    
    try {
      const queries = await Promise.all([
        // 総イベント数
        client.query('SELECT COUNT(*) as total_events FROM event_store'),
        
        // ユニーク集約数
        client.query('SELECT COUNT(DISTINCT aggregate_id) as total_aggregates FROM event_store'),
        
        // イベントタイプ別集計
        client.query(`
          SELECT event_type, COUNT(*) as count 
          FROM event_store 
          GROUP BY event_type 
          ORDER BY count DESC
        `),
        
        // 最新イベント
        client.query(`
          SELECT MAX(timestamp) as latest_event_time 
          FROM event_store
        `)
      ]);

      const [totalEvents, totalAggregates, eventTypes, latestEvent] = queries;

      return {
        totalEvents: parseInt(totalEvents.rows[0].total_events),
        totalAggregates: parseInt(totalAggregates.rows[0].total_aggregates),
        eventTypeBreakdown: eventTypes.rows.reduce((acc, row) => {
          acc[row.event_type] = parseInt(row.count);
          return acc;
        }, {} as Record<string, number>),
        latestEventTime: latestEvent.rows[0].latest_event_time ? 
          new Date(latestEvent.rows[0].latest_event_time) : null
      };
      
    } catch (error) {
      Logger.error('Failed to get event store statistics', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * イベントストア統計情報の型
 */
export interface EventStoreStatistics {
  totalEvents: number;
  totalAggregates: number;
  eventTypeBreakdown: Record<string, number>;
  latestEventTime: Date | null;
}

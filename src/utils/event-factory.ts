
import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from '@/types/core';

/**
 * イベント作成ヘルパー
 */
export class EventFactory {
  /**
   * 基本的なイベントを作成
   */
  static createEvent<T>(
    aggregateId: string,
    eventType: string,
    payload: T,
    version: number,
    metadata?: Record<string, unknown>
  ): DomainEvent {
    return {
      id: uuidv4(),
      aggregateId,
      eventType,
      version,
      timestamp: new Date(),
      payload,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        eventId: uuidv4()
      }
    };
  }

  /**
   * メタデータ付きイベントを作成
   */
  static createEventWithMetadata<T>(
    aggregateId: string,
    eventType: string,
    payload: T,
    version: number,
    userId?: string,
    correlationId?: string,
    causationId?: string
  ): DomainEvent {
    return this.createEvent(
      aggregateId,
      eventType,
      payload,
      version,
      {
        userId,
        correlationId,
        causationId,
        timestamp: new Date().toISOString()
      }
    );
  }
}

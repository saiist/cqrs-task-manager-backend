
import { EventBus, EventHandler, DomainEvent } from '@/types/core';
import { Logger } from '@/config/logger';

/**
 * インメモリイベントバス実装
 * 
 * 責務:
 * - イベントの発行
 * - イベントハンドラーの管理
 * - 非同期イベント処理
 */
export class InMemoryEventBus implements EventBus {
  private handlers: EventHandler<DomainEvent>[] = [];

  /**
   * イベントハンドラーを登録
   * 
   * @param handler イベントハンドラー
   */
  subscribe(handler: EventHandler<DomainEvent>): void {
    this.handlers.push(handler);
    Logger.debug('Event handler subscribed', {
      handlerName: handler.constructor.name
    });
  }

  /**
   * イベントを発行
   * 
   * @param events 発行するイベント配列
   */
  async publish(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    Logger.info('Publishing events', {
      eventCount: events.length,
      eventTypes: events.map(e => e.eventType)
    });

    // 各イベントを処理
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  /**
   * 単一イベントを処理
   * 
   * @param event 処理するイベント
   */
  private async processEvent(event: DomainEvent): Promise<void> {
    const applicableHandlers = this.handlers.filter(handler => 
      handler.canHandle(event.eventType)
    );

    if (applicableHandlers.length === 0) {
      Logger.warn('No handlers found for event', {
        eventType: event.eventType,
        eventId: event.id
      });
      return;
    }

    // 並列でハンドラーを実行
    const handlerPromises = applicableHandlers.map(async handler => {
      try {
        await handler.handle(event);
        
        Logger.debug('Event handled successfully', {
          handlerName: handler.constructor.name,
          eventType: event.eventType,
          eventId: event.id
        });
        
      } catch (error) {
        Logger.error('Event handler failed', {
          handlerName: handler.constructor.name,
          eventType: event.eventType,
          eventId: event.id,
          error: error instanceof Error ? error.message : error
        });
        
        // ハンドラーエラーは個別に処理、全体の処理は継続
        // 実際のプロダクションでは、Dead Letter Queueなどに送信
      }
    });

    await Promise.allSettled(handlerPromises);
  }
}
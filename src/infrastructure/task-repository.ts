
import { EventStore } from '@/types/core';
import { TaskAggregate } from '@/domain/task-aggregate';
import { Logger } from '@/config/logger';
import { NotFoundError } from '@/middleware/error-handler';

/**
 * タスクリポジトリ
 * 
 * 責務:
 * - 集約の永続化
 * - 集約の復元
 * - Event Storeとの統合
 */
export interface TaskRepository {
    save(task: TaskAggregate): Promise<void>;
    getById(id: string): Promise<TaskAggregate>;
    exists(id: string): Promise<boolean>;
}

/**
 * Event Sourcingベースのタスクリポジトリ実装
 */
export class EventSourcedTaskRepository implements TaskRepository {
    constructor(private eventStore: EventStore) { }

    /**
     * タスク集約を保存
     * 
     * @param task 保存するタスク集約
     */
    async save(task: TaskAggregate): Promise<void> {
        const uncommittedEvents = task.getUncommittedEvents();

        if (uncommittedEvents.length === 0) {
            Logger.debug('No events to save for task', { taskId: task.id });
            return;
        }

        Logger.debug('Saving task aggregate', {
            taskId: task.id,
            currentVersion: task.version,
            uncommittedEventCount: uncommittedEvents.length,
            expectedVersion: task.version - uncommittedEvents.length
        });

        try {
            // Event Storeにイベントを保存
            await this.eventStore.saveEvents(
                task.id,
                uncommittedEvents,
                task.version - uncommittedEvents.length // 期待するバージョン
            );

            // 未コミットイベントをクリア
            task.markEventsAsCommitted();

            Logger.info('Task aggregate saved successfully', {
                taskId: task.id,
                eventCount: uncommittedEvents.length,
                newVersion: task.version
            });

        } catch (error) {
            Logger.error('Failed to save task aggregate', {
                taskId: task.id,
                eventCount: uncommittedEvents.length,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }

    /**
     * IDでタスク集約を取得
     * 
     * @param id タスクID
     * @returns タスク集約
     */
    async getById(id: string): Promise<TaskAggregate> {
        try {
            // Event Storeからイベントを取得
            const events = await this.eventStore.getEvents(id);

            if (events.length === 0) {
                throw new NotFoundError('Task', id);
            }

            // 集約を作成してイベントから復元
            const task = new TaskAggregate(id);
            task.loadFromHistory(events);

            Logger.debug('Task aggregate loaded from events', {
                taskId: id,
                eventCount: events.length,
                version: task.version
            });

            return task;

        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }

            Logger.error('Failed to load task aggregate', {
                taskId: id,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }

    /**
     * タスクが存在するかチェック
     * 
     * @param id タスクID
     * @returns 存在する場合true
     */
    async exists(id: string): Promise<boolean> {
        try {
            return await this.eventStore.aggregateExists(id);
        } catch (error) {
            Logger.error('Failed to check task existence', {
                taskId: id,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }
}


/**
 * 基本的なイベント型
 * すべてのドメインイベントはこのインターフェースを実装する
 */
export interface DomainEvent {
    readonly id: string;           // イベントの一意識別子
    readonly aggregateId: string;  // 集約のID
    readonly eventType: string;    // イベントタイプ名
    readonly version: number;      // イベントバージョン
    readonly timestamp: Date;      // イベント発生時刻
    readonly payload: unknown;     // イベントの詳細データ
    readonly metadata?: Record<string, unknown>; // メタデータ
  }
  
  /**
   * コマンド型
   * すべてのコマンドはこのインターフェースを実装する
   */
  export interface Command {
    readonly commandId: string;    // コマンドの一意識別子
    readonly commandType: string;  // コマンドタイプ名
    readonly timestamp: Date;      // コマンド実行時刻
    readonly payload: unknown;     // コマンドの詳細データ
    readonly metadata?: Record<string, unknown>; // メタデータ（ユーザー情報等）
  }
  
  /**
   * クエリ型
   * すべてのクエリはこのインターフェースを実装する
   */
  export interface Query {
    readonly queryId: string;      // クエリの一意識別子
    readonly queryType: string;    // クエリタイプ名
    readonly timestamp: Date;      // クエリ実行時刻
    readonly parameters: unknown;  // クエリパラメータ
  }
  
  /**
   * 集約ルート
   * ドメインオブジェクトの基本クラス
   */
  export abstract class AggregateRoot {
    protected _id: string;
    protected _version: number;
    private _uncommittedEvents: DomainEvent[] = [];
  
    constructor(id: string, version: number = 0) {
      this._id = id;
      this._version = version;
    }
  
    get id(): string {
      return this._id;
    }
  
    get version(): number {
      return this._version;
    }
  
    /**
     * 未コミットのイベントを取得
     */
    getUncommittedEvents(): DomainEvent[] {
      return [...this._uncommittedEvents];
    }
  
    /**
     * イベントをコミット済みとしてマーク
     */
    markEventsAsCommitted(): void {
      this._uncommittedEvents = [];
    }
  
    /**
     * イベントを発生させる
     */
    protected raiseEvent(event: DomainEvent): void {
      this._uncommittedEvents.push(event);
      this.applyEvent(event);
    }
  
    /**
     * イベントを適用（状態変更）
     */
    protected abstract applyEvent(event: DomainEvent): void;
  
    /**
     * 過去のイベントから状態を復元
     */
    public loadFromHistory(events: DomainEvent[]): void {
      events.forEach(event => {
        this.applyEvent(event);
        this._version++;
      });
    }
  }
  
  /**
   * コマンドハンドラーのインターフェース
   */
  export interface CommandHandler<T extends Command> {
    handle(command: T): Promise<void>;
  }
  
  /**
   * クエリハンドラーのインターフェース
   */
  export interface QueryHandler<T extends Query, R> {
    handle(query: T): Promise<R>;
  }
  
  /**
   * イベントハンドラー（プロジェクション）のインターフェース
   */
  export interface EventHandler<T extends DomainEvent> {
    handle(event: T): Promise<void>;
    canHandle(eventType: string): boolean;
  }
  
  /**
   * イベントストアのインターフェース
   */
  export interface EventStore {
    saveEvents(aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void>;
    getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
    getAllEvents(fromPosition?: number): Promise<DomainEvent[]>;
    getCurrentVersion(client: any, aggregateId: string): Promise<number>;
    aggregateExists(aggregateId: string): Promise<boolean>;
    getStatistics(): Promise<any>;
  }
  
  /**
   * イベントバス（パブリッシャー）のインターフェース
   */
  export interface EventBus {
    publish(events: DomainEvent[]): Promise<void>;
    subscribe(handler: EventHandler<DomainEvent>): void;
  }
  
  /**
   * 汎用的な結果型
   */
  export type Result<T, E = Error> = {
    success: true;
    data: T;
  } | {
    success: false;
    error: E;
  };
  
  /**
   * ヘルパー関数：成功の結果を作成
   */
  export function success<T>(data: T): Result<T> {
    return { success: true, data };
  }
  
  /**
   * ヘルパー関数：失敗の結果を作成
   */
  export function failure<E = Error>(error: E): Result<never, E> {
    return { success: false, error };
  }
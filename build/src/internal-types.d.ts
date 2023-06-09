import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import { Span } from '@opentelemetry/api';
export interface MongoDBInstrumentationExecutionResponseHook {
    (span: Span, responseInfo: MongoResponseHookInformation): void;
}
/**
 * Function that can be used to serialize db.statement tag
 * @param cmd - MongoDB command object
 *
 * @returns serialized string that will be used as the db.statement attribute.
 */
export declare type DbStatementSerializer = (cmd: Record<string, unknown>) => string;
export interface MongoDBInstrumentationConfig extends InstrumentationConfig {
    /**
     * If true, additional information about query parameters and
     * results will be attached (as `attributes`) to spans representing
     * database operations.
     */
    enhancedDatabaseReporting?: boolean;
    /**
     * Hook that allows adding custom span attributes based on the data
     * returned from MongoDB actions.
     *
     * @default undefined
     */
    responseHook?: MongoDBInstrumentationExecutionResponseHook;
    /**
     * Custom serializer function for the db.statement tag
     */
    dbStatementSerializer?: DbStatementSerializer;
}
export declare type Func<T> = (...args: unknown[]) => T;
export declare type MongoInternalCommand = {
    findandmodify: boolean;
    createIndexes: boolean;
    count: boolean;
    ismaster: boolean;
    indexes?: unknown[];
    query?: Record<string, unknown>;
    limit?: number;
    q?: Record<string, unknown>;
    u?: Record<string, unknown>;
};
export declare type CursorState = {
    cmd: MongoInternalCommand;
} & Record<string, unknown>;
export interface MongoResponseHookInformation {
    data: CommandResult;
}
export declare type CommandResult = {
    result?: unknown;
    connection?: unknown;
    message?: unknown;
};
export declare type WireProtocolInternal = {
    insert: (server: MongoInternalTopology, ns: string, ops: unknown[], options: unknown | Function, callback?: Function) => unknown;
    update: (server: MongoInternalTopology, ns: string, ops: unknown[], options: unknown | Function, callback?: Function) => unknown;
    remove: (server: MongoInternalTopology, ns: string, ops: unknown[], options: unknown | Function, callback?: Function) => unknown;
    killCursors: (server: MongoInternalTopology, ns: string, cursorState: CursorState, callback: Function) => unknown;
    getMore: (server: MongoInternalTopology, ns: string, cursorState: CursorState, batchSize: number, options: unknown | Function, callback?: Function) => unknown;
    query: (server: MongoInternalTopology, ns: string, cmd: MongoInternalCommand, cursorState: CursorState, options: unknown | Function, callback?: Function) => unknown;
    command: (server: MongoInternalTopology, ns: string, cmd: MongoInternalCommand, options: unknown | Function, callback?: Function) => unknown;
};
export declare type MongoInternalTopology = {
    s?: {
        options?: {
            host?: string;
            port?: number;
            servername?: string;
        };
        host?: string;
        port?: number;
    };
    description?: {
        address?: string;
    };
};
export declare enum MongodbCommandType {
    CREATE_INDEXES = "createIndexes",
    FIND_AND_MODIFY = "findAndModify",
    IS_MASTER = "isMaster",
    COUNT = "count",
    UNKNOWN = "unknown"
}
export declare type Document = {
    [key: string]: any;
};
export declare type V4Connection = {
    command(ns: any, cmd: Document, options: undefined | unknown, callback: any): void;
};
//# sourceMappingURL=internal-types.d.ts.map
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { MongoDBInstrumentationConfig } from './types';
/** mongodb instrumentation plugin for OpenTelemetry */
export declare class MongoDBInstrumentation extends InstrumentationBase {
    protected _config: MongoDBInstrumentationConfig;
    constructor(_config?: MongoDBInstrumentationConfig);
    init(): InstrumentationNodeModuleDefinition<any>[];
    private _getV3Patches;
    private _getV4Patches;
    /** Creates spans for common operations */
    private _getV3PatchOperation;
    /** Creates spans for command operation */
    private _getV3PatchCommand;
    /** Creates spans for command operation */
    private _getV4PatchCommand;
    /** Creates spans for find operation */
    private _getV3PatchFind;
    /** Creates spans for find operation */
    private _getV3PatchCursor;
    /**
     * Get the mongodb command type from the object.
     * @param command Internal mongodb command object
     */
    private static _getCommandType;
    /**
     * Populate span's attributes by fetching related metadata from the context
     * @param span span to add attributes to
     * @param connectionCtx mongodb internal connection context
     * @param ns mongodb namespace
     * @param command mongodb internal representation of a command
     */
    private _populateV4Attributes;
    /**
     * Populate span's attributes by fetching related metadata from the context
     * @param span span to add attributes to
     * @param ns mongodb namespace
     * @param topology mongodb internal representation of the network topology
     * @param command mongodb internal representation of a command
     */
    private _populateV3Attributes;
    private _addAllSpanAttributes;
    private _defaultDbStatementSerializer;
    /**
     * Triggers the response hook in case it is defined.
     * @param span The span to add the results to.
     * @param result The command result
     */
    private _handleExecutionResult;
    /**
     * Ends a created span.
     * @param span The created span to end.
     * @param resultHandler A callback function.
     */
    private _patchEnd;
}
//# sourceMappingURL=instrumentation.d.ts.map
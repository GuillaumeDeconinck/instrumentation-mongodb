"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBInstrumentation = void 0;
const api_1 = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const internal_types_1 = require("./internal-types");
const version_1 = require("./version");
/** mongodb instrumentation plugin for OpenTelemetry */
class MongoDBInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(_config = {}) {
        super('@opentelemetry/instrumentation-mongodb', version_1.VERSION, _config);
        this._config = _config;
    }
    init() {
        const { v3Patch, v3Unpatch } = this._getV3Patches();
        const { v4Patch, v4Unpatch } = this._getV4Patches();
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition('mongodb', ['>=3.3 <4'], undefined, undefined, [
                new instrumentation_1.InstrumentationNodeModuleFile('mongodb/lib/core/wireprotocol/index.js', ['>=3.3 <4'], v3Patch, v3Unpatch),
            ]),
            new instrumentation_1.InstrumentationNodeModuleDefinition('mongodb', ['>=4 <6'], undefined, undefined, [
                new instrumentation_1.InstrumentationNodeModuleFile('mongodb/lib/cmap/connection.js', ['>=4 <6'], v4Patch, v4Unpatch),
            ]),
        ];
    }
    _getV3Patches() {
        return {
            v3Patch: (moduleExports, moduleVersion) => {
                api_1.diag.debug(`Applying patch for mongodb@${moduleVersion}`);
                // patch insert operation
                if ((0, instrumentation_1.isWrapped)(moduleExports.insert)) {
                    this._unwrap(moduleExports, 'insert');
                }
                this._wrap(moduleExports, 'insert', this._getV3PatchOperation('insert'));
                // patch remove operation
                if ((0, instrumentation_1.isWrapped)(moduleExports.remove)) {
                    this._unwrap(moduleExports, 'remove');
                }
                this._wrap(moduleExports, 'remove', this._getV3PatchOperation('remove'));
                // patch update operation
                if ((0, instrumentation_1.isWrapped)(moduleExports.update)) {
                    this._unwrap(moduleExports, 'update');
                }
                this._wrap(moduleExports, 'update', this._getV3PatchOperation('update'));
                // patch other command
                if ((0, instrumentation_1.isWrapped)(moduleExports.command)) {
                    this._unwrap(moduleExports, 'command');
                }
                this._wrap(moduleExports, 'command', this._getV3PatchCommand());
                // patch query
                if ((0, instrumentation_1.isWrapped)(moduleExports.query)) {
                    this._unwrap(moduleExports, 'query');
                }
                this._wrap(moduleExports, 'query', this._getV3PatchFind());
                // patch get more operation on cursor
                if ((0, instrumentation_1.isWrapped)(moduleExports.getMore)) {
                    this._unwrap(moduleExports, 'getMore');
                }
                this._wrap(moduleExports, 'getMore', this._getV3PatchCursor());
                return moduleExports;
            },
            v3Unpatch: (moduleExports, moduleVersion) => {
                if (moduleExports === undefined)
                    return;
                api_1.diag.debug(`Removing internal patch for mongodb@${moduleVersion}`);
                this._unwrap(moduleExports, 'insert');
                this._unwrap(moduleExports, 'remove');
                this._unwrap(moduleExports, 'update');
                this._unwrap(moduleExports, 'command');
                this._unwrap(moduleExports, 'query');
                this._unwrap(moduleExports, 'getMore');
            },
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _getV4Patches() {
        return {
            v4Patch: (moduleExports, moduleVersion) => {
                api_1.diag.debug(`Applying patch for mongodb@${moduleVersion}`);
                // patch insert operation
                if ((0, instrumentation_1.isWrapped)(moduleExports.Connection.prototype.command)) {
                    this._unwrap(moduleExports.Connection.prototype, 'command');
                }
                this._wrap(moduleExports.Connection.prototype, 'command', this._getV4PatchCommand());
                return moduleExports;
            },
            v4Unpatch: (moduleExports, moduleVersion) => {
                if (moduleExports === undefined)
                    return;
                api_1.diag.debug(`Removing internal patch for mongodb@${moduleVersion}`);
                this._unwrap(moduleExports.Connection.prototype, 'command');
            },
        };
    }
    /** Creates spans for common operations */
    _getV3PatchOperation(operationName) {
        const instrumentation = this;
        return (original) => {
            return function patchedServerCommand(server, ns, ops, options, callback) {
                const currentSpan = api_1.trace.getSpan(api_1.context.active());
                const resultHandler = typeof options === 'function' ? options : callback;
                if (!currentSpan ||
                    typeof resultHandler !== 'function' ||
                    typeof ops !== 'object') {
                    if (typeof options === 'function') {
                        return original.call(this, server, ns, ops, options);
                    }
                    else {
                        return original.call(this, server, ns, ops, options, callback);
                    }
                }
                const span = instrumentation.tracer.startSpan(`mongodb.${operationName}`, {
                    kind: api_1.SpanKind.CLIENT,
                });
                instrumentation._populateV3Attributes(span, ns, server, 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ops[0], operationName);
                const patchedCallback = instrumentation._patchEnd(span, resultHandler);
                // handle when options is the callback to send the correct number of args
                if (typeof options === 'function') {
                    return original.call(this, server, ns, ops, patchedCallback);
                }
                else {
                    return original.call(this, server, ns, ops, options, patchedCallback);
                }
            };
        };
    }
    /** Creates spans for command operation */
    _getV3PatchCommand() {
        const instrumentation = this;
        return (original) => {
            return function patchedServerCommand(server, ns, cmd, options, callback) {
                const currentSpan = api_1.trace.getSpan(api_1.context.active());
                const resultHandler = typeof options === 'function' ? options : callback;
                if (!currentSpan ||
                    typeof resultHandler !== 'function' ||
                    typeof cmd !== 'object') {
                    if (typeof options === 'function') {
                        return original.call(this, server, ns, cmd, options);
                    }
                    else {
                        return original.call(this, server, ns, cmd, options, callback);
                    }
                }
                const commandType = MongoDBInstrumentation._getCommandType(cmd);
                const type = commandType === internal_types_1.MongodbCommandType.UNKNOWN ? 'command' : commandType;
                const span = instrumentation.tracer.startSpan(`mongodb.${type}`, {
                    kind: api_1.SpanKind.CLIENT,
                });
                const operation = commandType === internal_types_1.MongodbCommandType.UNKNOWN ? undefined : commandType;
                instrumentation._populateV3Attributes(span, ns, server, cmd, operation);
                const patchedCallback = instrumentation._patchEnd(span, resultHandler);
                // handle when options is the callback to send the correct number of args
                if (typeof options === 'function') {
                    return original.call(this, server, ns, cmd, patchedCallback);
                }
                else {
                    return original.call(this, server, ns, cmd, options, patchedCallback);
                }
            };
        };
    }
    /** Creates spans for command operation */
    _getV4PatchCommand() {
        const instrumentation = this;
        return (original) => {
            return function patchedV4ServerCommand(ns, cmd, options, callback) {
                const currentSpan = api_1.trace.getSpan(api_1.context.active());
                const resultHandler = callback;
                if (!currentSpan ||
                    typeof resultHandler !== 'function' ||
                    typeof cmd !== 'object' ||
                    cmd.ismaster ||
                    cmd.hello) {
                    return original.call(this, ns, cmd, options, callback);
                }
                const commandType = Object.keys(cmd)[0];
                const span = instrumentation.tracer.startSpan(`mongodb.${commandType}`, {
                    kind: api_1.SpanKind.CLIENT,
                });
                instrumentation._populateV4Attributes(span, this, ns, cmd, commandType);
                const patchedCallback = instrumentation._patchEnd(span, resultHandler);
                return original.call(this, ns, cmd, options, patchedCallback);
            };
        };
    }
    /** Creates spans for find operation */
    _getV3PatchFind() {
        const instrumentation = this;
        return (original) => {
            return function patchedServerCommand(server, ns, cmd, cursorState, options, callback) {
                const currentSpan = api_1.trace.getSpan(api_1.context.active());
                const resultHandler = typeof options === 'function' ? options : callback;
                if (!currentSpan ||
                    typeof resultHandler !== 'function' ||
                    typeof cmd !== 'object') {
                    if (typeof options === 'function') {
                        return original.call(this, server, ns, cmd, cursorState, options);
                    }
                    else {
                        return original.call(this, server, ns, cmd, cursorState, options, callback);
                    }
                }
                const span = instrumentation.tracer.startSpan('mongodb.find', {
                    kind: api_1.SpanKind.CLIENT,
                });
                instrumentation._populateV3Attributes(span, ns, server, cmd, 'find');
                const patchedCallback = instrumentation._patchEnd(span, resultHandler);
                // handle when options is the callback to send the correct number of args
                if (typeof options === 'function') {
                    return original.call(this, server, ns, cmd, cursorState, patchedCallback);
                }
                else {
                    return original.call(this, server, ns, cmd, cursorState, options, patchedCallback);
                }
            };
        };
    }
    /** Creates spans for find operation */
    _getV3PatchCursor() {
        const instrumentation = this;
        return (original) => {
            return function patchedServerCommand(server, ns, cursorState, batchSize, options, callback) {
                const currentSpan = api_1.trace.getSpan(api_1.context.active());
                const resultHandler = typeof options === 'function' ? options : callback;
                if (!currentSpan || typeof resultHandler !== 'function') {
                    if (typeof options === 'function') {
                        return original.call(this, server, ns, cursorState, batchSize, options);
                    }
                    else {
                        return original.call(this, server, ns, cursorState, batchSize, options, callback);
                    }
                }
                const span = instrumentation.tracer.startSpan('mongodb.getMore', {
                    kind: api_1.SpanKind.CLIENT,
                });
                instrumentation._populateV3Attributes(span, ns, server, cursorState.cmd, 'getMore');
                const patchedCallback = instrumentation._patchEnd(span, resultHandler);
                // handle when options is the callback to send the correct number of args
                if (typeof options === 'function') {
                    return original.call(this, server, ns, cursorState, batchSize, patchedCallback);
                }
                else {
                    return original.call(this, server, ns, cursorState, batchSize, options, patchedCallback);
                }
            };
        };
    }
    /**
     * Get the mongodb command type from the object.
     * @param command Internal mongodb command object
     */
    static _getCommandType(command) {
        if (command.createIndexes !== undefined) {
            return internal_types_1.MongodbCommandType.CREATE_INDEXES;
        }
        else if (command.findandmodify !== undefined) {
            return internal_types_1.MongodbCommandType.FIND_AND_MODIFY;
        }
        else if (command.ismaster !== undefined) {
            return internal_types_1.MongodbCommandType.IS_MASTER;
        }
        else if (command.count !== undefined) {
            return internal_types_1.MongodbCommandType.COUNT;
        }
        else {
            return internal_types_1.MongodbCommandType.UNKNOWN;
        }
    }
    /**
     * Populate span's attributes by fetching related metadata from the context
     * @param span span to add attributes to
     * @param connectionCtx mongodb internal connection context
     * @param ns mongodb namespace
     * @param command mongodb internal representation of a command
     */
    _populateV4Attributes(span, connectionCtx, ns, command, operation) {
        let host, port;
        if (connectionCtx) {
            const hostParts = typeof connectionCtx.address === 'string'
                ? connectionCtx.address.split(':')
                : '';
            if (hostParts.length === 2) {
                host = hostParts[0];
                port = hostParts[1];
            }
        }
        // capture parameters within the query as well if enhancedDatabaseReporting is enabled.
        let commandObj;
        if ((command === null || command === void 0 ? void 0 : command.documents) && command.documents[0]) {
            commandObj = command.documents[0];
        }
        else if (command === null || command === void 0 ? void 0 : command.cursors) {
            commandObj = command.cursors;
        }
        else {
            commandObj = command;
        }
        this._addAllSpanAttributes(span, ns.db, ns.collection, host, port, commandObj, operation);
    }
    /**
     * Populate span's attributes by fetching related metadata from the context
     * @param span span to add attributes to
     * @param ns mongodb namespace
     * @param topology mongodb internal representation of the network topology
     * @param command mongodb internal representation of a command
     */
    _populateV3Attributes(span, ns, topology, command, operation) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // add network attributes to determine the remote server
        let host;
        let port;
        if (topology && topology.s) {
            host = (_b = (_a = topology.s.options) === null || _a === void 0 ? void 0 : _a.host) !== null && _b !== void 0 ? _b : topology.s.host;
            port = (_e = ((_d = (_c = topology.s.options) === null || _c === void 0 ? void 0 : _c.port) !== null && _d !== void 0 ? _d : topology.s.port)) === null || _e === void 0 ? void 0 : _e.toString();
            if (host == null || port == null) {
                const address = (_f = topology.description) === null || _f === void 0 ? void 0 : _f.address;
                if (address) {
                    const addressSegments = address.split(':');
                    host = addressSegments[0];
                    port = addressSegments[1];
                }
            }
        }
        // The namespace is a combination of the database name and the name of the
        // collection or index, like so: [database-name].[collection-or-index-name].
        // It could be a string or an instance of MongoDBNamespace, as such we
        // always coerce to a string to extract db and collection.
        const [dbName, dbCollection] = ns.toString().split('.');
        // capture parameters within the query as well if enhancedDatabaseReporting is enabled.
        const commandObj = (_h = (_g = command === null || command === void 0 ? void 0 : command.query) !== null && _g !== void 0 ? _g : command === null || command === void 0 ? void 0 : command.q) !== null && _h !== void 0 ? _h : command;
        this._addAllSpanAttributes(span, dbName, dbCollection, host, port, commandObj, operation);
    }
    _addAllSpanAttributes(span, dbName, dbCollection, host, port, commandObj, operation) {
        // add database related attributes
        span.setAttributes({
            [semantic_conventions_1.SemanticAttributes.DB_SYSTEM]: semantic_conventions_1.DbSystemValues.MONGODB,
            [semantic_conventions_1.SemanticAttributes.DB_NAME]: dbName,
            [semantic_conventions_1.SemanticAttributes.DB_MONGODB_COLLECTION]: dbCollection,
            [semantic_conventions_1.SemanticAttributes.DB_OPERATION]: operation,
        });
        if (host && port) {
            span.setAttributes({
                [semantic_conventions_1.SemanticAttributes.NET_PEER_NAME]: host,
                [semantic_conventions_1.SemanticAttributes.NET_PEER_PORT]: port,
            });
        }
        if (!commandObj)
            return;
        const dbStatementSerializer = typeof this._config.dbStatementSerializer === 'function'
            ? this._config.dbStatementSerializer
            : this._defaultDbStatementSerializer.bind(this);
        (0, instrumentation_1.safeExecuteInTheMiddle)(() => {
            const query = dbStatementSerializer(commandObj);
            span.setAttribute(semantic_conventions_1.SemanticAttributes.DB_STATEMENT, query);
        }, err => {
            if (err) {
                this._diag.error('Error running dbStatementSerializer hook', err);
            }
        }, true);
    }
    _defaultDbStatementSerializer(commandObj) {
        var _a;
        const enhancedDbReporting = !!((_a = this._config) === null || _a === void 0 ? void 0 : _a.enhancedDatabaseReporting);
        const resultObj = enhancedDbReporting
            ? commandObj
            : Object.keys(commandObj).reduce((obj, key) => {
                obj[key] = '?';
                return obj;
            }, {});
        return JSON.stringify(resultObj);
    }
    /**
     * Triggers the response hook in case it is defined.
     * @param span The span to add the results to.
     * @param result The command result
     */
    _handleExecutionResult(span, result) {
        const config = this.getConfig();
        if (typeof config.responseHook === 'function') {
            (0, instrumentation_1.safeExecuteInTheMiddle)(() => {
                config.responseHook(span, { data: result });
            }, err => {
                if (err) {
                    this._diag.error('Error running response hook', err);
                }
            }, true);
        }
    }
    /**
     * Ends a created span.
     * @param span The created span to end.
     * @param resultHandler A callback function.
     */
    _patchEnd(span, resultHandler) {
        // mongodb is using "tick" when calling a callback, this way the context
        // in final callback (resultHandler) is lost
        const activeContext = api_1.context.active();
        const instrumentation = this;
        return function patchedEnd(...args) {
            const error = args[0];
            if (error instanceof Error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error.message,
                });
            }
            else {
                const result = args[1];
                instrumentation._handleExecutionResult(span, result);
            }
            span.end();
            return api_1.context.with(activeContext, () => {
                return resultHandler.apply(this, args);
            });
        };
    }
}
exports.MongoDBInstrumentation = MongoDBInstrumentation;
//# sourceMappingURL=instrumentation.js.map
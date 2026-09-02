"use strict";
/**
 * Shared utility functions used across microservices
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathUtils = exports.ConsoleLogger = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Simple console logger implementation
 */
class ConsoleLogger {
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
        return `[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }
    info(message, meta) {
        console.log(this.formatMessage("info", message, meta));
    }
    error(message, error) {
        const errorMeta = error instanceof Error
            ? { error: error.message, stack: error.stack }
            : error;
        console.error(this.formatMessage("error", message, errorMeta));
    }
    warn(message, meta) {
        console.warn(this.formatMessage("warn", message, meta));
    }
    debug(message, meta) {
        if (process.env.NODE_ENV === "development") {
            console.debug(this.formatMessage("debug", message, meta));
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
/**
 * Path utilities for project structure navigation
 */
class PathUtils {
    /**
     * Find project root by looking for packages/shared directory
     *
     * Traverses up the directory tree from the start path to find
     * the project root (where packages/shared exists).
     *
     * @param startPath - Starting path to search from (typically __dirname)
     * @returns Absolute path to project root
     * @throws Error if project root cannot be found
     */
    static findProjectRoot(startPath) {
        let currentPath = startPath;
        const maxDepth = 10; // Prevent infinite loops
        let depth = 0;
        while (currentPath !== path.dirname(currentPath) && depth < maxDepth) {
            const packagesPath = path.join(currentPath, "packages", "shared");
            if (fs.existsSync(packagesPath)) {
                return currentPath;
            }
            currentPath = path.dirname(currentPath);
            depth++;
        }
        // Fallback: try from process.cwd() (useful in some deployment scenarios)
        const cwdPackagesPath = path.join(process.cwd(), "packages", "shared");
        if (fs.existsSync(cwdPackagesPath)) {
            return process.cwd();
        }
        throw new Error(`Could not find project root (packages/shared directory). ` +
            `Searched from: ${startPath}, cwd: ${process.cwd()}`);
    }
}
exports.PathUtils = PathUtils;
//# sourceMappingURL=index.js.map
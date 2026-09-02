"use strict";
/**
 * Shared package exports
 *
 * This package contains common types, utilities, and configurations
 * used across all microservices in the Viber bot architecture.
 *
 * Mongo/RabbitMQ connection helpers live at `@vbar/shared/infra` (not this
 * barrel) so Next.js Edge middleware can import ConfigHelper without loading
 * mongoose or amqplib.
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Types
__exportStar(require("./types"), exports);
// Utilities
__exportStar(require("./utils"), exports);
// Configuration
__exportStar(require("./config"), exports);
//# sourceMappingURL=index.js.map
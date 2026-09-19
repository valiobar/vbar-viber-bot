/**
 * Common TypeScript types and interfaces shared across all microservices
 *
 * Types are organized in separate files:
 * - common.ts: Base types, API responses, message queue types
 * - admin.ts: Admin service types (User, content DTOs, keyboard enums)
 * - ai.ts: AI↔admin builder contracts (keyboard now, carousel later)
 */

export * from "./common";
export * from "./admin";
export * from "./ai";


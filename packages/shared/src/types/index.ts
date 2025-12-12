/**
 * Common TypeScript types and interfaces shared across all microservices
 *
 * This file re-exports all types organized by service for backward compatibility.
 * Types are organized in separate files by service:
 * - common.ts: Base types, API responses, message queue types
 * - admin.ts: Admin service types (User, Config)
 * - viber.ts: Viber service types (Message, SendMessageRequest, etc.)
 * - ai.ts: AI service types (ProcessMessageRequest, DetectIntentRequest, etc.)
 */

// Common types
export * from "./common";

// Admin service types
export * from "./admin";

// Viber service types
export * from "./viber";

// AI service types
export * from "./ai";

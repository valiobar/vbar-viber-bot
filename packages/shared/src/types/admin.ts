/**
 * Types for Admin Service
 */

import { BaseEntity } from "./common";

/**
 * User interface
 */
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
  lastLoginAt?: string;
}

/**
 * Configuration interface
 */
export interface Config {
  bot: {
    enabled: boolean;
    welcomeMessage: string;
    defaultLanguage: string;
    autoReply: boolean;
    aiEnabled: boolean;
  };
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  analytics: {
    retentionDays: number;
    aggregationInterval: "hour" | "day" | "week" | "month";
  };
}

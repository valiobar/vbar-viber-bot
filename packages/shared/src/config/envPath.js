"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRootEnvPath = resolveRootEnvPath;
/**
 * Resolve the monorepo-root `.env` path.
 * Prefer a single root `.env` over per-service copies.
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function resolveRootEnvPath() {
    const candidates = [
        path_1.default.resolve(process.cwd(), ".env"), // cwd = repo root
        path_1.default.resolve(process.cwd(), "../../.env"), // cwd = services/<name>
        path_1.default.resolve(process.cwd(), "../.env"), // cwd = services/
    ];
    for (const candidate of candidates) {
        if (fs_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    return undefined;
}
//# sourceMappingURL=envPath.js.map
/**
 * LangSmith Tracing Configuration
 *
 * Initializes LangSmith tracing for LangChain if enabled via environment variables.
 * LangSmith is optional and can be disabled by not setting LANGSMITH_TRACING=true.
 */

import { ConfigHelper } from "@vbar/shared";

/**
 * Initialize LangSmith tracing for LangChain
 *
 * Sets LangChain environment variables if LangSmith tracing is enabled.
 * LangChain automatically uses LangSmith when LANGCHAIN_TRACING_V2=true
 * and LANGCHAIN_API_KEY are set.
 */
export function initializeLangSmith(): void {
  const isTracingEnabled = ConfigHelper.getEnvBoolean(
    "LANGSMITH_TRACING",
    false
  );

  if (isTracingEnabled) {
    // Set LangChain tracing environment variables
    process.env.LANGCHAIN_TRACING_V2 = "true";

    // Get API key from LANGSMITH_API_KEY env var
    const apiKey = process.env.LANGSMITH_API_KEY;
    if (apiKey) {
      process.env.LANGCHAIN_API_KEY = apiKey;
    } else {
      console.warn(
        "LangSmith tracing is enabled but LANGSMITH_API_KEY is not set. Tracing may not work correctly."
      );
    }

    // Get optional project name from LANGSMITH_PROJECT env var (if set)
    const project = process.env.LANGSMITH_PROJECT;
    if (project) {
      process.env.LANGCHAIN_PROJECT = project;
    }

    // Get optional endpoint from LANGSMITH_ENDPOINT env var (if set)
    const endpoint = process.env.LANGSMITH_ENDPOINT;
    if (endpoint) {
      process.env.LANGCHAIN_ENDPOINT = endpoint;
    }

    console.log("LangSmith tracing initialized");
    if (project) {
      console.log(`LangSmith project: ${project}`);
    }
    if (endpoint) {
      console.log(`LangSmith endpoint: ${endpoint}`);
    }
  } else {
    console.log("LangSmith tracing disabled");
  }
}

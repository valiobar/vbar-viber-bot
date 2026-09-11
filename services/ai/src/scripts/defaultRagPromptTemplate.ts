/**
 * Default RAG Prompt Template
 *
 * Mirrors the literal previously hardcoded in ChainExecutor.executeRAGChain.
 * Uses {context} and {question} placeholders for PromptTemplateService.renderTemplate.
 */

export const DEFAULT_RAG_TEMPLATE_NAME = "default_rag";

export const DEFAULT_RAG_PROMPT = `Based on the following context, answer the question. If the context doesn't contain enough information to answer the question, say so.

IMPORTANT: Keep your response under 700 characters.

Context:
{context}

Question: {question}

Answer:`;

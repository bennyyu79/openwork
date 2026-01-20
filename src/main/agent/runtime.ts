/* eslint-disable @typescript-eslint/no-unused-vars */
import { createDeepAgent } from "deepagents"
import { getDefaultModel } from "../ipc/models"
import { getApiKey, getThreadCheckpointPath, getBaseUrl, getAuthToken } from "../storage"
import { ChatAnthropic } from "@langchain/anthropic"
import { ChatOpenAI } from "@langchain/openai"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { SqlJsSaver } from "../checkpointer/sqljs-saver"
import { LocalSandbox } from "./local-sandbox"

import type * as _lcTypes from "langchain"
import type * as _lcMessages from "@langchain/core/messages"
import type * as _lcLanggraph from "@langchain/langgraph"
import type * as _lcZodTypes from "@langchain/core/utils/types"

import { BASE_SYSTEM_PROMPT } from "./system-prompt"

/**
 * Generate the full system prompt for the agent.
 *
 * @param workspacePath - The workspace path the agent is operating in
 * @returns The complete system prompt
 */
function getSystemPrompt(workspacePath: string): string {
  const workingDirSection = `
### File System and Paths

**IMPORTANT - Path Handling:**
- All file paths use fully qualified absolute system paths
- The workspace root is: \`${workspacePath}\`
- Example: \`${workspacePath}/src/index.ts\`, \`${workspacePath}/README.md\`
- To list the workspace root, use \`ls("${workspacePath}")\`
- Always use full absolute paths for all file operations
`

  return workingDirSection + BASE_SYSTEM_PROMPT
}

// Per-thread checkpointer cache
const checkpointers = new Map<string, SqlJsSaver>()

export async function getCheckpointer(threadId: string): Promise<SqlJsSaver> {
  let checkpointer = checkpointers.get(threadId)
  if (!checkpointer) {
    const dbPath = getThreadCheckpointPath(threadId)
    checkpointer = new SqlJsSaver(dbPath)
    await checkpointer.initialize()
    checkpointers.set(threadId, checkpointer)
  }
  return checkpointer
}

export async function closeCheckpointer(threadId: string): Promise<void> {
  const checkpointer = checkpointers.get(threadId)
  if (checkpointer) {
    await checkpointer.close()
    checkpointers.delete(threadId)
  }
}

// Get the appropriate model instance based on configuration
function getModelInstance(
  modelId?: string
): ChatAnthropic | ChatOpenAI | ChatGoogleGenerativeAI | string {
  const model = modelId || getDefaultModel()
  console.log("[Runtime] Using model:", model)

  // Check if using LiteLLM proxy (BASE_URL is set)
  const liteLLMBaseUrl = getBaseUrl("anthropic")

  // Determine provider from model ID
  if (model.startsWith("claude")) {
    // LiteLLM proxy uses OpenAI-compatible interface
    if (liteLLMBaseUrl) {
      const authToken = getAuthToken("anthropic")
      const apiKey = getApiKey("anthropic")

      console.log("[Runtime] Using LiteLLM proxy for Anthropic:", {
        hasApiKey: !!apiKey,
        hasAuthToken: !!authToken,
        baseUrl: liteLLMBaseUrl
      })

      // Use auth token if available, otherwise fall back to API key
      const effectiveKey = authToken || apiKey
      if (!effectiveKey) {
        throw new Error("API key not configured for LiteLLM proxy")
      }

      // Set OPENAI_API_KEY in process.env for OpenAI SDK
      // This is required because ChatOpenAI may check this env var internally
      process.env.OPENAI_API_KEY = effectiveKey

      // LiteLLM uses OpenAI-compatible API format
      return new ChatOpenAI({
        model,
        configuration: {
          baseURL: liteLLMBaseUrl
        }
      })
    }

    // Standard Anthropic API (no proxy)
    const authToken = getAuthToken("anthropic")
    const apiKey = getApiKey("anthropic")

    console.log("[Runtime] Anthropic config:", {
      hasApiKey: !!apiKey,
      hasAuthToken: !!authToken,
      baseUrl: "default (official API)"
    })

    // Use auth token if available, otherwise fall back to API key
    const effectiveKey = authToken || apiKey
    if (!effectiveKey) {
      throw new Error("Anthropic API key not configured")
    }

    return new ChatAnthropic({
      model,
      anthropicApiKey: effectiveKey
    })
  } else if (
    model.startsWith("gpt") ||
    model.startsWith("o1") ||
    model.startsWith("o3") ||
    model.startsWith("o4")
  ) {
    const apiKey = getApiKey("openai")
    const baseUrl = getBaseUrl("openai")

    console.log("[Runtime] OpenAI config:", {
      hasApiKey: !!apiKey,
      baseUrl: baseUrl || "default"
    })

    if (!apiKey) {
      throw new Error("OpenAI API key not configured")
    }

    const config: Record<string, unknown> = {
      model,
      openAIApiKey: apiKey
    }

    // Add custom base URL if configured (for proxy/custom endpoints)
    if (baseUrl) {
      config.configuration = {
        baseURL: baseUrl
      }
    }

    return new ChatOpenAI(config)
  } else if (model.startsWith("gemini")) {
    const apiKey = getApiKey("google")
    const baseUrl = getBaseUrl("google")

    console.log("[Runtime] Google config:", {
      hasApiKey: !!apiKey,
      baseUrl: baseUrl || "default"
    })

    if (!apiKey) {
      throw new Error("Google API key not configured")
    }

    // For Google, pass the config directly - the library will handle baseURL
    return new ChatGoogleGenerativeAI({
      model,
      apiKey: apiKey
    })
  }

  // Default to model string (let deepagents handle it)
  return model
}

export interface CreateAgentRuntimeOptions {
  /** Thread ID - REQUIRED for per-thread checkpointing */
  threadId: string
  /** Model ID to use (defaults to configured default model) */
  modelId?: string
  /** Workspace path - REQUIRED for agent to operate on files */
  workspacePath: string
}

// Create agent runtime with configured model and checkpointer
export type AgentRuntime = ReturnType<typeof createDeepAgent>

export async function createAgentRuntime(options: CreateAgentRuntimeOptions) {
  const { threadId, modelId, workspacePath } = options

  if (!threadId) {
    throw new Error("Thread ID is required for checkpointing.")
  }

  if (!workspacePath) {
    throw new Error(
      "Workspace path is required. Please select a workspace folder before running the agent."
    )
  }

  console.log("[Runtime] Creating agent runtime...")
  console.log("[Runtime] Thread ID:", threadId)
  console.log("[Runtime] Workspace path:", workspacePath)

  const model = getModelInstance(modelId)
  console.log("[Runtime] Model instance created:", typeof model)

  const checkpointer = await getCheckpointer(threadId)
  console.log("[Runtime] Checkpointer ready for thread:", threadId)

  const backend = new LocalSandbox({
    rootDir: workspacePath,
    virtualMode: false, // Use absolute system paths for consistency with shell commands
    timeout: 120_000, // 2 minutes
    maxOutputBytes: 100_000 // ~100KB
  })

  const systemPrompt = getSystemPrompt(workspacePath)

  // Custom filesystem prompt for absolute paths (matches virtualMode: false)
  const filesystemSystemPrompt = `You have access to a filesystem. All file paths use fully qualified absolute system paths.

- ls: list files in a directory (e.g., ls("${workspacePath}"))
- read_file: read a file from the filesystem
- write_file: write to a file in the filesystem
- edit_file: edit a file in the filesystem
- glob: find files matching a pattern (e.g., "**/*.py")
- grep: search for text within files

The workspace root is: ${workspacePath}`

  const agent = createDeepAgent({
    model,
    checkpointer,
    backend,
    systemPrompt,
    // Custom filesystem prompt for absolute paths (requires deepagents update)
    filesystemSystemPrompt,
    // Require human approval for all shell commands
    interruptOn: { execute: true }
  } as Parameters<typeof createDeepAgent>[0])

  console.log("[Runtime] Deep agent created with LocalSandbox at:", workspacePath)
  return agent
}

export type DeepAgent = ReturnType<typeof createDeepAgent>

// Clean up all checkpointer resources
export async function closeRuntime(): Promise<void> {
  const closePromises = Array.from(checkpointers.values()).map((cp) => cp.close())
  await Promise.all(closePromises)
  checkpointers.clear()
}

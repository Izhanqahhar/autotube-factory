import {
  envValue,
  isConfigured,
  resolveSelection,
  type Provider,
} from "./providers";

const MAX_MESSAGE_CHARS = 4000;
const MAX_MESSAGES = 24;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult = {
  content: string;
  model: string;
  provider: string;
  sample: boolean;
};

function assertSafeMessages(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages are required");
  }
  if (messages.length > MAX_MESSAGES) {
    throw new Error(`At most ${MAX_MESSAGES} messages per request.`);
  }
  return messages.map((message) => {
    if (!message || typeof message.content !== "string") {
      throw new Error("Each message needs text content.");
    }
    if (!["system", "user", "assistant"].includes(message.role)) {
      throw new Error("Invalid message role.");
    }
    if (message.content.length > MAX_MESSAGE_CHARS) {
      throw new Error(`Each message must be under ${MAX_MESSAGE_CHARS} characters.`);
    }
    return { role: message.role, content: message.content };
  });
}

async function callOpenAICompatible(
  provider: Provider,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const key = envValue(provider.envKey);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
  if (provider.id === "anthropic") {
    headers["anthropic-version"] = "2023-06-01";
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.4,
    }),
  });

  const text = await response.text();
  let payload: {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${provider.label} returned a non-JSON response.`);
  }
  if (!response.ok) {
    throw new Error(payload.error?.message || `${provider.label} request failed (${response.status}).`);
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`${provider.label} returned an empty reply.`);
  }
  return content;
}

export async function runChat(input: {
  model: string;
  messages: ChatMessage[];
}): Promise<ChatResult> {
  const messages = assertSafeMessages(input.messages);
  const { provider, model } = resolveSelection(input.model);

  if (!isConfigured(provider)) {
    const lastUser = [...messages].reverse().find((row) => row.role === "user")?.content || "";
    return {
      content: `${provider.sampleReply}\n\nYou asked: “${lastUser.slice(0, 240)}”`,
      model: `${provider.id}/${model}`,
      provider: provider.id,
      sample: true,
    };
  }

  const content = await callOpenAICompatible(provider, model, messages);
  return {
    content,
    model: `${provider.id}/${model}`,
    provider: provider.id,
    sample: false,
  };
}

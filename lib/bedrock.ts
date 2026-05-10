import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

// Use the full credential provider chain:
// 1. Env vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
// 2. AWS profile (default or AWS_PROFILE)
// 3. EC2/ECS instance metadata
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: fromNodeProviderChain(),
});

export async function callBedrock(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4096,
  modelId?: string
): Promise<string> {
  const resolvedModel =
    modelId ??
    process.env.BEDROCK_MODEL_ID ??
    "us.anthropic.claude-sonnet-4-6";

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  };

  const command = new InvokeModelCommand({
    modelId: resolvedModel,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.content[0].text;
}

export async function callBedrockJSON<T>(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4096,
  modelId?: string
): Promise<T> {
  const text = await callBedrock(systemPrompt, userMessage, maxTokens, modelId);
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) return JSON.parse(fenceMatch[1]) as T;
  const objMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) return JSON.parse(objMatch[1]) as T;
  throw new Error("No valid JSON found in Bedrock response: " + text.slice(0, 200));
}

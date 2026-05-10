import { config } from "dotenv";
config({ path: ".env.local" });

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: fromNodeProviderChain(),
});

const payload = {
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 16,
  system: "You are a test assistant.",
  messages: [{ role: "user", content: "Reply OK" }],
};

try {
  const r = await client.send(
    new InvokeModelCommand({
      modelId: "us.anthropic.claude-sonnet-4-6",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    })
  );
  const body = JSON.parse(new TextDecoder().decode(r.body));
  console.log("SUCCESS:", body.content[0].text);
} catch (e) {
  console.error("FAIL:", e.message);
}

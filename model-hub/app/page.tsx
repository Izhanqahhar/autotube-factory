"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ProviderRow = {
  id: string;
  label: string;
  configured: boolean;
  envKey: string;
  model: string;
};

type StatusPayload = {
  connected: number;
  total: number;
  providers: ProviderRow[];
  viewer: { name: string; simulated: boolean };
};

type ChatPayload = {
  content: string;
  model: string;
  provider: string;
  sample: boolean;
};

const FALLBACK_PROVIDERS: ProviderRow[] = [
  { id: "openai", label: "OpenAI", configured: false, envKey: "OPENAI_API_KEY", model: "openai/gpt-5.4" },
  { id: "anthropic", label: "Anthropic Claude", configured: false, envKey: "ANTHROPIC_API_KEY", model: "anthropic/claude-sonnet-4-6" },
  { id: "xai", label: "xAI Grok", configured: false, envKey: "XAI_API_KEY", model: "xai/grok-4.5" },
  { id: "moonshot", label: "Moonshot Kimi", configured: false, envKey: "MOONSHOT_API_KEY", model: "moonshot/kimi-latest" },
  { id: "gemini", label: "Google Gemini", configured: false, envKey: "GEMINI_API_KEY", model: "gemini/gemini-2.5-flash" },
  { id: "deepseek", label: "DeepSeek", configured: false, envKey: "DEEPSEEK_API_KEY", model: "deepseek/deepseek-chat" },
];

export default function HomePage() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [model, setModel] = useState("claude");
  const [prompt, setPrompt] = useState("Summarize what this hub is for in two sentences.");
  const [reply, setReply] = useState<ChatPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load provider status.");
        }
        const payload = (await response.json()) as StatusPayload;
        if (!cancelled) setStatus(payload);
      } catch (err) {
        if (!cancelled) {
          setStatus({
            connected: 0,
            total: FALLBACK_PROVIDERS.length,
            providers: FALLBACK_PROVIDERS,
            viewer: { name: "Local preview", simulated: true },
          });
          setError(err instanceof Error ? err.message : "Status failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const providers = status?.providers ?? FALLBACK_PROVIDERS;
  const options = useMemo(
    () => [
      { value: "claude", label: "Claude (short)" },
      { value: "gpt", label: "GPT (short)" },
      { value: "grok", label: "Grok (short)" },
      { value: "kimi", label: "Kimi (short)" },
      { value: "gemini", label: "Gemini (short)" },
      { value: "deepseek", label: "DeepSeek (short)" },
      ...providers.map((row) => ({ value: row.model, label: row.label })),
    ],
    [providers],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setReply(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Chat failed");
      }
      setReply(payload as ChatPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">Model Hub</div>
        <div className="viewer">
          {status?.viewer.simulated
            ? `Preview viewer · ${status.viewer.name}`
            : status?.viewer.name || "Loading viewer…"}
        </div>
      </header>

      <section className="hero">
        <h1>Model Hub</h1>
        <p>
          One signed-in desk for OpenAI, Claude, Grok, Kimi, Gemini, DeepSeek, and the rest.
          Point AnythingLLM or any OpenAI client at the same keys you bind here.
        </p>
      </section>

      <div className="layout">
        <section className="panel" aria-labelledby="chat-title">
          <h2 id="chat-title">Try a model</h2>
          <form className="chat-form" onSubmit={onSubmit}>
            <label>
              Model
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prompt
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={4000}
                required
              />
            </label>
            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
          {error ? <p className="error">{error}</p> : null}
          {reply ? (
            <div className="reply">
              <div className="badge">{reply.sample ? "Sample data" : reply.model}</div>
              {reply.content}
            </div>
          ) : null}
          <p className="note">
            Without provider secrets this page returns clearly labeled sample replies. Bind keys in
            Cursor Secrets, then republish, to call the live APIs.
          </p>
        </section>

        <aside className="panel" aria-labelledby="providers-title">
          <h2 id="providers-title">
            Providers · {status ? `${status.connected}/${status.total}` : "…"}
          </h2>
          <ul className="provider-list">
            {providers.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{row.label}</strong>
                  <div className="note" style={{ margin: 0 }}>
                    {row.configured ? row.model : row.envKey}
                  </div>
                </div>
                <span className={`pill ${row.configured ? "" : "missing"}`}>
                  {row.configured ? "Live" : "Sample"}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}

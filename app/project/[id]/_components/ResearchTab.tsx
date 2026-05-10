"use client";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

interface Research {
  id: string;
  summary: string;
  claims: string;
  sources: string;
  hooks: string;
  statistics: string;
  updatedAt: string;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition-colors"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

export default function ResearchTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Research | null>(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/research`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [projectId]);

  async function regenerate() {
    setRegen(true);
    await fetch(`/api/projects/${projectId}/research`, { method: "POST" });
    await load();
    setRegen(false);
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading research...</div>;
  if (!data) return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-4">No research data yet.</p>
      <button onClick={regenerate} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors">
        🔬 Generate Research
      </button>
    </div>
  );

  const claims: string[] = (() => { try { return JSON.parse(data.claims); } catch { return []; } })();
  const sources: { type: string; description: string }[] = (() => { try { return JSON.parse(data.sources); } catch { return []; } })();
  const hooks: string[] = (() => { try { return JSON.parse(data.hooks); } catch { return []; } })();
  const stats: { stat: string; context: string }[] = (() => { try { return JSON.parse(data.statistics); } catch { return []; } })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">Last updated: {formatDate(data.updatedAt)}</div>
        <button onClick={regenerate} disabled={regen} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors">
          {regen ? "⟳ Regenerating..." : "🔄 Regenerate"}
        </button>
      </div>

      {/* Summary */}
      <Section title="📋 Summary" action={<CopyBtn text={data.summary} />}>
        <p className="text-gray-300 leading-relaxed">{data.summary}</p>
      </Section>

      {/* Claims */}
      <Section title={`✅ Key Claims (${claims.length})`} action={<CopyBtn text={claims.join("\n")} />}>
        <ol className="space-y-2">
          {claims.map((c, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="text-purple-400 font-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-gray-300">{c}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* Statistics */}
      <Section title={`📊 Statistics (${stats.length})`} action={<CopyBtn text={stats.map((s) => `${s.stat} — ${s.context}`).join("\n")} />}>
        <div className="space-y-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-cyan-400 font-medium text-sm">{s.stat}</div>
              <div className="text-gray-400 text-xs mt-1">{s.context}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Hooks */}
      <Section title={`🎣 Emotional Hooks (${hooks.length})`} action={<CopyBtn text={hooks.join("\n")} />}>
        <div className="space-y-2">
          {hooks.map((h, i) => (
            <div key={i} className="bg-orange-900/20 border border-orange-800/30 rounded-lg px-3 py-2 text-sm text-orange-200">{h}</div>
          ))}
        </div>
      </Section>

      {/* Sources */}
      <Section title={`📚 Sources (${sources.length})`} action={<CopyBtn text={sources.map((s) => `[${s.type}] ${s.description}`).join("\n")} />}>
        <div className="space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-xs shrink-0">{s.type}</span>
              <span className="text-gray-300">{s.description}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

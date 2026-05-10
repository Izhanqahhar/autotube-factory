"use client";
import { useEffect, useState } from "react";

interface Script {
  id: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  fullScript: string;
  wordCount: number;
  qualityScore: number;
  updatedAt: string;
}

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition-colors"
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

export default function ScriptTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<"hook" | "body" | "cta" | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/script`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [projectId]);

  async function regenerate() {
    setRegen(true);
    await fetch(`/api/projects/${projectId}/script`, { method: "POST" });
    await load();
    setRegen(false);
  }

  function startEdit(field: "hook" | "body" | "cta") {
    setEditing(field);
    setEditVal(data?.[field] ?? "");
  }

  async function saveEdit() {
    if (!editing || !data) return;
    setSaving(true);
    const r = await fetch(`/api/projects/${projectId}/script`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [editing]: editVal }),
    });
    if (r.ok) {
      const updated = await r.json();
      setData(updated);
    }
    setSaving(false);
    setEditing(null);
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading script...</div>;
  if (!data) return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-4">No script yet.</p>
      <button onClick={regenerate} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors">
        📝 Generate Script
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm">{data.wordCount} words</span>
          <span className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-sm">⭐ {data.qualityScore}/100</span>
        </div>
        <div className="flex gap-2">
          <CopyBtn text={data.fullScript} label="Copy Full Script" />
          <button
            onClick={() => {
              const blob = new Blob([data.fullScript], { type: "text/plain" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = "script.txt"; a.click();
            }}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition-colors"
          >
            ⬇ Download .txt
          </button>
          <button onClick={regenerate} disabled={regen} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-3 py-1.5 rounded text-sm transition-colors">
            {regen ? "⟳ Regen..." : "🔄 Regenerate"}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="text-sm text-gray-500 mb-1">Video Title</div>
        <div className="text-xl font-bold text-white">{data.title}</div>
      </div>

      {/* Hook */}
      <ScriptSection
        label="🪝 Hook"
        labelColor="text-purple-400"
        bgColor="bg-purple-900/10 border-purple-800/30"
        content={data.hook}
        isEditing={editing === "hook"}
        editVal={editVal}
        saving={saving}
        onEdit={() => startEdit("hook")}
        onEditChange={setEditVal}
        onSave={saveEdit}
        onCancel={() => setEditing(null)}
      />

      {/* Body */}
      <ScriptSection
        label="📖 Body"
        labelColor="text-white"
        bgColor="bg-gray-900 border-gray-800"
        content={data.body}
        isEditing={editing === "body"}
        editVal={editVal}
        saving={saving}
        onEdit={() => startEdit("body")}
        onEditChange={setEditVal}
        onSave={saveEdit}
        onCancel={() => setEditing(null)}
        rows={12}
      />

      {/* CTA */}
      <ScriptSection
        label="📣 Call to Action"
        labelColor="text-green-400"
        bgColor="bg-green-900/10 border-green-800/30"
        content={data.cta}
        isEditing={editing === "cta"}
        editVal={editVal}
        saving={saving}
        onEdit={() => startEdit("cta")}
        onEditChange={setEditVal}
        onSave={saveEdit}
        onCancel={() => setEditing(null)}
      />
    </div>
  );
}

function ScriptSection({
  label, labelColor, bgColor, content,
  isEditing, editVal, saving, rows = 6,
  onEdit, onEditChange, onSave, onCancel,
}: {
  label: string; labelColor: string; bgColor: string; content: string;
  isEditing: boolean; editVal: string; saving: boolean; rows?: number;
  onEdit: () => void; onEditChange: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`border rounded-xl p-5 space-y-3 ${bgColor}`}>
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${labelColor}`}>{label}</span>
        <div className="flex gap-2">
          <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="text-xs bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">
            {copied ? "✓" : "Copy"}
          </button>
          {!isEditing && (
            <button onClick={onEdit} className="text-xs bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">
              Edit
            </button>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editVal}
            onChange={(e) => onEditChange(e.target.value)}
            rows={rows}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none focus:border-purple-500"
          />
          <div className="flex gap-2">
            <button onClick={onSave} disabled={saving} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm transition-colors">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      )}
    </div>
  );
}

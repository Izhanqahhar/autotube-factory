"use client";
import { useEffect, useState } from "react";
import { formatTime, BEAT_TYPE_COLORS } from "@/lib/utils";

interface Scene {
  id: string;
  sceneNumber: number;
  title: string;
  content: string;
  duration: number;
  beatType: string;
  timeStart: number;
  timeEnd: number;
}

export default function ScenesTab({ projectId }: { projectId: string }) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Scene>>({});

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/scenes`);
      if (r.ok) setScenes(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [projectId]);

  async function regenerate() {
    setRegen(true);
    await fetch(`/api/projects/${projectId}/scenes`, { method: "POST" });
    await load();
    setRegen(false);
  }

  async function deleteScene(id: string) {
    if (!confirm("Delete this scene?")) return;
    await fetch(`/api/scenes/${id}`, { method: "DELETE" });
    setScenes((s) => s.filter((x) => x.id !== id));
  }

  async function saveEdit(id: string) {
    const r = await fetch(`/api/scenes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    if (r.ok) {
      const updated = await r.json();
      setScenes((s) => s.map((x) => (x.id === id ? updated : x)));
    }
    setEditing(null);
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading scenes...</div>;
  if (!scenes.length) return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-4">No scenes yet.</p>
      <button onClick={regenerate} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors">
        🎬 Generate Scenes
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{scenes.length} scenes</span>
        <button onClick={regenerate} disabled={regen} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors">
          {regen ? "⟳ Regenerating..." : "🔄 Regenerate"}
        </button>
      </div>

      <div className="grid gap-3">
        {scenes.map((s) => {
          const beatColor = BEAT_TYPE_COLORS[s.beatType] ?? BEAT_TYPE_COLORS.transition;
          const isEditing = editing === s.id;
          return (
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Title</label>
                      <input value={editData.title ?? s.title} onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm outline-none mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Beat Type</label>
                      <select value={editData.beatType ?? s.beatType} onChange={(e) => setEditData((d) => ({ ...d, beatType: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm outline-none mt-1">
                        {["hook","problem","statistic","explanation","proof","example","transition","cta"].map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Content</label>
                    <textarea value={editData.content ?? s.content} onChange={(e) => setEditData((d) => ({ ...d, content: e.target.value }))}
                      rows={4} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm outline-none resize-none mt-1" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(s.id)} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded text-sm transition-colors">Save</button>
                    <button onClick={() => setEditing(null)} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded text-sm transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="text-2xl font-bold text-gray-700 w-8 shrink-0">
                    {String(s.sceneNumber).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">{s.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${beatColor}`}>{s.beatType}</span>
                      <span className="text-xs text-gray-500">{formatTime(s.timeStart)} – {formatTime(s.timeEnd)}</span>
                      <span className="text-xs text-gray-600">{s.duration}s</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-2 leading-relaxed line-clamp-3">{s.content}</p>
                  </div>
                  <div className="flex items-start gap-2 shrink-0">
                    <button onClick={() => { setEditing(s.id); setEditData({}); }}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">
                      Edit
                    </button>
                    <button onClick={() => deleteScene(s.id)}
                      className="text-xs bg-red-900/30 hover:bg-red-900/60 text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

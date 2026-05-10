"use client";
import { useEffect, useState } from "react";
import { formatTime, IMAGE_TYPE_COLORS } from "@/lib/utils";

interface ImagePrompt {
  id: string;
  promptNumber: number;
  timeStart: number;
  timeEnd: number;
  minuteBucket: number;
  beatIndex: number;
  title: string;
  shortPrompt: string;
  altPrompt?: string | null;
  imageType: string;
  status: string;
  generatedImageUrl?: string | null;
  generatedImagePath?: string | null;
}

interface EditModal {
  prompt: ImagePrompt;
  shortPrompt: string;
  altPrompt: string;
  title: string;
  imageType: string;
}

interface ImageGenResult {
  url?: string;
  localPath?: string;
  source?: string;
  error?: string;
}

const IMAGE_TYPES = ["hero", "b-roll", "metaphor", "statistic", "explainer", "transition", "emotion"];

const IMAGE_SOURCES = [
  { id: "auto", label: "🔀 Auto (Best Available)", description: "ComfyUI → Pollinations → HuggingFace → stock" },
  { id: "comfyui", label: "🖥️ ComfyUI (Local)", description: "Local Stable Diffusion. Needs ComfyUI running at port 8188." },
  { id: "pollinations", label: "🌸 Pollinations.ai", description: "Free, no key needed. FLUX model." },
  { id: "huggingface", label: "🤗 HuggingFace", description: "Free SDXL. Needs HUGGINGFACE_API_KEY." },
  { id: "unsplash", label: "📷 Unsplash", description: "Free stock photos. Needs UNSPLASH_ACCESS_KEY." },
  { id: "pexels", label: "🎞️ Pexels", description: "Free stock photos. Needs PEXELS_API_KEY." },
  { id: "pixabay", label: "🌍 Pixabay", description: "Free stock images. Needs PIXABAY_API_KEY." },
];

export default function ImagePromptsTab({ projectId, duration }: { projectId: string; duration: number }) {
  const [prompts, setPrompts] = useState<ImagePrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterMin, setFilterMin] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<EditModal | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageSource, setImageSource] = useState("auto");
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [imageResults, setImageResults] = useState<Record<string, ImageGenResult>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/image-prompts`);
      if (r.ok) setPrompts(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [projectId]);

  async function regenerate() {
    setRegen(true);
    await fetch(`/api/projects/${projectId}/image-prompts`, { method: "POST" });
    await load();
    setRegen(false);
  }

  async function deletePrompt(id: string) {
    await fetch(`/api/image-prompts/${id}`, { method: "DELETE" });
    setPrompts((p) => p.filter((x) => x.id !== id));
    setSelected((s) => { const ns = new Set(s); ns.delete(id); return ns; });
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} selected prompts?`)) return;
    await Promise.all(Array.from(selected).map((id) => fetch(`/api/image-prompts/${id}`, { method: "DELETE" })));
    setPrompts((p) => p.filter((x) => !selected.has(x.id)));
    setSelected(new Set());
  }

  async function saveModal() {
    if (!modal) return;
    setSaving(true);
    const r = await fetch(`/api/image-prompts/${modal.prompt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: modal.title,
        shortPrompt: modal.shortPrompt,
        altPrompt: modal.altPrompt || null,
        imageType: modal.imageType,
      }),
    });
    if (r.ok) {
      const updated = await r.json();
      setPrompts((p) => p.map((x) => (x.id === modal.prompt.id ? updated : x)));
    }
    setSaving(false);
    setModal(null);
  }

  async function generateImage(prompt: ImagePrompt) {
    setGeneratingIds((s) => { const ns = new Set(s); ns.add(prompt.id); return ns; });
    try {
      const r = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.shortPrompt,
          imageType: prompt.imageType,
          source: imageSource,
          width: 1280,
          height: 720,
          promptId: prompt.id,  // ← DB update after download
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setImageResults((prev) => ({ ...prev, [prompt.id]: data }));
        // Update prompt in list with the generated image info
        setPrompts((p) => p.map((x) => x.id === prompt.id
          ? { ...x, generatedImageUrl: data.url, generatedImagePath: data.localPath }
          : x
        ));
      } else {
        setImageResults((prev) => ({ ...prev, [prompt.id]: { error: data.error ?? "Failed" } }));
      }
    } catch (e: unknown) {
      setImageResults((prev) => ({ ...prev, [prompt.id]: { error: e instanceof Error ? e.message : "Network error" } }));
    } finally {
      setGeneratingIds((s) => { const ns = new Set(s); ns.delete(prompt.id); return ns; });
    }
  }

  async function bulkGenerateImages() {
    if (!confirm(`Generate images for all ${filtered.length} visible prompts using ${imageSource}? This may take a while.`)) return;
    setBulkGenerating(true);
    // Run 3 at a time
    const chunks = [];
    for (let i = 0; i < filtered.length; i += 3) chunks.push(filtered.slice(i, i + 3));
    for (const chunk of chunks) {
      await Promise.all(chunk.map((p) => generateImage(p)));
    }
    setBulkGenerating(false);
  }

  function openModal(p: ImagePrompt) {
    setModal({ prompt: p, shortPrompt: p.shortPrompt, altPrompt: p.altPrompt ?? "", title: p.title, imageType: p.imageType });
  }

  function toggleSelect(id: string) {
    setSelected((s) => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  }

  function copyAll() {
    const text = filtered.map((p) => `[${p.promptNumber}] ${formatTime(p.timeStart)}-${formatTime(p.timeEnd)} | ${p.imageType.toUpperCase()}\n${p.shortPrompt}${p.altPrompt ? `\nALT: ${p.altPrompt}` : ""}`).join("\n\n");
    navigator.clipboard.writeText(text);
  }

  function downloadAll() {
    const text = filtered.map((p) => `Prompt #${p.promptNumber}\nTime: ${formatTime(p.timeStart)} - ${formatTime(p.timeEnd)}\nMinute: ${p.minuteBucket}\nType: ${p.imageType}\nTitle: ${p.title}\nPrompt: ${p.shortPrompt}${p.altPrompt ? `\nAlt: ${p.altPrompt}` : ""}\n`).join("\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "image-prompts.txt"; a.click();
  }

  const minutes = [...new Set(prompts.map((p) => p.minuteBucket))].sort((a, b) => a - b);
  const filtered = prompts.filter((p) => {
    if (filterType !== "all" && p.imageType !== filterType) return false;
    if (filterMin > 0 && p.minuteBucket !== filterMin) return false;
    return true;
  });

  const generatedCount = prompts.filter((p) => imageResults[p.id]?.localPath || p.generatedImagePath).length;

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading image prompts...</div>;

  return (
    <div className="space-y-4">
      {/* Image Generation Banner */}
      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-800/30 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-white text-sm font-medium">🖼️ Image Generation</div>
            <div className="text-gray-400 text-xs">
              {imageSource === "comfyui"
                ? "🖥️ ComfyUI Local — uses your installed Stable Diffusion models. Best quality."
                : imageSource === "pollinations"
                ? "🌸 Pollinations.ai — FREE, no API key needed. FLUX model, 1280×720."
                : imageSource === "auto"
                ? "🔀 Auto mode — tries ComfyUI → Pollinations → HuggingFace → stock photos."
                : IMAGE_SOURCES.find((s) => s.id === imageSource)?.description ?? "Select an image source above."}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select
              value={imageSource}
              onChange={(e) => setImageSource(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none"
            >
              {IMAGE_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={bulkGenerateImages}
              disabled={bulkGenerating || !prompts.length}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              {bulkGenerating ? "⟳ Generating..." : `🖼️ Generate All (${filtered.length})`}
            </button>
            {generatedCount > 0 && (
              <span className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded-full">
                {generatedCount}/{prompts.length} generated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-800/40 rounded-xl px-4 py-2">
          <span className="text-3xl font-bold text-purple-400">{prompts.length}</span>
          <div>
            <div className="text-white text-sm font-medium">Image Prompts</div>
            <div className="text-gray-500 text-xs">{duration} min × 12/min target</div>
          </div>
        </div>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
          <option value="all">All Types</option>
          {IMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={filterMin} onChange={(e) => setFilterMin(Number(e.target.value))}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
          <option value={0}>All Minutes</option>
          {minutes.map((m) => <option key={m} value={m}>Minute {m}</option>)}
        </select>

        <div className="ml-auto flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={bulkDelete} className="bg-red-900/40 hover:bg-red-900/70 text-red-300 px-3 py-2 rounded-lg text-sm transition-colors">
              🗑️ Delete {selected.size}
            </button>
          )}
          <button onClick={copyAll} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors">
            📋 Copy All
          </button>
          <button onClick={downloadAll} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors">
            ⬇ Download
          </button>
          <button onClick={regenerate} disabled={regen} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors">
            {regen ? "⟳ Regenerating..." : "🔄 Regenerate"}
          </button>
        </div>
      </div>

      {!prompts.length ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No image prompts yet.</p>
          <button onClick={regenerate} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            🖼️ Generate Image Prompts
          </button>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="p-3 text-left">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="p-3 text-left text-gray-400 font-medium">#</th>
                <th className="p-3 text-left text-gray-400 font-medium">Time</th>
                <th className="p-3 text-left text-gray-400 font-medium">Min</th>
                <th className="p-3 text-left text-gray-400 font-medium">Type</th>
                <th className="p-3 text-left text-gray-400 font-medium">Title</th>
                <th className="p-3 text-left text-gray-400 font-medium">Prompt</th>
                <th className="p-3 text-left text-gray-400 font-medium">Image</th>
                <th className="p-3 text-left text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const typeColor = IMAGE_TYPE_COLORS[p.imageType] ?? "bg-gray-500/20 text-gray-300";
                const isSel = selected.has(p.id);
                const imgResult = imageResults[p.id];
                const hasImage = imgResult?.localPath || p.generatedImagePath;
                const imageSrc = imgResult?.localPath || p.generatedImagePath;
                const isGenerating = generatingIds.has(p.id);
                return (
                  <tr key={p.id} className={`border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors ${isSel ? "bg-purple-900/10" : i % 2 === 0 ? "bg-gray-900/20" : ""}`}>
                    <td className="p-3">
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)} className="rounded" />
                    </td>
                    <td className="p-3 text-gray-500 font-mono">{String(p.promptNumber).padStart(2, "0")}</td>
                    <td className="p-3 text-gray-400 whitespace-nowrap">{formatTime(p.timeStart)}–{formatTime(p.timeEnd)}</td>
                    <td className="p-3 text-gray-500">{p.minuteBucket}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor}`}>{p.imageType}</span>
                    </td>
                    <td className="p-3 text-gray-300 max-w-[120px] truncate">{p.title}</td>
                    <td className="p-3 text-gray-400 max-w-[220px]">
                      <span className="line-clamp-2 text-xs leading-relaxed">{p.shortPrompt}</span>
                    </td>
                    {/* Image preview cell */}
                    <td className="p-3">
                      {hasImage ? (
                        <button
                          onClick={() => setPreviewImage(imageSrc!)}
                          className="relative group"
                          title="Click to preview"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageSrc!}
                            alt="Generated"
                            className="w-16 h-9 object-cover rounded border border-gray-700 group-hover:border-green-500 transition-colors"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded flex items-center justify-center transition-all">
                            <span className="opacity-0 group-hover:opacity-100 text-white text-xs">🔍</span>
                          </div>
                          {imgResult?.source && (
                            <div className="text-xs mt-0.5 text-center">
                              {imgResult.source === "comfyui"
                                ? <span className="text-purple-400">🖥️ local</span>
                                : imgResult.source === "pollinations"
                                ? <span className="text-green-500">🌸</span>
                                : imgResult.source === "huggingface"
                                ? <span className="text-yellow-500">🤗</span>
                                : imgResult.source === "unsplash" || imgResult.source === "pexels" || imgResult.source === "pixabay"
                                ? <span className="text-blue-400">📷 {imgResult.source}</span>
                                : <span className="text-gray-600">{imgResult.source}</span>}
                            </div>
                          )}
                        </button>
                      ) : imgResult?.error ? (
                        <span className="text-xs text-red-400" title={imgResult.error}>⚠️ Error</span>
                      ) : isGenerating ? (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                          <span className="animate-spin">⟳</span>
                          <span>Generating</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => generateImage(p)}
                          disabled={isGenerating}
                          className="text-xs bg-green-900/30 hover:bg-green-900/60 disabled:opacity-50 text-green-400 hover:text-green-300 px-2 py-1 rounded transition-colors"
                          title={`Generate with ${imageSource}`}
                        >
                          {isGenerating
                            ? "⟳"
                            : imageSource === "comfyui"
                            ? "🖥️"
                            : imageSource === "huggingface"
                            ? "🤗"
                            : imageSource === "unsplash" || imageSource === "pexels" || imageSource === "pixabay"
                            ? "📷"
                            : "🌸"}
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(p.shortPrompt)}
                          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition-colors" title="Copy prompt">
                          📋
                        </button>
                        <button onClick={() => openModal(p)}
                          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">
                          Edit
                        </button>
                        <button onClick={() => deletePrompt(p.id)}
                          className="text-xs bg-red-900/30 hover:bg-red-900/60 text-red-400 px-2 py-1 rounded transition-colors">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Edit Prompt #{modal.prompt.promptNumber}</h3>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Title</label>
                <input value={modal.title} onChange={(e) => setModal((m) => m && ({ ...m, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Image Type</label>
                <select value={modal.imageType} onChange={(e) => setModal((m) => m && ({ ...m, imageType: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500">
                  {IMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Prompt</label>
                <textarea value={modal.shortPrompt} onChange={(e) => setModal((m) => m && ({ ...m, shortPrompt: e.target.value }))}
                  rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Alt Prompt (optional)</label>
                <textarea value={modal.altPrompt} onChange={(e) => setModal((m) => m && ({ ...m, altPrompt: e.target.value }))}
                  rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none focus:border-purple-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveModal} disabled={saving}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => { saveModal(); }}
                disabled={saving}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                title="Save and generate image"
              >
                💾 + 🌸 Generate
              </button>
              <button onClick={() => setModal(null)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-gray-400 hover:text-white text-sm">
              ✕ Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Preview" className="w-full rounded-xl border border-gray-700 shadow-2xl" />
            <div className="flex gap-2 mt-3 justify-center">
              <a href={previewImage} download target="_blank" rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
                ⬇ Download
              </a>
              <button onClick={() => navigator.clipboard.writeText(previewImage)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
                📋 Copy URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

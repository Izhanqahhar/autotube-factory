"use client";
import { useEffect, useState } from "react";

const STEPS = [
  { key: "research", label: "Research", icon: "🔬", progress: 15 },
  { key: "script", label: "Script", icon: "📝", progress: 35 },
  { key: "scenes", label: "Scenes", icon: "🎬", progress: 55 },
  { key: "image-prompts", label: "Image Prompts", icon: "🖼️", progress: 75 },
  { key: "voiceover", label: "Voiceover", icon: "🎙️", progress: 90 },
  { key: "done", label: "Complete", icon: "✅", progress: 100 },
];

interface StatusData {
  status: string;
  currentStep: string;
  progress: number;
  errorMessage?: string;
}

export default function GenerationProgress({
  projectId,
  onComplete,
}: {
  projectId: string;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`/api/projects/${projectId}/status`);
        const d: StatusData = await r.json();
        setStatus(d);
        if (d.status === "completed" || d.status === "failed") {
          onComplete();
          return;
        }
        setTimeout(poll, 3000);
      } catch {
        setTimeout(poll, 5000);
      }
    };
    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!status) return null;

  const progress = status.progress ?? 0;
  const stepIdx = STEPS.findIndex((s) => s.key === status.currentStep);

  return (
    <div className="bg-gray-900 border border-yellow-800/50 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-yellow-400 animate-pulse" />
        <span className="text-yellow-300 font-medium">
          Generating asset pack... {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className="bg-purple-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((step, i) => {
          const isDone = i < stepIdx || status.currentStep === "done";
          const isCurrent = step.key === status.currentStep;
          return (
            <div
              key={step.key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                isDone
                  ? "bg-green-900/30 text-green-400"
                  : isCurrent
                  ? "bg-yellow-900/30 text-yellow-300 border border-yellow-700/50"
                  : "bg-gray-800 text-gray-600"
              }`}
            >
              <span>{isDone ? "✓" : step.icon}</span>
              <span>{step.label}</span>
              {isCurrent && <span className="animate-spin text-xs">⟳</span>}
            </div>
          );
        })}
      </div>

      {status.errorMessage && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          Error: {status.errorMessage}
        </div>
      )}
    </div>
  );
}

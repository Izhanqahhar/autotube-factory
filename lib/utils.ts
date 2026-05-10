import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const BEAT_TYPE_COLORS: Record<string, string> = {
  hook: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  problem: "bg-red-500/20 text-red-300 border-red-500/30",
  statistic: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  explanation: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  proof: "bg-green-500/20 text-green-300 border-green-500/30",
  example: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  transition: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  cta: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

export const IMAGE_TYPE_COLORS: Record<string, string> = {
  hero: "bg-purple-500/20 text-purple-300",
  "b-roll": "bg-blue-500/20 text-blue-300",
  metaphor: "bg-pink-500/20 text-pink-300",
  statistic: "bg-cyan-500/20 text-cyan-300",
  explainer: "bg-green-500/20 text-green-300",
  transition: "bg-gray-500/20 text-gray-300",
  emotion: "bg-orange-500/20 text-orange-300",
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-gray-500/20 text-gray-300" },
  generating: { label: "Generating", color: "bg-yellow-500/20 text-yellow-300" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-300" },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-300" },
};

export const DURATION_OPTIONS = [
  { value: 1, label: "1 min", prompts: 12, words: 150 },
  { value: 2, label: "2 min", prompts: 24, words: 300 },
  { value: 3, label: "3 min", prompts: 36, words: 450 },
  { value: 5, label: "5 min", prompts: 60, words: 750 },
  { value: 8, label: "8 min", prompts: 96, words: 1200 },
  { value: 10, label: "10 min", prompts: 120, words: 1500 },
  { value: 15, label: "15 min", prompts: 180, words: 2250 },
];

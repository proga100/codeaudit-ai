"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface HealthScoreProps {
  score: number; // 0-100
  grade: string; // A-F
  size?: "sm" | "lg";
}

function getScoreColor(score: number): string {
  if (score > 70) return "#22c55e";
  if (score > 40) return "#eab308";
  return "#ef4444";
}

export function HealthScore({ score, grade, size = "sm" }: HealthScoreProps) {
  const dim = size === "sm" ? 56 : 110;
  const strokeWidth = size === "sm" ? 4 : 6;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  const scoreFontSize = size === "sm" ? 14 : 28;
  const gradeFontSize = size === "sm" ? 9 : 14;
  const scoreY = size === "sm" ? "48%" : "46%";
  const gradeY = size === "sm" ? "72%" : "66%";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        size === "sm" ? "w-14 h-14" : "w-[110px] h-[110px]"
      )}
    >
      <svg width={dim} height={dim} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[hsl(var(--border))]"
        />
        {/* Score arc */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold leading-none"
          style={{ fontSize: scoreFontSize, color }}
        >
          {score}
        </span>
        <span
          className="font-semibold uppercase text-muted-foreground leading-none"
          style={{ fontSize: gradeFontSize }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}

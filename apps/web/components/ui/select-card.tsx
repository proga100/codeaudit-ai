"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SelectCard({
  selected,
  onClick,
  children,
  className,
}: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[14px] p-5 cursor-pointer transition-all duration-200 text-left w-full",
        selected
          ? "border-2 border-[hsl(var(--accent))] bg-[hsl(var(--accent-subtle))] shadow-[0_0_0_1px_hsl(var(--accent)/0.2),0_2px_12px_hsl(var(--accent)/0.1)]"
          : "border-2 border-transparent bg-[hsl(var(--surface))] hover:border-[hsl(var(--border))]",
        className
      )}
    >
      {children}
    </button>
  );
}

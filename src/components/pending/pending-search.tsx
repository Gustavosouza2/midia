"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Finding the person is the main way into this screen, so the search is full width and tall. */
export function PendingSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label="Buscar pessoa"
        placeholder="Buscar pessoa pelo nome"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 bg-background pl-11 text-base tablet:h-11 tablet:rounded-[10px] tablet:text-sm"
      />
    </div>
  );
}

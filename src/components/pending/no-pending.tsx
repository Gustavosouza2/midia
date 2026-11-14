import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function NoPending({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="items-center gap-1.5 px-4 py-7 text-center tablet:px-5 tablet:py-10">
      <strong className="font-semibold">{title}</strong>
      {children}
    </Card>
  );
}

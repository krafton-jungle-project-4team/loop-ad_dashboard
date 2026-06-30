import type { ReactNode } from "react";
import { Card } from "../../../components/ui/primitives.js";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-base font-semibold text-slate-950">{title}</h2>
      {children}
    </Card>
  );
}

import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  const label = `loopad:${id}:${phase}:${Math.round(commitTime)}`;

  performance.mark(`${label}:start`, { startTime });
  performance.mark(`${label}:commit`, { startTime: commitTime });
  performance.measure(label, `${label}:start`, `${label}:commit`);

  console.info("[profiler]", {
    id,
    phase,
    actualDuration: Number(actualDuration.toFixed(2)),
    baseDuration: Number(baseDuration.toFixed(2)),
    commitTime: Number(commitTime.toFixed(2))
  });
};

export function DevProfiler({ children, id }: { children: ReactNode; id: string }) {
  if (!import.meta.env.DEV) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}

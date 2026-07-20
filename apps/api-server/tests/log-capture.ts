export async function captureJsonLogs<T>(callback: () => Promise<T>) {
  const logs: Array<Record<string, unknown>> = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const capture = (line?: unknown) => {
    if (typeof line === "string") {
      logs.push(JSON.parse(line) as Record<string, unknown>);
    }
  };

  console.log = capture;
  console.warn = capture;
  console.error = capture;

  try {
    const result = await callback();
    return { logs, result };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

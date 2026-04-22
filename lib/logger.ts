const isDevelopment = process.env.NODE_ENV === "development";
const observabilityEnabled = process.env.OBSERVABILITY_LOGS !== "false";

export function logDevError(scope: string, error: unknown, metadata?: unknown) {
  if (!isDevelopment) {
    return;
  }

  const serializedError =
    error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : error;

  console.error(`[${scope}]`, {
    error: serializedError,
    metadata,
  });
}

export function logServerInfo(scope: string, metadata?: unknown) {
  if (!observabilityEnabled) {
    return;
  }

  console.info(`[${scope}]`, metadata ?? {});
}

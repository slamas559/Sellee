const isDevelopment = process.env.NODE_ENV === "development";

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

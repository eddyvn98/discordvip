function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serialize(item)]),
    );
  }

  return value;
}

export const logger = {
  info(message: string, meta?: unknown) {
    console.log(
      JSON.stringify({ level: "info", message, meta: serialize(meta), time: new Date().toISOString() }),
    );
  },
  warn(message: string, meta?: unknown) {
    console.warn(
      JSON.stringify({ level: "warn", message, meta: serialize(meta), time: new Date().toISOString() }),
    );
  },
  error(message: string, meta?: unknown) {
    console.error(
      JSON.stringify({ level: "error", message, meta: serialize(meta), time: new Date().toISOString() }),
    );
  },
};

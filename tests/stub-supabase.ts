export const calls: { op: string; table: string; payload?: unknown; id?: string }[] = [];
export const net = { offline: false };

function result() {
  return { error: net.offline ? { message: "TypeError: Failed to fetch" } : null };
}

export function createClient() {
  return {
    from(table: string) {
      return {
        upsert: async (row: unknown) => (net.offline ? result() : (calls.push({ op: "upsert", table, payload: row }), result())),
        update: (patch: unknown) => ({
          eq: async (_c: string, id: string) => (net.offline ? result() : (calls.push({ op: "update", table, payload: patch, id }), result())),
        }),
        delete: () => ({
          eq: async (_c: string, id: string) => (net.offline ? result() : (calls.push({ op: "delete", table, id }), result())),
        }),
      };
    },
  };
}

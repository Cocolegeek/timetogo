export const calls: { op: string; table: string; payload?: unknown; id?: string }[] = [];
export const net = { offline: false };

type StubError = { code?: string; message?: string; status?: number } | null;
export const authCalls: { fn: string; args: unknown }[] = [];
export const authFail: Record<string, StubError> = {};

function result() {
  return { error: net.offline ? { message: "TypeError: Failed to fetch" } : null };
}

export function createClient() {
  const record = (fn: string) => async (args?: unknown) => {
    authCalls.push({ fn, args });
    return { error: authFail[fn] ?? null };
  };
  return {
    auth: {
      signInWithOtp: record("signInWithOtp"),
      verifyOtp: record("verifyOtp"),
      updateUser: record("updateUser"),
      getUser: async () => ({ data: { user: { id: "u1" } } }),
    },
    rpc: async (name: string) => {
      calls.push({ op: "rpc", table: name });
      return name === "create_guest_transfer"
        ? { data: authFail.rpc_create ? null : "tok-1", error: authFail.rpc_create ?? null }
        : { data: { trips: 2, merged: true }, error: authFail.rpc_claim ?? null };
    },
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

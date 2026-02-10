// utils/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

function logParams(label: string, params: any) {
  console.log(`-- ${label} Parameters:`);
  console.dir(params, { depth: null });
}

function logResults(label: string, data: any, error?: any) {
  console.log(`-- ${label} Results:`);
  console.dir(data, { depth: null });
  if (error) {
    console.dir(error, { depth: null });
  }
}

export const createDebugClient = () => {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handler = {
    get(target: any, prop: string) {
      const original = target[prop];

      if (typeof original === "function") {
        return (...args: any[]) => {
          logParams(`Supabase.${prop}`, args);
          const result = original.apply(target, args);

          if (result instanceof Promise) {
            return result
              .then((res: any) => {
                logResults(`Supabase.${prop}`, res?.data, res?.error);
                return res;
              })
              .catch((err: any) => {
                console.error(`Supabase.${prop} - Error:`, err);
                throw err;
              });
          }

          logResults(`Supabase.${prop}`, result);
          return result;
        };
      }

      return original;
    },
  };

  return new Proxy(client, handler);
};

// Export both clients
export const supabaseStandard = createClient();
export const supabaseDebug = createDebugClient();

// utils/supabase/clients.ts

import { createBrowserClient } from "@supabase/ssr";

// Create different clients for each database
export const createClientForDb = (url: string, anonKey: string) => {
  return createBrowserClient(url, anonKey);
};

// You could export pre-configured clients
export const db1Client = createClientForDb(
  process.env.NEXT_PUBLIC_DB1_URL!,
  process.env.NEXT_PUBLIC_DB1_ANON_KEY!
);

export const db2Client = createClientForDb(
  process.env.NEXT_PUBLIC_DB2_URL!,
  process.env.NEXT_PUBLIC_DB2_ANON_KEY!
);

// Or create a function to get a client dynamically
export const getDbClient = (dbName: string) => {
  const dbConfigs: Record<string, { url: string; key: string }> = {
    db1: {
      url: process.env.NEXT_PUBLIC_DB1_URL!,
      key: process.env.NEXT_PUBLIC_DB1_ANON_KEY!
    },
    db2: {
      url: process.env.NEXT_PUBLIC_DB2_URL!,
      key: process.env.NEXT_PUBLIC_DB2_ANON_KEY!
    },
    // Add configurations for all 10 databases
  };

  const config = dbConfigs[dbName];
  if (!config) {
    throw new Error(`No configuration found for database: ${dbName}`);
  }

  return createClientForDb(config.url, config.key);
};
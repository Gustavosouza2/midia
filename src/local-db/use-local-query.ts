import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { getLocalDb, type CanteenLocalDb } from "./index";

/**
 * Reads the local database and refreshes itself when the tables it read change.
 * `query` must be stable (declared outside the component).
 * Returns undefined until the first read finishes.
 */
export function useLocalQuery<T>(query: (db: CanteenLocalDb) => Promise<T>): T | undefined {
  const [value, setValue] = useState<T>();

  useEffect(() => {
    const subscription = liveQuery(() => query(getLocalDb())).subscribe({
      next: setValue,
      error: (error) => console.error("Failed to read the local database", error),
    });
    return () => subscription.unsubscribe();
  }, [query]);

  return value;
}

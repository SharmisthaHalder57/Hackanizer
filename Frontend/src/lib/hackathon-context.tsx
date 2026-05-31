/**
 * hackathon-context.tsx
 *
 * React context that provides the currently selected hackathon's data
 * throughout the app. All dashboard pages can consume this to display
 * the hackathon name and other metadata without re-fetching.
 */
import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from 'react';
import { hackathons, getHackathonId, type HackathonData } from './api';

interface HackathonContextValue {
  /** The full hackathon object for the current session, or null if not loaded yet. */
  hackathon: HackathonData | null;
  /** Convenience accessor for the hackathon ID string. */
  hackathonId: string | null;
  /** True while the hackathon data is being fetched. */
  loading: boolean;
  /** Call this to refresh context after login. */
  refresh: () => void;
}

const HackathonContext = createContext<HackathonContextValue>({
  hackathon: null,
  hackathonId: null,
  loading: false,
  refresh: () => {},
});

export function HackathonProvider({ children }: { children: ReactNode }) {
  const [hackathon, setHackathon] = useState<HackathonData | null>(null);
  const [loading, setLoading] = useState(false);

  const hackathonId = getHackathonId();

  const fetchHackathon = async () => {
    const id = getHackathonId();
    if (!id) return;
    setLoading(true);
    try {
      const data = await hackathons.get(id);
      setHackathon(data);
    } catch {
      // Silently fail — dashboards degrade gracefully without hackathon metadata
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHackathon();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HackathonContext.Provider
      value={{ hackathon, hackathonId, loading, refresh: fetchHackathon }}
    >
      {children}
    </HackathonContext.Provider>
  );
}

/** Hook to consume hackathon context in any component. */
export function useHackathon() {
  return useContext(HackathonContext);
}

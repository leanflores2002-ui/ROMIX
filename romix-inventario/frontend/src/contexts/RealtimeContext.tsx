import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../services/supabase';

const RealtimeContext = createContext(0);

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel('romix-inventory-stock')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'product_variants' },
        () => setRevision((current) => current + 1)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const value = useMemo(() => revision, [revision]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useInventoryRevision = () => useContext(RealtimeContext);

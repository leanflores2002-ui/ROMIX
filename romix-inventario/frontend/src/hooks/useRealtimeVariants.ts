import { useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useRealtimeVariants = (onChange: () => void) => {
  useEffect(() => {
    const channel = supabase
      .channel('product-variants-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, () => {
        onChange();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange]);
};


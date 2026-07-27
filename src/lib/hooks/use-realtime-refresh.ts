'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * Refresca los datos de la ruta actual (router.refresh) cada vez que
 * cambia algo en cualquiera de las tablas dadas, vía Supabase Realtime.
 * Requiere que la tabla esté agregada a la publicación `supabase_realtime`.
 */
export function useRealtimeRefresh(tables: string[]) {
  const router = useRouter();
  const key = tables.join(',');

  useEffect(() => {
    const channel = supabase.channel(`realtime-refresh:${key}`);
    for (const table of key.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        router.refresh();
      });
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

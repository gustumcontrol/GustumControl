import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    // Al volver a una página visitada hace poco (ej. saltar entre
    // Habitaciones y Reservas durante el turno), se muestra al instante lo
    // que ya está en el cache del navegador mientras Next.js revalida en
    // segundo plano. No afecta a revalidatePath() (las acciones del
    // servidor) ni a router.refresh() (usado por el realtime de Supabase):
    // ambos siguen forzando datos frescos como hasta ahora.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;

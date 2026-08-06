import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/icon';
import { AddHotelForm } from '@/components/add-hotel-form';
import { DEFAULT_ROUTE_BY_ROLE } from '@/lib/roles';
import { selectHotel } from '@/lib/actions/hotels';
import type { Role } from '@/lib/types';

// Paleta pastel para el mockup de cada tarjeta de hotel — se asigna por
// orden, ciclando si hay más hoteles que colores.
const HOTEL_PALETTE = [
  { panel: '#EAF2FF', bar: '#BFDBFE', badge: '#4A90E2' },
  { panel: '#E6FBF5', bar: '#B7EFDD', badge: '#2FBF9F' },
  { panel: '#FDEFFB', bar: '#F3D3F0', badge: '#C15FD1' },
  { panel: '#FFF3E6', bar: '#FBE0BC', badge: '#F0A03C' },
  { panel: '#EFF1FF', bar: '#D6DAFC', badge: '#6C7CE0' },
  { panel: '#FFF0F0', bar: '#FBD2D2', badge: '#E2634A' },
];

// Wordmarks propios por hotel (public/) — donde no haya uno, se muestra el
// nombre en texto normal.
const HOTEL_TITLE_IMAGE: Record<string, string> = {
  'Los Toreros': '/LosToreros2.png',
  'Hostal las Fuentes': '/Fuentes2.png',
};

export default async function HotelesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, hotel_id')
    .eq('id', user.id)
    .single();

  const role = (profile?.role as Role) ?? 'recepcion';

  if (role !== 'admin') {
    redirect(DEFAULT_ROUTE_BY_ROLE[role] ?? '/dashboard');
  }

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, active')
    .order('created_at');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="flex items-center justify-between px-6 h-16 shrink-0"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Gustum Control" className="h-7 w-auto" />
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--text-2)' }}>
            {profile?.full_name}
          </span>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ border: '1px solid var(--line-2)', color: 'var(--text-2)' }}
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--light)' }}>
          Selecciona un hotel
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>
          Elige a qué hotel quieres entrar.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
          {(hotels ?? []).map((hotel, i) => {
            const palette = HOTEL_PALETTE[i % HOTEL_PALETTE.length];
            return (
              <form key={hotel.id} action={selectHotel}>
                <input type="hidden" name="hotelId" value={hotel.id} />
                <button
                  type="submit"
                  className="w-full rounded-2xl p-1.5 flex flex-col gap-2 text-center transition-shadow hover:shadow-md cursor-pointer"
                  style={{ background: 'var(--card-c)' }}
                >
                  <div
                    className="relative rounded-xl flex items-center justify-center px-5"
                    style={{ background: palette.panel, minHeight: 108 }}
                  >
                    <span
                      className="rounded-full flex items-center justify-center shrink-0 shadow-sm"
                      style={{ width: 56, height: 56, background: palette.badge }}
                    >
                      <Icon name="hotel" style="duotone" size={24} color="#FFFFFF" secondaryOpacity={0.6} />
                    </span>
                  </div>

                  <div className="pb-1">
                    {HOTEL_TITLE_IMAGE[hotel.name] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={HOTEL_TITLE_IMAGE[hotel.name]}
                        alt={hotel.name}
                        className="block mx-auto object-contain"
                        style={{ height: 14, width: 'auto', maxWidth: '65%' }}
                      />
                    ) : (
                      <p className="text-sm font-semibold" style={{ color: 'var(--light)' }}>
                        {hotel.name}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                      {hotel.active ? 'Entrar' : 'Inactivo'}
                    </p>
                  </div>
                </button>
              </form>
            );
          })}

          <AddHotelForm />
        </div>
      </main>
    </div>
  );
}

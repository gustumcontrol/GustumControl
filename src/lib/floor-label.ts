const FLOOR_ORDINALS: Record<string, string> = {
  '1': 'Primera planta',
  '2': 'Segunda planta',
  '3': 'Tercera planta',
  '4': 'Cuarta planta',
  '5': 'Quinta planta',
  '6': 'Sexta planta',
  '7': 'Séptima planta',
  '8': 'Octava planta',
  '9': 'Novena planta',
  '10': 'Décima planta',
};

// Hostal las Fuentes es de una sola planta — en vez de repetir "Primera
// planta" en cada habitación (no distingue nada, no hay una segunda),
// se muestra el nombre del hotel.
const HOTEL_FLOOR_OVERRIDE: Record<string, string> = {
  'hostal-las-fuentes': 'Hotel Nuevo',
};

export function floorLabel(floor: string | null | undefined, hotelSlug?: string | null) {
  if (hotelSlug && HOTEL_FLOOR_OVERRIDE[hotelSlug]) {
    return HOTEL_FLOOR_OVERRIDE[hotelSlug];
  }
  if (!floor) return '—';
  return FLOOR_ORDINALS[floor] ?? `Planta ${floor}`;
}

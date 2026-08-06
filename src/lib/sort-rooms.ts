// rooms.number es texto, así que un ORDER BY de Postgres lo ordena
// alfabéticamente ("1", "13", "15", ... "3", "4") en vez de numéricamente.
// localeCompare con numeric:true entiende los números dentro del texto.
export function sortByRoomNumber<T extends { number: string | null }>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) =>
    (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true, sensitivity: 'base' })
  );
}

-- El bucket ya es público (public=true), así que las fotos se sirven por
-- URL directa sin necesidad de esta policy — solo habilitaba poder listar
-- todos los archivos del bucket, que no hace falta y no conviene exponer.
drop policy "maintenance-photos: lectura pública" on storage.objects;

'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/custom-select';
import { openMaintenanceIssue } from '@/lib/actions/maintenance';
import { supabase } from '@/lib/supabase/client';

type RoomOption = { id: string; number: string; floor: string; type: string };

export function AddMaintenanceIssueDialog({ rooms }: { rooms: RoomOption[] }) {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setRoomId('');
    setDescription('');
    setPhotos([]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomId) {
      setError('Falta seleccionar la habitación.');
      return;
    }
    if (!description.trim()) {
      setError('Falta describir qué le pasa a la habitación.');
      return;
    }

    const photoUrls: string[] = [];

    if (photos.length > 0) {
      setIsUploading(true);
      for (const photo of photos) {
        const ext = photo.name.split('.').pop();
        const path = `${roomId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('maintenance-photos')
          .upload(path, photo);

        if (uploadError) {
          setIsUploading(false);
          setError(`No se pudo subir la foto: ${uploadError.message}`);
          return;
        }

        photoUrls.push(
          supabase.storage.from('maintenance-photos').getPublicUrl(path).data.publicUrl
        );
      }
      setIsUploading(false);
    }

    startTransition(async () => {
      const result = await openMaintenanceIssue(roomId, description.trim(), photoUrls);
      if (result?.error) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
    });
  };

  const busy = isUploading || isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>Reportar incidencia</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar incidencia de mantenimiento</DialogTitle>
          <DialogDescription>
            La habitación queda bloqueada (no se puede reservar) hasta que se marque como
            realizada.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Habitación</Label>
            <CustomSelect
              value={roomId}
              onChange={setRoomId}
              placeholder="Selecciona una habitación"
              searchable
              searchPlaceholder="Buscar habitación..."
              options={rooms.map((r) => ({
                value: r.id,
                label: `${r.number} · ${r.type} (piso ${r.floor})`,
              }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issue-description">¿Qué le pasa a la habitación?</Label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: aire acondicionado no enfría, gotea el lavamanos..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issue-photo">Fotos (opcional)</Label>
            <input
              id="issue-photo"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
              className="text-sm cursor-pointer"
              style={{ color: 'var(--text-2)' }}
            />
            {photos.length > 0 && (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {photos.length} foto{photos.length === 1 ? '' : 's'} seleccionada
                {photos.length === 1 ? '' : 's'}.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {isUploading ? 'Subiendo foto...' : isPending ? 'Reportando...' : 'Reportar incidencia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/icon';
import { PhotoLightbox } from '@/components/photo-lightbox';
import { editMaintenanceIssue, updateMaintenanceIssueStatus } from '@/lib/actions/maintenance';
import { supabase } from '@/lib/supabase/client';
import type { MaintenanceIssueRow } from '@/components/maintenance-task-list';
import type { MaintenanceStatus } from '@/lib/types';

const NEXT_STATUS: Record<string, Exclude<MaintenanceStatus, 'NO'>> = {
  PENDIENTE: 'EN PROCESO',
  'EN PROCESO': 'REALIZADO',
};

const NEXT_LABEL: Record<string, string> = {
  PENDIENTE: 'Empezar',
  'EN PROCESO': 'Marcar realizado',
};

function fullDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MaintenanceIssueDialog({
  issue,
  open,
  onOpenChange,
}: {
  issue: MaintenanceIssueRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [description, setDescription] = useState(issue.description);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const nextStatus = NEXT_STATUS[issue.status];
  const hasChanges = description.trim() !== issue.description || newPhotos.length > 0;

  const reset = () => {
    setDescription(issue.description);
    setNewPhotos([]);
    setError('');
  };

  const handleSave = () => {
    if (!description.trim()) {
      setError('La descripción no puede quedar vacía.');
      return;
    }
    setError('');
    startTransition(async () => {
      const photoUrls: string[] = [];

      if (newPhotos.length > 0) {
        setUploading(true);
        for (const photo of newPhotos) {
          const ext = photo.name.split('.').pop();
          const path = `${issue.room_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('maintenance-photos')
            .upload(path, photo);

          if (uploadError) {
            setUploading(false);
            setError(`No se pudo subir la foto: ${uploadError.message}`);
            return;
          }

          photoUrls.push(
            supabase.storage.from('maintenance-photos').getPublicUrl(path).data.publicUrl
          );
        }
        setUploading(false);
      }

      const result = await editMaintenanceIssue(issue.id, description.trim(), photoUrls);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNewPhotos([]);
    });
  };

  const handleAdvance = () => {
    if (!nextStatus) return;
    setError('');
    startTransition(async () => {
      const result = await updateMaintenanceIssueStatus(issue.id, nextStatus);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  };

  const busy = isPending || uploading;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Habitación {issue.room?.number ?? '—'}</DialogTitle>
          <DialogDescription>
            Reportada el {fullDate(issue.opened_at)}
            {issue.opened_by_name ? ` por ${issue.opened_by_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {issue.photo_urls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {issue.photo_urls.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="block cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${i + 1} de la incidencia`}
                    className="rounded-lg h-24 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
              Descripción
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
              Agregar más fotos
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setNewPhotos(Array.from(e.target.files ?? []))}
              className="text-sm cursor-pointer"
              style={{ color: 'var(--text-2)' }}
            />
            {newPhotos.length > 0 && (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {newPhotos.length} foto{newPhotos.length === 1 ? '' : 's'} nueva
                {newPhotos.length === 1 ? '' : 's'} lista{newPhotos.length === 1 ? '' : 's'} para
                subir.
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter className="sm:flex-col-reverse sm:items-stretch">
          {hasChanges && (
            <Button variant="outline" className="w-full" onClick={handleSave} disabled={busy}>
              {uploading ? 'Subiendo fotos...' : isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          )}
          {nextStatus && (
            <Button className="w-full" onClick={handleAdvance} disabled={busy}>
              <Icon name="wrench" style="duotone" size={14} color="#FFFFFF" />
              {isPending ? 'Actualizando...' : NEXT_LABEL[issue.status]}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={issue.photo_urls}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </Dialog>
  );
}

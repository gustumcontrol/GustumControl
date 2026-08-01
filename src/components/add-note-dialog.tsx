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
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/icon';
import { updateReservationNotes } from '@/lib/actions/reservations';

export function AddNoteDialog({
  reservationId,
  guestName,
  notes,
}: {
  reservationId: string;
  guestName: string;
  notes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(notes ?? '');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await updateReservationNotes(reservationId, value);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(notes ?? '');
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Icon name="comment-dots" style="duotone" size={12} />
        {notes ? 'Editar nota' : 'Añadir nota'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nota de recepción</DialogTitle>
          <DialogDescription>
            Visible en la tarjeta de la reserva de {guestName}.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ej: llegó pasada la medianoche, pide que no se limpie antes de las 11:00."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar nota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

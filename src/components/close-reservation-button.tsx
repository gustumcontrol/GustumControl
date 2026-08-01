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
import { Icon } from '@/components/icon';
import { closeReservation } from '@/lib/actions/reservations';

export function CloseReservationButton({
  reservationId,
  guestName,
  variant = 'outline',
}: {
  reservationId: string;
  guestName: string;
  variant?: 'default' | 'outline';
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError('');
    startTransition(async () => {
      const result = await closeReservation(reservationId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size="sm" />}>
        <Icon name="door-open" style="duotone" size={12} />
        Cerrar reserva
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar reserva</DialogTitle>
          <DialogDescription>
            Esto archiva la reserva de {guestName} y libera la habitación. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Cerrando...' : 'Confirmar cierre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

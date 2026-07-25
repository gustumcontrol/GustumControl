'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { closeReservation } from '@/lib/actions/reservations';
import type { RoomStatus, ComputedRoomStatus } from '@/lib/types';

export function RoomDetailDialog({
  room,
  children,
}: {
  room: RoomStatus;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const status = room.computed_status as ComputedRoomStatus;
  const isBookableToday = status === 'LIBRE' || status === 'RESERVADA';
  const isFuture = status === 'RESERVADA';

  const handleClose = () => {
    if (!room.reservation_id) return;
    setError('');
    startTransition(async () => {
      const result = await closeReservation(room.reservation_id!);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left w-full cursor-pointer transition-transform hover:-translate-y-0.5"
      >
        {children}
      </button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Habitación {room.number}
            <StatusBadge status={status} />
          </DialogTitle>
          <DialogDescription>
            {room.type} · Piso {room.floor}
          </DialogDescription>
        </DialogHeader>

        {status === 'LIBRE' ? (
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Esta habitación está libre y lista para una nueva reserva.
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
            {isFuture && (
              <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>
                Libre hoy — tiene una reserva a futuro.
              </p>
            )}
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-3)' }}>Huésped</span>
              <span className="font-medium">{room.guest_name}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-3)' }}>Entrada</span>
              <span>{room.check_in}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-3)' }}>Salida</span>
              <span>{room.check_out}</span>
            </div>
            {!isFuture && (
              <>
                {room.cleaning_status && room.cleaning_status !== 'NO' && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-3)' }}>Limpieza</span>
                    <span>{room.cleaning_status}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-3)' }}>Mantenimiento</span>
                  <span>{room.maintenance_status}</span>
                </div>
              </>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          {isBookableToday ? (
            <Link href={`/reservas/nueva?room=${room.room_id}`} className="w-full sm:w-auto">
              <Button className="w-full">Crear reserva para hoy</Button>
            </Link>
          ) : (
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              {isPending ? 'Cerrando...' : 'Cerrar reserva'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

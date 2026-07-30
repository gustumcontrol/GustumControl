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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/status-badge';
import { closeReservation } from '@/lib/actions/reservations';
import { assignRoomToStaff, releaseStaffRoom } from '@/lib/actions/staff-assignments';
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
  const [assigning, setAssigning] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffNotes, setStaffNotes] = useState('');

  const status = room.computed_status as ComputedRoomStatus;
  const isFuture = status === 'RESERVADA';

  const resetAssignForm = () => {
    setAssigning(false);
    setStaffName('');
    setStaffNotes('');
  };

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

  const handleAssign = () => {
    if (!staffName.trim()) {
      setError('Falta el nombre del empleado.');
      return;
    }
    setError('');
    startTransition(async () => {
      const result = await assignRoomToStaff(room.room_id!, staffName.trim(), staffNotes.trim());
      if (result?.error) {
        setError(result.error);
        return;
      }
      resetAssignForm();
      setOpen(false);
    });
  };

  const handleRelease = () => {
    if (!room.staff_assignment_id) return;
    setError('');
    startTransition(async () => {
      const result = await releaseStaffRoom(room.staff_assignment_id!);
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
      onOpenChange={(next) => {
        setOpen(next);
        setError('');
        if (!next) resetAssignForm();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left w-full cursor-pointer transition-transform hover:-translate-y-0.5"
        style={{ padding: '6px', background: 'white', borderRadius: 'var(--radius-lg)' }}
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

        {assigning ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              Esta habitación queda bloqueada (no se puede reservar) hasta que la liberes.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-name">Nombre del empleado</Label>
              <Input
                id="staff-name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-notes">Notas (opcional)</Label>
              <Input
                id="staff-notes"
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Ej: departamento, motivo..."
              />
            </div>
          </div>
        ) : status === 'LIBRE' ? (
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Esta habitación está libre y lista para una nueva reserva.
          </p>
        ) : status === 'MANTENIMIENTO' ? (
          <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
            <p>
              Esta habitación está bloqueada por una incidencia de mantenimiento sin resolver.
            </p>
            {room.maintenance_description && (
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: 'var(--raised)', color: 'var(--text-2)' }}
              >
                {room.maintenance_description}
              </div>
            )}
          </div>
        ) : status === 'EMPLEADO' ? (
          <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
            <p>Esta habitación está asignada a un empleado, no disponible para reservas.</p>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-3)' }}>Empleado</span>
              <span className="font-medium">{room.staff_name}</span>
            </div>
          </div>
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
            {!isFuture && room.cleaning_status && room.cleaning_status !== 'NO' && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Limpieza</span>
                <span>{room.cleaning_status}</span>
              </div>
            )}
            {status === 'PENDIENTE LIMPIEZA' && (
              <p className="text-xs font-bold mt-1" style={{ color: 'var(--text-3)' }}>
                La reserva ya se cerró. Completa la limpieza para liberar la habitación.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter className="sm:flex-col-reverse sm:items-stretch">
          {assigning ? (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={resetAssignForm}>
                Cancelar
              </Button>
              <Button className="w-full" onClick={handleAssign} disabled={isPending}>
                {isPending ? 'Asignando...' : 'Asignar'}
              </Button>
            </>
          ) : status === 'LIBRE' ? (
            <>
              <Button variant="outline" className="w-full" onClick={() => setAssigning(true)}>
                Asignar a empleado
              </Button>
              <Link href={`/reservas/nueva?room=${room.room_id}`} className="w-full">
                <Button className="w-full">Crear reserva para hoy</Button>
              </Link>
            </>
          ) : status === 'RESERVADA' ? (
            <Link href={`/reservas/nueva?room=${room.room_id}`} className="w-full sm:w-auto">
              <Button className="w-full">Crear reserva para hoy</Button>
            </Link>
          ) : status === 'MANTENIMIENTO' ? (
            <Link href="/mantenimiento" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                Ver en Mantenimiento
              </Button>
            </Link>
          ) : status === 'EMPLEADO' ? (
            <Button variant="outline" onClick={handleRelease} disabled={isPending}>
              {isPending ? 'Liberando...' : 'Liberar habitación'}
            </Button>
          ) : status === 'PENDIENTE LIMPIEZA' ? (
            <Link href="/limpieza" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                Ir a Limpieza
              </Button>
            </Link>
          ) : room.reservation_id ? (
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              {isPending ? 'Cerrando...' : 'Cerrar reserva'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/status-badge';
import { CustomSelect } from '@/components/custom-select';
import { closeReservation } from '@/lib/actions/reservations';
import { assignRoomToStaff, releaseStaffRoom } from '@/lib/actions/staff-assignments';
import { openMaintenanceIssue } from '@/lib/actions/maintenance';
import { markRoomForCleaning } from '@/lib/actions/cleaning';
import { supabase } from '@/lib/supabase/client';
import { PRIORITY_META, PRIORITY_OPTIONS } from '@/lib/maintenance-priority';
import type { RoomStatus, ComputedRoomStatus, MaintenancePriority } from '@/lib/types';

type Mode = 'none' | 'assign' | 'report-issue';

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
  const [mode, setMode] = useState<Mode>('none');
  const [staffName, setStaffName] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePriority, setIssuePriority] = useState<MaintenancePriority>('BAJA');
  const [issuePhotos, setIssuePhotos] = useState<File[]>([]);
  const [issueUploading, setIssueUploading] = useState(false);

  const status = room.computed_status as ComputedRoomStatus;
  const isFuture = status === 'RESERVADA';

  const resetForms = () => {
    setMode('none');
    setStaffName('');
    setStaffNotes('');
    setIssueDescription('');
    setIssuePriority('BAJA');
    setIssuePhotos([]);
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
      resetForms();
      setOpen(false);
    });
  };

  const handleMarkForCleaning = () => {
    setError('');
    startTransition(async () => {
      const result = await markRoomForCleaning(room.room_id!);
      if (result?.error) {
        setError(result.error);
        return;
      }
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

  const handleReportIssue = () => {
    if (!issueDescription.trim()) {
      setError('Falta describir qué le pasa a la habitación.');
      return;
    }
    setError('');
    startTransition(async () => {
      const photoUrls: string[] = [];

      if (issuePhotos.length > 0) {
        setIssueUploading(true);
        for (const photo of issuePhotos) {
          const ext = photo.name.split('.').pop();
          const path = `${room.room_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('maintenance-photos')
            .upload(path, photo);

          if (uploadError) {
            setIssueUploading(false);
            setError(`No se pudo subir la foto: ${uploadError.message}`);
            return;
          }

          photoUrls.push(
            supabase.storage.from('maintenance-photos').getPublicUrl(path).data.publicUrl
          );
        }
        setIssueUploading(false);
      }

      const result = await openMaintenanceIssue(
        room.room_id!,
        issueDescription.trim(),
        photoUrls,
        issuePriority
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      resetForms();
      setOpen(false);
    });
  };

  const reportIssueBusy = isPending || issueUploading;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError('');
        if (!next) resetForms();
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

        {mode === 'assign' ? (
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
        ) : mode === 'report-issue' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              La habitación quedará bloqueada (no se puede reservar) hasta que se marque como
              realizada.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="issue-description">¿Qué le pasa a la habitación?</Label>
              <Textarea
                id="issue-description"
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Ej: aire acondicionado no enfría, gotea el lavamanos..."
              />
            </div>
            <div className="flex gap-3 min-w-0">
              <div className="flex flex-col gap-1.5 w-32 shrink-0">
                <Label>Prioridad</Label>
                <CustomSelect
                  value={issuePriority}
                  onChange={(v) => setIssuePriority(v as MaintenancePriority)}
                  options={PRIORITY_OPTIONS}
                  triggerBackground={PRIORITY_META[issuePriority].bg}
                  triggerColor={PRIORITY_META[issuePriority].fg}
                />
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <Label htmlFor="issue-photo">Fotos (opcional)</Label>
                <input
                  id="issue-photo"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setIssuePhotos(Array.from(e.target.files ?? []))}
                  className="w-full min-w-0 text-sm cursor-pointer overflow-hidden file:cursor-pointer file:mr-2 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium file:bg-[#F0F2F5] file:text-[#111827]"
                  style={{ color: 'var(--text-2)' }}
                />
                {issuePhotos.length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {issuePhotos.length} foto{issuePhotos.length === 1 ? '' : 's'} seleccionada
                    {issuePhotos.length === 1 ? '' : 's'}.
                  </p>
                )}
              </div>
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
        ) : status === 'PENDIENTE LIMPIEZA' && !room.reservation_id ? (
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Esta habitación fue marcada para limpieza y está bloqueada hasta que se complete.
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
          {mode === 'assign' ? (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={resetForms}>
                Cancelar
              </Button>
              <Button className="w-full" onClick={handleAssign} disabled={isPending}>
                {isPending ? 'Asignando...' : 'Asignar'}
              </Button>
            </>
          ) : mode === 'report-issue' ? (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={resetForms}>
                Cancelar
              </Button>
              <Button className="w-full" onClick={handleReportIssue} disabled={reportIssueBusy}>
                {issueUploading
                  ? 'Subiendo foto...'
                  : isPending
                    ? 'Reportando...'
                    : 'Reportar incidencia'}
              </Button>
            </>
          ) : (
            <>
              {status !== 'MANTENIMIENTO' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode('report-issue')}
                >
                  Reportar incidencia
                </Button>
              )}

              {status === 'LIBRE' ? (
                <>
                  <Button variant="outline" className="w-full" onClick={() => setMode('assign')}>
                    Asignar a empleado
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleMarkForCleaning}
                    disabled={isPending}
                  >
                    {isPending ? 'Mandando...' : 'Mandar a limpieza'}
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

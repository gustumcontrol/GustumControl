'use client';

import { useMemo, useState, useTransition } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/icon';
import { CountrySelect } from '@/components/country-select';
import { CustomSelect } from '@/components/custom-select';
import { NumberSelect } from '@/components/number-select';
import { DatePicker } from '@/components/date-picker';
import { MunicipioInput } from '@/components/municipio-input';
import { updateReservation } from '@/lib/actions/reservations';
import { PROVINCES_BY_COUNTRY } from '@/lib/provinces';
import { DOBLE_INDIVIDUAL_PRICE } from '@/lib/pricing';
import type { ReservationRow } from '@/components/reservation-list';
import type { ReservationSource, RoomStatus } from '@/lib/types';

type RoomTypePrice = { name: string; price_per_night: number };
type BoardPlanPrice = { name: string; price_per_person: number };

export function EditReservationDialog({
  reservation,
  roomTypes,
  boardPlans,
  rooms,
}: {
  reservation: ReservationRow;
  roomTypes: RoomTypePrice[];
  boardPlans: BoardPlanPrice[];
  rooms: RoomStatus[];
}) {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState(reservation.room_id);
  const [source, setSource] = useState<ReservationSource>(
    (reservation.source as ReservationSource) ?? 'DIRECTO'
  );
  const [guestName, setGuestName] = useState(reservation.guest_name);
  const [guestsCount, setGuestsCount] = useState(reservation.guests_count);
  const [checkIn, setCheckIn] = useState(reservation.check_in);
  const [nights, setNights] = useState(reservation.nights);
  const [boardPlan, setBoardPlan] = useState(reservation.board_plan ?? '');
  const [dobleOccupancy, setDobleOccupancy] = useState<'doble' | 'individual'>(
    reservation.room?.type === 'Doble' && reservation.price_per_night === DOBLE_INDIVIDUAL_PRICE
      ? 'individual'
      : 'doble'
  );
  const [paymentMethod, setPaymentMethod] = useState(reservation.payment_method ?? '');
  const [phone, setPhone] = useState(reservation.phone ?? '');
  const [country, setCountry] = useState(reservation.country ?? '');
  const [municipio, setMunicipio] = useState(reservation.municipio ?? '');
  const [provincia, setProvincia] = useState(reservation.provincia ?? '');
  const [notes, setNotes] = useState(reservation.notes ?? '');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // La habitación actual de la reserva no aparece en `rooms` (esa lista
  // trae solo las libres/reservadas) — hay que agregarla a mano a las
  // opciones para que siga seleccionable y quede marcada como valor
  // inicial.
  const roomOptions = useMemo(() => {
    const map = new Map(rooms.map((r) => [r.room_id, r]));
    if (reservation.room && !map.has(reservation.room_id)) {
      map.set(reservation.room_id, {
        room_id: reservation.room_id,
        number: reservation.room.number,
        floor: reservation.room.floor,
        type: reservation.room.type,
        computed_status: 'OCUPADA',
      } as RoomStatus);
    }
    return [...map.values()];
  }, [rooms, reservation]);

  const priceByType = useMemo(
    () => new Map(roomTypes.map((t) => [t.name, t.price_per_night])),
    [roomTypes]
  );
  const boardPriceByName = useMemo(
    () => new Map(boardPlans.map((b) => [b.name, b.price_per_person])),
    [boardPlans]
  );

  const selectedRoom = roomOptions.find((r) => r.room_id === roomId);
  const isDoble = selectedRoom?.type === 'Doble';
  const basePrice = !selectedRoom?.type
    ? 0
    : isDoble && dobleOccupancy === 'individual'
      ? DOBLE_INDIVIDUAL_PRICE
      : priceByType.get(selectedRoom.type) ?? 0;
  const price = boardPlan
    ? (boardPriceByName.get(boardPlan) ?? 0) * (Number(guestsCount) || 0)
    : basePrice;
  const total = (Number(price) || 0) * (Number(nights) || 0);

  const provinceOptions = useMemo(
    () => (PROVINCES_BY_COUNTRY[country] ?? []).map((name) => ({ value: name, label: name })),
    [country]
  );

  const checkOut = useMemo(() => {
    if (!checkIn || !nights) return '';
    const d = new Date(checkIn);
    d.setDate(d.getDate() + Number(nights));
    return d.toISOString().slice(0, 10);
  }, [checkIn, nights]);

  const resetToOriginal = () => {
    setRoomId(reservation.room_id);
    setSource((reservation.source as ReservationSource) ?? 'DIRECTO');
    setGuestName(reservation.guest_name);
    setGuestsCount(reservation.guests_count);
    setCheckIn(reservation.check_in);
    setNights(reservation.nights);
    setBoardPlan(reservation.board_plan ?? '');
    setDobleOccupancy(
      reservation.room?.type === 'Doble' && reservation.price_per_night === DOBLE_INDIVIDUAL_PRICE
        ? 'individual'
        : 'doble'
    );
    setPaymentMethod(reservation.payment_method ?? '');
    setPhone(reservation.phone ?? '');
    setCountry(reservation.country ?? '');
    setMunicipio(reservation.municipio ?? '');
    setProvincia(reservation.provincia ?? '');
    setNotes(reservation.notes ?? '');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomId) {
      setError('Falta seleccionar la habitación.');
      return;
    }
    if (!guestName.trim()) {
      setError('Falta el nombre del huésped.');
      return;
    }
    if (!checkIn || !nights || nights < 1) {
      setError('Falta la fecha de entrada o la cantidad de noches.');
      return;
    }

    startTransition(async () => {
      const result = await updateReservation(reservation.id, {
        roomId,
        guestName,
        guestsCount: Number(guestsCount),
        checkIn,
        nights: Number(nights),
        pricePerNight: Number(price),
        boardPlan: boardPlan || undefined,
        paymentMethod: paymentMethod || undefined,
        phone: phone || undefined,
        country: country || undefined,
        municipio: municipio || undefined,
        provincia: provincia || undefined,
        notes: notes || undefined,
        source,
      });

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
        if (o) resetToOriginal();
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="w-full sm:w-auto" />}>
        <Icon name="pen" style="duotone" size={12} />
        Editar reserva
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar reserva</DialogTitle>
          <DialogDescription>
            Hab. {reservation.room?.number ?? '—'} · {reservation.room?.type}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Habitación</Label>
            <CustomSelect
              value={roomId}
              onChange={(v) => {
                setRoomId(v);
                setDobleOccupancy('doble');
              }}
              searchable
              searchPlaceholder="Buscar habitación..."
              options={roomOptions.map((room) => ({
                value: room.room_id!,
                label: `${room.number} · ${room.type} (piso ${room.floor})`,
              }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Origen</Label>
            <CustomSelect
              value={source}
              onChange={(v) => setSource(v as ReservationSource)}
              options={[
                { value: 'DIRECTO', label: 'Directo' },
                { value: 'BOOKING', label: 'Booking.com' },
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-guestName">Nombre del huésped</Label>
            <Input
              id="edit-guestName"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-guestsCount">Personas</Label>
              <NumberSelect id="edit-guestsCount" value={guestsCount} onChange={setGuestsCount} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input
                id="edit-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s()+-]/g, ''))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>País</Label>
            <CountrySelect
              value={country}
              onChange={(v) => {
                setCountry(v);
                setProvincia('');
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Provincia</Label>
              <CustomSelect
                value={provincia}
                onChange={(v) => {
                  setProvincia(v);
                  setMunicipio('');
                }}
                placeholder={country ? 'Selecciona una provincia' : 'Selecciona primero el país'}
                searchable
                searchPlaceholder="Buscar provincia..."
                disabled={!country}
                options={provinceOptions}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-municipio">Municipio</Label>
              <MunicipioInput
                id="edit-municipio"
                value={municipio}
                onChange={setMunicipio}
                country={country}
                provincia={provincia}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-checkIn">Entrada</Label>
              <DatePicker id="edit-checkIn" value={checkIn} onChange={setCheckIn} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-nights">Noches</Label>
              <NumberSelect id="edit-nights" value={nights} onChange={setNights} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Régimen</Label>
            <CustomSelect
              value={boardPlan}
              onChange={setBoardPlan}
              placeholder="Desayuno incluido"
              options={[
                { value: '', label: 'Desayuno incluido' },
                ...boardPlans.map((b) => ({
                  value: b.name,
                  label: `${b.name} — $${b.price_per_person}/persona`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-price">Precio por noche</Label>
              {isDoble && !boardPlan ? (
                <CustomSelect
                  value={dobleOccupancy}
                  onChange={(v) => setDobleOccupancy(v as 'doble' | 'individual')}
                  options={[
                    { value: 'doble', label: `Doble — $${priceByType.get('Doble') ?? 0}` },
                    { value: 'individual', label: `Individual — $${DOBLE_INDIVIDUAL_PRICE}` },
                  ]}
                />
              ) : (
                <Input id="edit-price" value={`$${price}`} disabled readOnly />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Método de pago</Label>
              <CustomSelect
                value={paymentMethod}
                onChange={setPaymentMethod}
                placeholder="Selecciona un método"
                options={[
                  { value: 'Efectivo', label: 'Efectivo' },
                  { value: 'Tarjeta', label: 'Tarjeta' },
                  { value: 'Transferencia', label: 'Transferencia' },
                ]}
              />
            </div>
          </div>

          <div
            className="rounded-lg px-4 py-3 text-sm flex items-center justify-between"
            style={{ background: 'var(--raised)', color: 'var(--text-2)' }}
          >
            <span>Salida: {checkOut || '—'}</span>
            <span>Total: ${total.toFixed(2)}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notas</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: llegó pasada la medianoche, pide que no se limpie antes de las 11:00."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

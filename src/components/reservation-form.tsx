'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon';
import { CountrySelect } from '@/components/country-select';
import { CustomSelect } from '@/components/custom-select';
import { NumberSelect } from '@/components/number-select';
import { DatePicker } from '@/components/date-picker';
import { MunicipioInput } from '@/components/municipio-input';
import { createReservation, createGroupReservation } from '@/lib/actions/reservations';
import { PROVINCES_BY_COUNTRY } from '@/lib/provinces';
import { DOBLE_INDIVIDUAL_PRICE } from '@/lib/pricing';
import { todayISOInHotelTimezone } from '@/lib/date';
import type { ReservationSource, RoomStatus } from '@/lib/types';

type RoomTypePrice = { name: string; price_per_night: number };
type BoardPlanPrice = { name: string; price_per_person: number };
type Occupancy = 'doble' | 'individual';
type ExtraRoom = { key: string; roomId: string; occupancy: Occupancy };

type FieldErrors = Partial<
  Record<
    | 'roomId'
    | 'extraRooms'
    | 'guestName'
    | 'guestsCount'
    | 'phone'
    | 'country'
    | 'municipio'
    | 'provincia'
    | 'checkIn'
    | 'nights'
    | 'paymentMethod'
    | 'notes',
    string
  >
>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600 mt-1" role="alert">
      {message}
    </p>
  );
}

let extraRoomKeySeq = 0;
function newExtraRoom(): ExtraRoom {
  extraRoomKeySeq += 1;
  return { key: `extra-${extraRoomKeySeq}`, roomId: '', occupancy: 'doble' };
}

export function ReservationForm({
  rooms,
  roomTypes,
  boardPlans,
  defaultRoomId,
  defaultSource = 'DIRECTO',
  redirectTo = '/reservas',
}: {
  rooms: RoomStatus[];
  roomTypes: RoomTypePrice[];
  boardPlans: BoardPlanPrice[];
  defaultRoomId?: string;
  defaultSource?: ReservationSource;
  redirectTo?: string;
}) {
  const router = useRouter();
  const defaultRoom = rooms.find((r) => r.room_id === defaultRoomId);
  const [roomId, setRoomId] = useState(defaultRoom?.room_id ?? '');
  const [groupBooking, setGroupBooking] = useState(false);
  const [extraRooms, setExtraRooms] = useState<ExtraRoom[]>([]);
  const [source, setSource] = useState<ReservationSource>(defaultSource);
  const [guestName, setGuestName] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const todayISO = useMemo(() => todayISOInHotelTimezone(), []);
  const [checkIn, setCheckIn] = useState(() => todayISOInHotelTimezone());
  const [nights, setNights] = useState(1);
  const [boardPlan, setBoardPlan] = useState('');
  const [dobleOccupancy, setDobleOccupancy] = useState<Occupancy>('doble');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [provincia, setProvincia] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const priceByType = useMemo(
    () => new Map(roomTypes.map((t) => [t.name, t.price_per_night])),
    [roomTypes]
  );
  const boardPriceByName = useMemo(
    () => new Map(boardPlans.map((b) => [b.name, b.price_per_person])),
    [boardPlans]
  );

  const roomPrice = (room: RoomStatus | undefined, occupancy: Occupancy) => {
    const isDobleRoom = room?.type === 'Doble';
    const base = !room?.type
      ? 0
      : isDobleRoom && occupancy === 'individual'
        ? DOBLE_INDIVIDUAL_PRICE
        : (priceByType.get(room.type) ?? 0);
    return boardPlan ? (boardPriceByName.get(boardPlan) ?? 0) * (Number(guestsCount) || 0) : base;
  };

  const selectedRoom = rooms.find((r) => r.room_id === roomId);
  const isDoble = selectedRoom?.type === 'Doble';
  const price = roomPrice(selectedRoom, dobleOccupancy);

  const usedRoomIds = (excludeKey?: string) =>
    [roomId, ...extraRooms.filter((r) => r.key !== excludeKey).map((r) => r.roomId)].filter(
      Boolean
    );

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

  const extraRoomsPriceSum = extraRooms.reduce(
    (sum, r) => sum + roomPrice(rooms.find((room) => room.room_id === r.roomId), r.occupancy),
    0
  );
  const total = groupBooking
    ? ((Number(price) || 0) + extraRoomsPriceSum) * (Number(nights) || 0)
    : (Number(price) || 0) * (Number(nights) || 0);

  const clearFieldError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleRoomChange = (id: string) => {
    setRoomId(id);
    setDobleOccupancy('doble');
    if (id) clearFieldError('roomId');
  };

  const addExtraRoom = () => {
    setExtraRooms((prev) => [...prev, newExtraRoom()]);
    setGroupBooking(true);
  };

  const removeExtraRoom = (key: string) => {
    setExtraRooms((prev) => {
      const next = prev.filter((r) => r.key !== key);
      if (next.length === 0) setGroupBooking(false);
      return next;
    });
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!roomId) errors.roomId = 'Falta seleccionar la habitación.';
    if (groupBooking) {
      if (extraRooms.length === 0) {
        errors.extraRooms = 'Agrega al menos una habitación más.';
      } else if (extraRooms.some((r) => !r.roomId)) {
        errors.extraRooms = 'Falta seleccionar alguna de las habitaciones.';
      }
    }
    if (!guestName.trim()) errors.guestName = 'Falta el nombre del huésped.';
    if (!guestsCount || guestsCount < 1) errors.guestsCount = 'Falta la cantidad de personas.';
    if (!phone.trim()) errors.phone = 'Falta el teléfono.';
    if (!country) errors.country = 'Falta seleccionar el país.';
    if (!municipio.trim()) errors.municipio = 'Falta el municipio.';
    if (!provincia) errors.provincia = 'Falta seleccionar la provincia.';
    if (!checkIn) errors.checkIn = 'Falta la fecha de entrada.';
    else if (checkIn < todayISO) errors.checkIn = 'La fecha de entrada no puede ser anterior a hoy.';
    if (!nights || nights < 1) errors.nights = 'Falta la cantidad de noches.';
    if (!paymentMethod) errors.paymentMethod = 'Falta seleccionar el método de pago.';
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    startTransition(async () => {
      const result = groupBooking
        ? await createGroupReservation({
            rooms: [
              { roomId, pricePerNight: Number(price) },
              ...extraRooms.map((r) => ({
                roomId: r.roomId,
                pricePerNight: Number(
                  roomPrice(rooms.find((room) => room.room_id === r.roomId), r.occupancy)
                ),
              })),
            ],
            guestName,
            guestsCount: Number(guestsCount),
            checkIn,
            nights: Number(nights),
            boardPlan: boardPlan || undefined,
            paymentMethod: paymentMethod || undefined,
            phone: phone || undefined,
            country: country || undefined,
            municipio: municipio || undefined,
            provincia: provincia || undefined,
            notes: notes || undefined,
            source,
          })
        : await createReservation({
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

      router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-1.5 rounded-lg p-3" style={{ background: 'var(--raised)' }}>
        <Label>Habitación</Label>
        <CustomSelect
          value={roomId}
          onChange={handleRoomChange}
          placeholder="Selecciona una habitación libre"
          searchable
          searchPlaceholder="Buscar habitación..."
          invalid={!!fieldErrors.roomId}
          options={rooms
            .filter((room) => !usedRoomIds().includes(room.room_id ?? '') || room.room_id === roomId)
            .map((room) => ({
              value: room.room_id!,
              label: `${room.number} · ${room.type} (piso ${room.floor})`,
              hint:
                room.computed_status === 'RESERVADA'
                  ? `Reservada desde ${room.check_in}`
                  : undefined,
            }))}
        />
        <FieldError message={fieldErrors.roomId} />
        {selectedRoom?.computed_status === 'RESERVADA' && (
          <p className="text-xs" style={{ color: '#9333ea' }}>
            Esta habitación ya tiene una reserva a futuro desde {selectedRoom.check_in}. Si las
            fechas se solapan, el sistema rechazará la reserva.
          </p>
        )}
        {rooms.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            No hay habitaciones libres en este momento.
          </p>
        )}
      </div>

      {extraRooms.map((extra, i) => {
        const extraRoom = rooms.find((r) => r.room_id === extra.roomId);
        const extraIsDoble = extraRoom?.type === 'Doble';
        const extraPrice = roomPrice(extraRoom, extra.occupancy);
        return (
          <div
            key={extra.key}
            className="flex flex-col gap-1.5 rounded-lg p-3"
            style={{ background: 'var(--raised)' }}
          >
            <div className="flex items-center justify-between">
              <Label>Habitación {i + 2}</Label>
              <button
                type="button"
                onClick={() => removeExtraRoom(extra.key)}
                className="text-xs font-medium cursor-pointer"
                style={{ color: '#dc2626' }}
              >
                Quitar
              </button>
            </div>
            <CustomSelect
              value={extra.roomId}
              onChange={(v) => {
                setExtraRooms((prev) =>
                  prev.map((r) => (r.key === extra.key ? { ...r, roomId: v, occupancy: 'doble' } : r))
                );
                if (v) clearFieldError('extraRooms');
              }}
              placeholder="Selecciona una habitación"
              searchable
              searchPlaceholder="Buscar habitación..."
              options={rooms
                .filter(
                  (room) =>
                    !usedRoomIds(extra.key).includes(room.room_id ?? '') ||
                    room.room_id === extra.roomId
                )
                .map((room) => ({
                  value: room.room_id!,
                  label: `${room.number} · ${room.type} (piso ${room.floor})`,
                  hint:
                    room.computed_status === 'RESERVADA'
                      ? `Reservada desde ${room.check_in}`
                      : undefined,
                }))}
            />
            {extraIsDoble && (
              <div className="flex flex-col gap-1.5 mt-1">
                <Label>Ocupación</Label>
                <CustomSelect
                  value={extra.occupancy}
                  onChange={(v) =>
                    setExtraRooms((prev) =>
                      prev.map((r) => (r.key === extra.key ? { ...r, occupancy: v as Occupancy } : r))
                    )
                  }
                  options={[
                    { value: 'doble', label: `Doble — $${priceByType.get('Doble') ?? 0}` },
                    { value: 'individual', label: `Individual — $${DOBLE_INDIVIDUAL_PRICE}` },
                  ]}
                />
              </div>
            )}
            {extraRoom && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                ${extraPrice} por noche
              </p>
            )}
          </div>
        );
      })}
      <FieldError message={fieldErrors.extraRooms} />

      <Button type="button" variant="outline" onClick={addExtraRoom} className="self-start">
        <Icon name="plus" style="solid" size={11} />
        Añadir otra habitación
      </Button>

      {groupBooking && (
        <p className="text-xs -mt-2" style={{ color: 'var(--text-3)' }}>
          Se crea una reserva independiente por cada habitación, todas con el mismo nombre,
          fechas y método de pago.
        </p>
      )}

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
        <Label htmlFor="guestName">Nombre del huésped</Label>
        <Input
          id="guestName"
          value={guestName}
          onChange={(e) => {
            setGuestName(e.target.value);
            if (e.target.value.trim()) clearFieldError('guestName');
          }}
          aria-invalid={!!fieldErrors.guestName}
        />
        <FieldError message={fieldErrors.guestName} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guestsCount">Personas{groupBooking ? ' (por habitación)' : ''}</Label>
          <NumberSelect
            id="guestsCount"
            value={guestsCount}
            onChange={(v) => {
              setGuestsCount(v);
              if (v >= 1) clearFieldError('guestsCount');
            }}
            invalid={!!fieldErrors.guestsCount}
          />
          <FieldError message={fieldErrors.guestsCount} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^\d\s()+-]/g, '');
              setPhone(cleaned);
              if (cleaned.trim()) clearFieldError('phone');
            }}
            aria-invalid={!!fieldErrors.phone}
          />
          <FieldError message={fieldErrors.phone} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>País</Label>
        <CountrySelect
          value={country}
          onChange={(v) => {
            setCountry(v);
            setProvincia('');
            if (v) clearFieldError('country');
          }}
          invalid={!!fieldErrors.country}
        />
        <FieldError message={fieldErrors.country} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Provincia</Label>
          <CustomSelect
            value={provincia}
            onChange={(v) => {
              setProvincia(v);
              setMunicipio('');
              if (v) clearFieldError('provincia');
            }}
            placeholder={country ? 'Selecciona una provincia' : 'Selecciona primero el país'}
            searchable
            searchPlaceholder="Buscar provincia..."
            disabled={!country}
            invalid={!!fieldErrors.provincia}
            options={provinceOptions}
          />
          <FieldError message={fieldErrors.provincia} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="municipio">Municipio</Label>
          <MunicipioInput
            id="municipio"
            value={municipio}
            onChange={(v) => {
              setMunicipio(v);
              if (v.trim()) clearFieldError('municipio');
            }}
            country={country}
            provincia={provincia}
            invalid={!!fieldErrors.municipio}
          />
          <FieldError message={fieldErrors.municipio} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checkIn">Entrada</Label>
          <DatePicker
            id="checkIn"
            value={checkIn}
            onChange={(v) => {
              setCheckIn(v);
              if (v && v >= todayISO) clearFieldError('checkIn');
            }}
            minDate={todayISO}
            invalid={!!fieldErrors.checkIn}
          />
          <FieldError message={fieldErrors.checkIn} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nights">Noches</Label>
          <NumberSelect
            id="nights"
            value={nights}
            onChange={(v) => {
              setNights(v);
              if (v >= 1) clearFieldError('nights');
            }}
            invalid={!!fieldErrors.nights}
          />
          <FieldError message={fieldErrors.nights} />
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
          <Label htmlFor="price">
            Precio por noche{groupBooking ? ' (habitación 1)' : ''}
          </Label>
          {isDoble && !boardPlan ? (
            <CustomSelect
              value={dobleOccupancy}
              onChange={(v) => setDobleOccupancy(v as Occupancy)}
              options={[
                { value: 'doble', label: `Doble — $${priceByType.get('Doble') ?? 0}` },
                { value: 'individual', label: `Individual — $${DOBLE_INDIVIDUAL_PRICE}` },
              ]}
            />
          ) : (
            <Input
              id="price"
              value={selectedRoom ? `$${price}` : '—'}
              disabled
              readOnly
              style={{ background: 'var(--raised)' }}
            />
          )}
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {boardPlan
              ? `$${boardPriceByName.get(boardPlan) ?? 0} x ${guestsCount} persona${guestsCount === 1 ? '' : 's'}.`
              : isDoble
                ? 'Doble: precio completo de la habitación. Individual: una sola persona.'
                : 'Fijo según el tipo de habitación.'}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Método de pago</Label>
          <CustomSelect
            value={paymentMethod}
            onChange={(v) => {
              setPaymentMethod(v);
              if (v) clearFieldError('paymentMethod');
            }}
            placeholder="Selecciona un método"
            invalid={!!fieldErrors.paymentMethod}
            options={[
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'Tarjeta', label: 'Tarjeta' },
              { value: 'Transferencia', label: 'Transferencia' },
            ]}
          />
          <FieldError message={fieldErrors.paymentMethod} />
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
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            if (e.target.value.trim()) clearFieldError('notes');
          }}
          aria-invalid={!!fieldErrors.notes}
        />
        <FieldError message={fieldErrors.notes} />
      </div>

      <Button
        type="submit"
        disabled={isPending || !selectedRoom || (groupBooking && extraRooms.some((r) => !r.roomId))}
      >
        {isPending
          ? 'Creando...'
          : groupBooking
            ? `Crear ${extraRooms.length + 1} reservas`
            : 'Crear reserva'}
      </Button>
    </form>
  );
}

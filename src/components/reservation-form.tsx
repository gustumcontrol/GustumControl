'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CountrySelect } from '@/components/country-select';
import { CustomSelect } from '@/components/custom-select';
import { NumberSelect } from '@/components/number-select';
import { DatePicker } from '@/components/date-picker';
import { MunicipioInput } from '@/components/municipio-input';
import { createReservation } from '@/lib/actions/reservations';
import { PROVINCES_BY_COUNTRY } from '@/lib/provinces';
import { DOBLE_INDIVIDUAL_PRICE } from '@/lib/pricing';
import type { RoomStatus } from '@/lib/types';

type RoomTypePrice = { name: string; price_per_night: number };
type BoardPlanPrice = { name: string; price_per_person: number };

type FieldErrors = Partial<
  Record<
    | 'roomId'
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

export function ReservationForm({
  rooms,
  roomTypes,
  boardPlans,
  defaultRoomId,
}: {
  rooms: RoomStatus[];
  roomTypes: RoomTypePrice[];
  boardPlans: BoardPlanPrice[];
  defaultRoomId?: string;
}) {
  const router = useRouter();
  const defaultRoom = rooms.find((r) => r.room_id === defaultRoomId);
  const [roomId, setRoomId] = useState(defaultRoom?.room_id ?? '');
  const [guestName, setGuestName] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().slice(0, 10));
  const [nights, setNights] = useState(1);
  const [boardPlan, setBoardPlan] = useState('');
  const [dobleOccupancy, setDobleOccupancy] = useState<'doble' | 'individual'>('doble');
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

  const selectedRoom = rooms.find((r) => r.room_id === roomId);
  const isDoble = selectedRoom?.type === 'Doble';
  const basePrice = !selectedRoom?.type
    ? 0
    : isDoble && dobleOccupancy === 'individual'
      ? DOBLE_INDIVIDUAL_PRICE
      : priceByType.get(selectedRoom.type) ?? 0;
  const price = boardPlan
    ? (boardPriceByName.get(boardPlan) ?? 0) * (Number(guestsCount) || 0)
    : basePrice;
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

  const total = (Number(price) || 0) * (Number(nights) || 0);

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

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!roomId) errors.roomId = 'Falta seleccionar la habitación.';
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
      const result = await createReservation({
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
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.push('/reservas');
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-1.5">
        <Label>Habitación</Label>
        <CustomSelect
          value={roomId}
          onChange={handleRoomChange}
          placeholder="Selecciona una habitación libre"
          searchable
          searchPlaceholder="Buscar habitación..."
          invalid={!!fieldErrors.roomId}
          options={rooms.map((room) => ({
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
          <Label htmlFor="guestsCount">Personas</Label>
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
          <Label htmlFor="price">Precio por noche</Label>
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

      <Button type="submit" disabled={isPending || !selectedRoom}>
        {isPending ? 'Creando...' : 'Crear reserva'}
      </Button>
    </form>
  );
}

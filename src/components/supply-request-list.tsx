'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import writeXlsxFile from 'write-excel-file/browser';
import type { SheetData } from 'write-excel-file/browser';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/custom-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRealtimeRefresh } from '@/lib/hooks/use-realtime-refresh';
import { floorLabel } from '@/lib/floor-label';
import { todayISOInHotelTimezone } from '@/lib/date';
import { SupplyRequestDetailDialog } from '@/components/supply-request-detail-dialog';
import {
  addSupplyRequest,
  deleteSupplyRequest,
  markSupplyRequestPurchased,
} from '@/lib/actions/supply-requests';
import type { SupplyCategory } from '@/lib/types';

export type SupplyRequestRow = {
  id: string;
  item: string;
  quantity: number;
  notes: string | null;
  requested_at: string;
  requested_by_name: string | null;
  room: { number: string; floor: string } | null;
};

type RoomOption = { id: string; number: string; floor: string; type: string };

const CATEGORY_META: Record<
  SupplyCategory,
  { title: string; subtitle: string; emptyLabel: string; fileSlug: string; historyPath: string }
> = {
  LIMPIEZA: {
    title: 'Pedidos de limpieza',
    subtitle: 'Pendiente a pedir: sábanas, escobas, bombillos...',
    emptyLabel: 'No hay pedidos de limpieza pendientes.',
    fileSlug: 'pedidos-limpieza',
    historyPath: '/limpieza/pedidos/historial',
  },
  MANTENIMIENTO: {
    title: 'Pedidos de mantenimiento',
    subtitle: 'Pendiente a pedir: piezas, herramientas, repuestos...',
    emptyLabel: 'No hay pedidos de mantenimiento pendientes.',
    fileSlug: 'pedidos-mantenimiento',
    historyPath: '/mantenimiento/pedidos/historial',
  },
};

const EXPORT_COLUMNS = [
  { header: 'Habitación', width: 12 },
  { header: 'Piso', width: 16 },
  { header: 'Artículo', width: 24 },
  { header: 'Cantidad', width: 10 },
  { header: 'Notas', width: 28 },
  { header: 'Pedido por', width: 18 },
  { header: 'Fecha', width: 20 },
];

async function exportRequestsToXlsx(
  requests: SupplyRequestRow[],
  category: SupplyCategory,
  hotelSlug?: string | null
) {
  const headerRow: SheetData[number] = EXPORT_COLUMNS.map((c) => ({
    value: c.header,
    fontWeight: 'bold',
    textColor: '#FF6B2B',
    backgroundColor: '#FFEDE6',
    align: 'left',
  }));

  const dataRows: SheetData = requests.map((r) => [
    { value: r.room?.number ?? '—' },
    { value: floorLabel(r.room?.floor, hotelSlug) },
    { value: r.item },
    { value: r.quantity, type: Number },
    { value: r.notes ?? '—' },
    { value: r.requested_by_name ?? '—' },
    { value: new Date(r.requested_at), type: Date, format: 'dd/mm/yyyy hh:mm' },
  ]);

  await writeXlsxFile([headerRow, ...dataRows], {
    columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })),
  }).toFile(`${CATEGORY_META[category].fileSlug}-${todayISOInHotelTimezone()}.xlsx`);
}

function AddSupplyRequestDialog({
  category,
  rooms,
}: {
  category: SupplyCategory;
  rooms: RoomOption[];
}) {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setRoomId('');
    setItem('');
    setQuantity('1');
    setNotes('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomId) {
      setError('Falta seleccionar la habitación.');
      return;
    }
    if (!item.trim()) {
      setError('Falta describir qué hace falta.');
      return;
    }
    const parsedQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));

    startTransition(async () => {
      const result = await addSupplyRequest(
        roomId,
        category,
        item.trim(),
        parsedQuantity,
        notes.trim() || undefined
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button aria-label="Añadir pedido" />}>
        <Icon name="cart-plus" style="solid" size={13} color="#FFFFFF" />
        <span className="hidden sm:inline">Añadir pedido</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir pedido</DialogTitle>
          <DialogDescription>
            Dí qué hace falta para una habitación (sábanas, escoba, bombillo...) para comprarlo.
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

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="supply-item">¿Qué hace falta?</Label>
              <Input
                id="supply-item"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Ej: sábanas, escoba, bombillo..."
              />
            </div>
            <div className="flex flex-col gap-1.5 w-24 shrink-0">
              <Label htmlFor="supply-quantity">Cantidad</Label>
              <Input
                id="supply-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supply-notes">Notas (opcional)</Label>
            <Textarea
              id="supply-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Añadiendo...' : 'Añadir pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SupplyRequestList({
  category,
  requests,
  rooms,
  hotelSlug,
}: {
  category: SupplyCategory;
  requests: SupplyRequestRow[];
  rooms: RoomOption[];
  hotelSlug?: string | null;
}) {
  useRealtimeRefresh(['supply_requests']);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [detailRequest, setDetailRequest] = useState<SupplyRequestRow | null>(null);
  const [, startTransition] = useTransition();
  const meta = CATEGORY_META[category];

  const handlePurchased = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      await markSupplyRequestPurchased(id, category);
      setPendingId(null);
    });
  };

  const handleDelete = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      await deleteSupplyRequest(id, category);
      setPendingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold mb-0.5" style={{ color: 'var(--light)' }}>
            {meta.title}
            {requests.length > 0 && (
              <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-3)' }}>
                ({requests.length})
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-3)' }}>
            {meta.subtitle}
          </p>
        </div>
        <div className="flex items-stretch gap-2 shrink-0">
          <Button
            type="button"
            onClick={() => {
              setIsExporting(true);
              exportRequestsToXlsx(requests, category, hotelSlug).finally(() =>
                setIsExporting(false)
              );
            }}
            disabled={requests.length === 0 || isExporting}
            title={isExporting ? 'Exportando...' : 'Exportar a Excel'}
            aria-label="Exportar a Excel"
            style={{ background: 'rgba(29,111,66,0.12)', color: '#1D6F42' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoexcel.png" alt="Exportar a Excel" className="w-4 h-4" />
          </Button>
          <Button render={<Link href={meta.historyPath} />} nativeButton={false}>
            <Icon name="clock-rotate-left" style="solid" size={12} color="#FFFFFF" />
            <span className="hidden sm:inline">Historial</span>
          </Button>
          <AddSupplyRequestDialog category={category} rooms={rooms} />
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Icon name="cart-shopping" style="duotone" size={28} color="var(--text-3)" />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            {meta.emptyLabel}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => {
            const isPending = pendingId === r.id;
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailRequest(r)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetailRequest(r);
                  }
                }}
                className="rounded-lg p-4 flex items-center gap-4 cursor-pointer transition-shadow hover:shadow-md"
                style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
              >
                <div className="shrink-0 w-24">
                  <p className="text-sm leading-5 font-semibold truncate" style={{ color: 'var(--light)' }}>
                    Hab. {r.room?.number ?? '—'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                    {floorLabel(r.room?.floor, hotelSlug)}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-5 font-medium truncate" style={{ color: 'var(--light)' }}>
                    {r.item}
                    {r.quantity > 1 ? ` × ${r.quantity}` : ''}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                    {r.notes ? `${r.notes} · ` : ''}
                    {r.requested_by_name ?? 'Sin asignar'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePurchased(r.id);
                  }}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'rgb(139 247 179 / 18%)', color: '#16a34a' }}
                >
                  {!isPending && <Icon name="check" style="solid" size={12} color="#16a34a" />}
                  {isPending ? 'Actualizando...' : 'Comprado'}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r.id);
                  }}
                  aria-label="Eliminar pedido"
                  className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'var(--raised)' }}
                >
                  <Icon name="trash" style="solid" size={12} color="var(--text-3)" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {detailRequest && (
        <SupplyRequestDetailDialog
          request={detailRequest}
          category={category}
          hotelSlug={hotelSlug}
          open={!!detailRequest}
          onOpenChange={(open) => !open && setDetailRequest(null)}
        />
      )}
    </div>
  );
}

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/icon';
import { floorLabel } from '@/lib/floor-label';
import {
  deleteSupplyRequest,
  editSupplyRequest,
  markSupplyRequestPurchased,
} from '@/lib/actions/supply-requests';
import type { SupplyCategory } from '@/lib/types';
import type { SupplyRequestRow } from '@/components/supply-request-list';

function fullDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SupplyRequestDetailDialog({
  request,
  category,
  hotelSlug,
  open,
  onOpenChange,
}: {
  request: SupplyRequestRow;
  category: SupplyCategory;
  hotelSlug?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [item, setItem] = useState(request.item);
  const [quantity, setQuantity] = useState(String(request.quantity));
  const [notes, setNotes] = useState(request.notes ?? '');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const normalizedQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));
  const hasChanges =
    item.trim() !== request.item ||
    normalizedQuantity !== request.quantity ||
    notes.trim() !== (request.notes ?? '');

  const reset = () => {
    setItem(request.item);
    setQuantity(String(request.quantity));
    setNotes(request.notes ?? '');
    setError('');
  };

  const handleSave = () => {
    if (!item.trim()) {
      setError('Falta describir qué hace falta.');
      return;
    }
    setError('');
    startTransition(async () => {
      const result = await editSupplyRequest(
        request.id,
        category,
        item.trim(),
        normalizedQuantity,
        notes.trim() || null
      );
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  const handlePurchased = () => {
    setError('');
    startTransition(async () => {
      const result = await markSupplyRequestPurchased(request.id, category);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  };

  const handleDelete = () => {
    setError('');
    startTransition(async () => {
      const result = await deleteSupplyRequest(request.id, category);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Habitación {request.room?.number ?? '—'}</DialogTitle>
          <DialogDescription>
            {floorLabel(request.room?.floor, hotelSlug)} · Pedido el{' '}
            {fullDate(request.requested_at)}
            {request.requested_by_name ? ` por ${request.requested_by_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="edit-supply-item">¿Qué hace falta?</Label>
              <Input id="edit-supply-item" value={item} onChange={(e) => setItem(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 w-24 shrink-0">
              <Label htmlFor="edit-supply-quantity">Cantidad</Label>
              <Input
                id="edit-supply-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-supply-notes">Notas (opcional)</Label>
            <Textarea
              id="edit-supply-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter className="sm:flex-col-reverse sm:items-stretch">
          <Button type="button" variant="destructive" className="w-full" onClick={handleDelete} disabled={isPending}>
            Eliminar pedido
          </Button>
          {hasChanges && (
            <Button type="button" variant="outline" className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          )}
          <Button type="button" className="w-full" onClick={handlePurchased} disabled={isPending}>
            <Icon name="check" style="solid" size={12} color="#FFFFFF" />
            {isPending ? 'Actualizando...' : 'Comprado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

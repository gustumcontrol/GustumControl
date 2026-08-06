'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { createHotel } from '@/lib/actions/hotels';

export function AddHotelForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setName('');
    setError('');
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Falta el nombre del hotel.');
      return;
    }
    setError('');
    startTransition(async () => {
      const result = await createHotel(name.trim());
      if (result?.error) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center transition-shadow hover:shadow-md cursor-pointer"
        style={{ border: '1px dashed var(--line-2)', color: 'var(--text-2)' }}
      >
        <span className="text-2xl leading-none">+</span>
        <span className="text-sm font-medium">Agregar hotel</span>
      </button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo hotel</DialogTitle>
          <DialogDescription>Se agrega sin habitaciones; las cargas después.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hotel-name">Nombre del hotel</Label>
          <Input
            id="hotel-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Hostal las Fuentes"
            autoFocus
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter className="sm:flex-col-reverse sm:items-stretch">
          <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Creando...' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

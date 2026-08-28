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
import { deleteUser } from '@/lib/actions/users';

export function DeleteUserButton({
  userId,
  name,
  menuItem = false,
}: {
  userId: string;
  name: string;
  /** Se ve como fila de menú (ícono + texto, ancho completo) en vez de botón outline. */
  menuItem?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError('');
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {menuItem ? (
        <DialogTrigger
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors hover:bg-[var(--raised)]"
          style={{ color: '#dc2626' }}
        >
          <Icon
            name="trash"
            style="duotone"
            size={14}
            color="#dc2626"
            secondaryOpacity={0.55}
            className="shrink-0"
          />
          Eliminar
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" size="sm" />}>Borrar</DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar usuario</DialogTitle>
          <DialogDescription>
            Esto borra la cuenta de {name} permanentemente. Si tiene reservas creadas, mejor
            desactívalo en vez de borrarlo.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending} variant="destructive">
            {isPending ? 'Borrando...' : 'Confirmar borrado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

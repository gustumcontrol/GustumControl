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
import { deleteUser } from '@/lib/actions/users';

export function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
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
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Borrar</DialogTrigger>
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

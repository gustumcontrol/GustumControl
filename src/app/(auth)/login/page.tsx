'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DEFAULT_ROUTE_BY_ROLE } from '@/lib/roles';
import type { Role } from '@/lib/types';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(() =>
    searchParams.get('success') === 'signup'
      ? 'Cuenta creada. Revisa tu correo y confirma tu cuenta antes de iniciar sesión.'
      : ''
  );

  useEffect(() => {
    if (searchParams.get('success') === 'signup') {
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const role = data.role as Role | null;
        router.push(role ? (DEFAULT_ROUTE_BY_ROLE[role] ?? '/dashboard') : '/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'Error de autenticación');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {success && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}
        >
          {success}
        </div>
      )}
      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tucorreo@email.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </Button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-8"
        style={{ background: 'var(--card-c)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Gustum Control" className="h-9 w-auto" />
        </div>

        <h1 className="text-xl font-semibold text-center mb-1" style={{ color: 'var(--light)' }}>
          Iniciar sesión
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-3)' }}>
          Panel operativo — acceso solo para el equipo
        </p>

        <Suspense
          fallback={
            <p className="text-center text-sm" style={{ color: 'var(--text-3)' }}>
              Cargando...
            </p>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-3)' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="font-medium" style={{ color: 'var(--accent-c)' }}>
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}

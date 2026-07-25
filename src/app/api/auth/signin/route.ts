import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Completa todos los campos.', code: 'missing_credentials' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      let errorMessage = 'Error de autenticación.';
      let errorCode = 'auth_error';

      if (signInError.message.includes('Invalid login credentials')) {
        errorMessage = 'Correo o contraseña incorrectos.';
        errorCode = 'invalid_credentials';
      } else if (signInError.message.includes('Email not confirmed')) {
        errorMessage = 'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.';
        errorCode = 'email_not_confirmed';
      }

      return NextResponse.json({ error: errorMessage, code: errorCode }, { status: 400 });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'No se pudo crear la sesión.', code: 'no_session' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.', code: 'server_error' },
      { status: 500 }
    );
  }
}

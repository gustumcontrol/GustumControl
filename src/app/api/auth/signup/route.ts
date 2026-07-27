import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Completa todos los campos.', code: 'missing_credentials' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const origin = new URL(request.url).origin;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`,
        },
        emailRedirectTo: `${origin}/login`,
      },
    });

    if (signUpError) {
      return NextResponse.json(
        { error: signUpError.message, code: 'signup_error' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.', code: 'server_error' },
      { status: 500 }
    );
  }
}

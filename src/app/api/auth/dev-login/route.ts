import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DEV ONLY — this endpoint does not exist in production
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { email, role } = await request.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Service role client for admin operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Step 1: Create or find the auth user
  let userId: string;
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createError || !newUser.user) {
      return NextResponse.json({ error: 'Failed to create user', details: createError?.message }, { status: 500 });
    }
    userId = newUser.user.id;
  }

  // Step 2: Generate magic link
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError || !linkData) {
    return NextResponse.json({ error: 'Failed to generate link', details: linkError?.message }, { status: 500 });
  }

  // Step 3: Exchange for session using a PLAIN (non-SSR) client
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: sessionData, error: otpError } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (otpError || !sessionData.session) {
    return NextResponse.json({ error: 'Failed to verify OTP', details: otpError?.message }, { status: 500 });
  }

  // Step 4: Ensure app-level user record exists in adminpkm_users
  const { data: appUser } = await adminClient
    .from('adminpkm_users')
    .select('id')
    .eq('email', email)
    .single();

  if (!appUser) {
    await adminClient.from('adminpkm_users').insert({
      email,
      role: role || 'user',
    });
  }

  // Step 5: Set session cookies
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const sessionStr = JSON.stringify(sessionData.session);

  const response = NextResponse.json({ success: true, userId });

  const CHUNK_SIZE = 3180;
  if (sessionStr.length <= CHUNK_SIZE) {
    response.cookies.set(cookieName, sessionStr, {
      path: '/',
      httpOnly: false,
      secure: false, // MUST be false for HTTP localhost
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });
  } else {
    const chunks = Math.ceil(sessionStr.length / CHUNK_SIZE);
    for (let i = 0; i < chunks; i++) {
      response.cookies.set(`${cookieName}.${i}`, sessionStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), {
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      });
    }
  }

  return response;
}

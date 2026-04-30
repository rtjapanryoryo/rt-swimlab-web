/**
 * ドリル練習 API の認証・認可テスト
 *
 * 環境変数（.env.local に追記）:
 *   E2E_MEMBER_EMAIL    — 一般会員アカウントのメール
 *   E2E_MEMBER_PASSWORD — 一般会員アカウントのパスワード
 *   E2E_ADMIN_EMAIL     — 管理者アカウントのメール
 *   E2E_ADMIN_PASSWORD  — 管理者アカウントのパスワード
 *
 * 未設定の場合はスキップされます。
 */

import { test, expect, request, type APIRequestContext } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

async function signIn(
  ctx: APIRequestContext,
  email: string,
  password: string
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const res = await ctx.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: { email, password },
    }
  );
  if (!res.ok()) return null;
  const body = await res.json() as { access_token?: string };
  return body.access_token ?? null;
}

// ──────────────────────────────────────────────────
// 1. 未認証 → 401
// ──────────────────────────────────────────────────
test('GET /api/drills — unauthenticated → 401', async ({ request: ctx }) => {
  const res = await ctx.get(`${BASE}/api/drills?stroke=freestyle`);
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body).toMatchObject({ error: expect.any(String) });
});

test('GET /api/admin/drills — unauthenticated → 401', async ({ request: ctx }) => {
  const res = await ctx.get(`${BASE}/api/admin/drills`);
  expect(res.status()).toBe(401);
});

test('PUT /api/admin/drills/reorder — unauthenticated → 401', async ({ request: ctx }) => {
  const res = await ctx.put(`${BASE}/api/admin/drills/reorder`, {
    data: { orders: [] },
  });
  expect(res.status()).toBe(401);
});

// ──────────────────────────────────────────────────
// 2. GET /api/drills — invalid stroke → 400
// ──────────────────────────────────────────────────
test('GET /api/drills — missing stroke param → 400', async ({ request: ctx }) => {
  // This endpoint requires auth first, so we just check it doesn't return 200
  const res = await ctx.get(`${BASE}/api/drills`);
  expect([400, 401]).toContain(res.status());
});

// ──────────────────────────────────────────────────
// 3. 一般会員 → /api/admin/drills に 403
// ──────────────────────────────────────────────────
test('GET /api/admin/drills — member → 403', async ({ request: ctx }) => {
  const email = process.env.E2E_MEMBER_EMAIL;
  const password = process.env.E2E_MEMBER_PASSWORD;
  if (!email || !password) {
    test.skip(true, 'E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD not set');
    return;
  }

  const token = await signIn(ctx, email, password);
  if (!token) {
    test.skip(true, 'Could not sign in as member');
    return;
  }

  const res = await ctx.get(`${BASE}/api/admin/drills`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(403);
  const body = await res.json();
  expect(body).toMatchObject({ error: 'Forbidden' });
});

test('POST /api/admin/drills — member → 403', async ({ request: ctx }) => {
  const email = process.env.E2E_MEMBER_EMAIL;
  const password = process.env.E2E_MEMBER_PASSWORD;
  if (!email || !password) {
    test.skip(true, 'E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD not set');
    return;
  }

  const token = await signIn(ctx, email, password);
  if (!token) {
    test.skip(true, 'Could not sign in as member');
    return;
  }

  const res = await ctx.post(`${BASE}/api/admin/drills`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { stroke: 'freestyle', title: 'test', youtube_url: 'https://www.youtube.com/watch?v=abc123', overview: '', key_points: '' },
  });
  expect(res.status()).toBe(403);
});

test('GET /api/drills?preview=1 — member → 403', async ({ request: ctx }) => {
  const email = process.env.E2E_MEMBER_EMAIL;
  const password = process.env.E2E_MEMBER_PASSWORD;
  if (!email || !password) {
    test.skip(true, 'E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD not set');
    return;
  }

  const token = await signIn(ctx, email, password);
  if (!token) {
    test.skip(true, 'Could not sign in as member');
    return;
  }

  const res = await ctx.get(`${BASE}/api/drills?stroke=freestyle&preview=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(403);
});

// ──────────────────────────────────────────────────
// 4. 管理者 → 全操作 200
// ──────────────────────────────────────────────────
test('GET /api/admin/drills — admin → 200', async ({ request: ctx }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    test.skip(true, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');
    return;
  }

  const token = await signIn(ctx, email, password);
  if (!token) {
    test.skip(true, 'Could not sign in as admin');
    return;
  }

  const res = await ctx.get(`${BASE}/api/admin/drills`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('drills');
  expect(Array.isArray(body.drills)).toBe(true);
});

test('GET /api/drills?preview=1 — admin → 200 with preview flag', async ({ request: ctx }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    test.skip(true, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');
    return;
  }

  const token = await signIn(ctx, email, password);
  if (!token) {
    test.skip(true, 'Could not sign in as admin');
    return;
  }

  const res = await ctx.get(`${BASE}/api/drills?stroke=freestyle&preview=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.preview).toBe(true);
  expect(Array.isArray(body.drills)).toBe(true);
});

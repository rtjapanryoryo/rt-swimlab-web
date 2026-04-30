/**
 * ドリル練習 RLS テスト
 *
 * 一般会員が未公開ドリルを取得できないことを確認します。
 * 必要な環境変数（.env.local）:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD
 *   E2E_ADMIN_EMAIL  / E2E_ADMIN_PASSWORD
 */

import { test, expect, request } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

async function signIn(email: string, password: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const ctx = await request.newContext();
  const res = await ctx.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      data: { email, password },
    }
  );
  await ctx.dispose();
  if (!res.ok()) return null;
  const body = await res.json() as { access_token?: string };
  return body.access_token ?? null;
}

test.describe('RLS: 未公開ドリルの可視性', () => {
  test('一般会員は未公開ドリルを /api/drills で受け取れない', async ({ request: ctx }) => {
    const memberEmail = process.env.E2E_MEMBER_EMAIL;
    const memberPass  = process.env.E2E_MEMBER_PASSWORD;
    const adminEmail  = process.env.E2E_ADMIN_EMAIL;
    const adminPass   = process.env.E2E_ADMIN_PASSWORD;

    if (!memberEmail || !memberPass || !adminEmail || !adminPass) {
      test.skip(true, 'E2E credentials not set');
      return;
    }

    const adminToken  = await signIn(adminEmail, adminPass);
    const memberToken = await signIn(memberEmail, memberPass);
    if (!adminToken || !memberToken) {
      test.skip(true, 'Could not sign in');
      return;
    }

    // 管理者で未公開ドリルを作成
    const createRes = await ctx.post(`${BASE}/api/admin/drills`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      data: {
        stroke: 'freestyle',
        title: '[E2E] 未公開テストドリル',
        youtube_url: 'https://www.youtube.com/watch?v=e2etestid00',
        overview: 'E2E テスト用の未公開ドリル',
        key_points: '- テスト専用',
        sort_order: 9999,
        is_published: false,
      },
    });
    expect(createRes.status()).toBe(200);
    const created = await createRes.json();
    const drillId: string = created.drill.id;

    try {
      // 一般会員で /api/drills を取得 → 未公開ドリルが含まれないこと
      const memberRes = await ctx.get(`${BASE}/api/drills?stroke=freestyle`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      expect(memberRes.status()).toBe(200);
      const memberBody = await memberRes.json();
      const ids: string[] = (memberBody.drills ?? []).map((d: { id: string }) => d.id);
      expect(ids).not.toContain(drillId);

      // 管理者の /api/admin/drills では見えること
      const adminRes = await ctx.get(`${BASE}/api/admin/drills?stroke=freestyle`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(adminRes.status()).toBe(200);
      const adminBody = await adminRes.json();
      const adminIds: string[] = (adminBody.drills ?? []).map((d: { id: string }) => d.id);
      expect(adminIds).toContain(drillId);
    } finally {
      // テストドリルを削除
      await ctx.delete(`${BASE}/api/admin/drills/${drillId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });

  test('sort_order の一括更新が反映される', async ({ request: ctx }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL;
    const adminPass  = process.env.E2E_ADMIN_PASSWORD;
    if (!adminEmail || !adminPass) {
      test.skip(true, 'E2E_ADMIN credentials not set');
      return;
    }

    const adminToken = await signIn(adminEmail, adminPass);
    if (!adminToken) {
      test.skip(true, 'Could not sign in as admin');
      return;
    }

    // 2件作成
    const ids: string[] = [];
    for (const title of ['[E2E] drillA', '[E2E] drillB']) {
      const res = await ctx.post(`${BASE}/api/admin/drills`, {
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        data: {
          stroke: 'backstroke',
          title,
          youtube_url: 'https://www.youtube.com/watch?v=e2etestidXX',
          overview: '',
          key_points: '',
          sort_order: 0,
          is_published: false,
        },
      });
      const body = await res.json();
      ids.push(body.drill.id);
    }

    try {
      // 順番を逆にして reorder
      const reorderRes = await ctx.put(`${BASE}/api/admin/drills/reorder`, {
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        data: {
          orders: [
            { id: ids[0], sort_order: 20 },
            { id: ids[1], sort_order: 10 },
          ],
        },
      });
      expect(reorderRes.status()).toBe(200);

      // 取得して順番を確認
      const listRes = await ctx.get(`${BASE}/api/admin/drills?stroke=backstroke`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const list = (await listRes.json()).drills as Array<{ id: string; sort_order: number }>;
      const a = list.find((d) => d.id === ids[0]);
      const b = list.find((d) => d.id === ids[1]);
      expect(a?.sort_order).toBe(20);
      expect(b?.sort_order).toBe(10);
      // B が A より小さい sort_order なので先に来るはず
      const aIdx = list.findIndex((d) => d.id === ids[0]);
      const bIdx = list.findIndex((d) => d.id === ids[1]);
      expect(bIdx).toBeLessThan(aIdx);
    } finally {
      for (const id of ids) {
        await ctx.delete(`${BASE}/api/admin/drills/${id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    }
  });
});

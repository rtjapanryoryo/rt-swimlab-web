/**
 * プラン別の機能上限設定
 * デモ期間が終了したら IS_DEMO_PERIOD を false にすると制限が有効になる。
 * 有料プランの具体的な回数が決まったら PLAN_LIMITS を更新する。
 */

export type PlanId = 'free' | 'basic' | 'standard' | 'pro';

export const IS_DEMO_PERIOD = process.env.NEXT_PUBLIC_DEMO_PERIOD !== 'false';

// 未設定時は停止を維持し、明示的に false を設定した環境だけ生成機能を公開します。
export const MAINTENANCE_MODE =
  process.env.NEXT_PUBLIC_MAINTENANCE_MODE?.trim().toLowerCase() !== 'false';

export type PlanLimit = {
  customGenType: 'total' | 'monthly';
  customGenLimit: number | null; // null = 未定（検討中）
  customGenLabel: string;        // 表示用テキスト
};

export const PLAN_LIMITS: Record<PlanId, PlanLimit> = {
  free: {
    customGenType: 'total',
    customGenLimit: 3,
    customGenLabel: '累計3回',
  },
  basic: {
    customGenType: 'monthly',
    customGenLimit: null,
    customGenLabel: '検討中',
  },
  standard: {
    customGenType: 'monthly',
    customGenLimit: null,
    customGenLabel: '検討中',
  },
  pro: {
    customGenType: 'monthly',
    customGenLimit: null,
    customGenLabel: '検討中',
  },
};

export type UsageStatus = {
  planId: PlanId;
  limit: number | null;
  used: number;
  remaining: number | null; // null = 無制限
  isDemoUnlimited: boolean;
  isLimitReached: boolean;
};

export function calcUsageStatus(params: {
  planId: PlanId;
  customCountTotal: number;
  customCountThisMonth: number;
}): UsageStatus {
  const { planId, customCountTotal, customCountThisMonth } = params;
  const limitConfig = PLAN_LIMITS[planId];

  if (IS_DEMO_PERIOD) {
    return {
      planId,
      limit: null,
      used: customCountTotal,
      remaining: null,
      isDemoUnlimited: true,
      isLimitReached: false,
    };
  }

  const limit = limitConfig.customGenLimit;
  const used = limitConfig.customGenType === 'total' ? customCountTotal : customCountThisMonth;
  const remaining = limit !== null ? Math.max(0, limit - used) : null;

  return {
    planId,
    limit,
    used,
    remaining,
    isDemoUnlimited: false,
    isLimitReached: limit !== null && used >= limit,
  };
}

/** カウンセリング枠の設定（曜日 → 開始・終了時。火曜休み） */
export const SLOT_RULES: Partial<Record<number, { start: number; end: number }>> = {
  0: { start: 20, end: 22 }, // 日
  1: { start: 21, end: 22 }, // 月
  3: { start: 21, end: 22 }, // 水
  4: { start: 21, end: 22 }, // 木
  5: { start: 21, end: 22 }, // 金
  6: { start: 19, end: 22 }, // 土
};

export const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** 今日から totalDays 日後までの受付可能日を返す */
export function getAvailableDates(totalDays = 21): Date[] {
  const result: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() in SLOT_RULES) result.push(d);
  }
  return result;
}

/** 指定日の 15 分スロット一覧を返す */
export function getSlotsForDate(date: Date): Date[] {
  const rule = SLOT_RULES[date.getDay()];
  if (!rule) return [];
  const slots: Date[] = [];
  for (let h = rule.start; h < rule.end; h++) {
    for (let m = 0; m < 60; m += 15) {
      const s = new Date(date);
      s.setHours(h, m, 0, 0);
      slots.push(s);
    }
  }
  return slots;
}

/** スロットを DB 保存用の ISO 文字列に変換（JST 固定） */
export function slotToISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00+09:00`;
}

/** Date → "YYYY-MM-DD HH:mm" 形式のキー（比較用） */
export function slotKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** slotToISO() で保存した ISO 文字列 → slotKey 形式に変換 */
export function isoToSlotKey(iso: string): string {
  if (!iso || iso.length < 16) return '';
  return `${iso.substring(0, 10)} ${iso.substring(11, 16)}`;
}

/** 時刻表示 "HH:mm" */
export function fmtSlotTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 日付の短縮表示 "M/D(曜)" */
export function fmtDateShort(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}(${DAY_LABELS[date.getDay()]})`;
}

/** 日付のフル表示 "YYYY年M月D日(曜)" */
export function fmtDateFull(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${DAY_LABELS[date.getDay()]})`;
}

/** カレンダー表示用：全スロット時刻行（19:00 〜 21:45） */
export const ALL_SLOT_TIMES: { h: number; m: number; label: string }[] = [];
for (let h = 19; h < 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    ALL_SLOT_TIMES.push({ h, m, label: `${pad(h)}:${pad(m)}` });
  }
}

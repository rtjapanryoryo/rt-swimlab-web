#!/usr/bin/env node
/**
 * 練習メニュー精度検証スクリプト
 * 今回追加したルールに基づき、メニューが準拠しているかを検証する。
 *
 * 使い方:
 *   node scripts/validate-menu-accuracy.mjs                    # サンプルで検証
 *   node scripts/validate-menu-accuracy.mjs path/to/menu.json   # ファイルで検証
 */

// ブロック文字列から距離合計を算出（複数構成 → や + に対応）
function sumBlockDistance(text) {
  if (!text || typeof text !== 'string') return 0;
  const parts = text.trim().split(/\s*[→＋+]\s*/);
  let sum = 0;
  for (const part of parts) {
    const p = part.trim();
    // 本数×距離m（例: 4×50m）
    const cdMatch = p.match(/(\d+)\s*[×x]\s*(\d+)\s*m(?!\w)/);
    const dMatch = p.match(/(\d+)\s*m(?!\w)/);
    if (cdMatch) {
      sum += parseInt(cdMatch[1], 10) * parseInt(cdMatch[2], 10);
    } else if (dMatch) {
      sum += parseInt(dMatch[1], 10);
    }
  }
  return sum;
}

// total 文字列から数値を抽出（例: "合計距離：5,000m" → 5000）
function parseTotalToNumber(totalStr) {
  if (!totalStr) return null;
  const m = String(totalStr).match(/(\d[\d,]*)\s*m/);
  if (!m) return null;
  return parseInt(m[1].replace(/,/g, ''), 10);
}

// 強度を抽出して数値化（①=1, ②=2, ... ⑦=7）
function extractIntensityLevel(text) {
  if (!text) return null;
  const m = text.match(/[（(](A1|A2|EN1|EN2|EN3|EN4|AN1|AN2|AN3|AN)[)）]/i);
  const map = { A1: 1, A2: 1, EN1: 2, EN2: 3, EN3: 4, EN4: 4, AN1: 5, AN2: 6, AN3: 7, AN: 7 };
  if (m) return map[m[1].toUpperCase()] ?? null;
  // ①②等の全角
  const circleMatch = text.match(/[①②③④⑤⑥⑦]/);
  const circleMap = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7 };
  if (circleMatch) return circleMap[circleMatch[0]];
  return null;
}

/** メニューを検証し、結果を返す */
function validateMenu(menu, context = {}) {
  const issues = [];
  const passed = [];

  const { period, practiceTime, distanceType } = context;

  // 1) 総距離とブロック合計の一致
  const blocks = [
    ['warmUp', menu.warmUp],
    ['drill', menu.drill],
    ['kick', menu.kick],
    ['pull', menu.pull],
    ['preMain', menu.preMain],
    ['dive', menu.dive],
    ['rest', menu.rest],
    ['main', menu.main],
    ['down', menu.down],
  ];
  let blockSum = 0;
  for (const [key, val] of blocks) {
    const d = sumBlockDistance(val);
    blockSum += d;
  }
  const statedTotal = parseTotalToNumber(menu.total);
  if (statedTotal != null) {
    const diff = Math.abs(blockSum - statedTotal);
    if (diff > 50) {
      issues.push({
        rule: '総距離とブロック合計の一致',
        detail: `ブロック合計: ${blockSum}m、total記載: ${statedTotal}m、差: ${diff}m`,
      });
    } else {
      passed.push({ rule: '総距離とブロック合計の一致', detail: `ブロック合計=${blockSum}m、total=${statedTotal}m ✓` });
    }
  }

  // 2) Pre-Main と Main の強度差（Pre-Main が Main より一段階下）
  const preMainLevel = extractIntensityLevel(menu.preMain ?? '');
  const mainLevel = extractIntensityLevel(menu.main ?? '');
  if (preMainLevel != null && mainLevel != null && preMainLevel >= mainLevel) {
    issues.push({
      rule: 'Pre-Main と Main の強度差',
      detail: `Pre-Main=${preMainLevel}、Main=${mainLevel}。Pre-MainはMainより一段階下であること`,
    });
  } else if (preMainLevel != null && mainLevel != null) {
    passed.push({ rule: 'Pre-Main と Main の強度差', detail: `Pre-Main=${preMainLevel} < Main=${mainLevel} ✓` });
  }

  // 3) W-up の複数段階（2〜3段階）
  const warmUpParts = (menu.warmUp ?? '').split(/\s*[→＋+]\s*/).filter(Boolean);
  if (warmUpParts.length < 2 && (menu.warmUp ?? '').length > 0) {
    issues.push({
      rule: 'W-up 2〜3段階構成',
      detail: `現在1構成のみ。例: 200m（A1）→ 200m SKPS（A1）→ 100m Build`,
    });
  } else if (warmUpParts.length >= 2) {
    passed.push({ rule: 'W-up 2〜3段階構成', detail: `${warmUpParts.length}段階 ✓` });
  }

  // 4) Kick の複数構成（発展・スピード持久・耐乳酸期）
  const kickParts = (menu.kick ?? '').split(/\s*[→＋+]\s*/).filter(Boolean);
  const needsKick2 = ['3', '4', '5'].includes(period); // 発展3, スピード持久4, 耐乳酸5
  if (needsKick2 && kickParts.length < 2 && (menu.kick ?? '').length > 0) {
    issues.push({
      rule: 'Kick 2構成（発展・スピード持久・耐乳酸期）',
      detail: `期=${period}では2構成推奨。現在${kickParts.length}構成`,
    });
  } else if (needsKick2 && kickParts.length >= 2) {
    passed.push({ rule: 'Kick 2構成', detail: `${kickParts.length}構成 ✓` });
  }

  // 5) Pull の2構成
  const pullParts = (menu.pull ?? '').split(/\s*[→＋+]\s*/).filter(Boolean);
  if (pullParts.length < 2 && (menu.pull ?? '').length > 0) {
    issues.push({
      rule: 'Pull 2構成',
      detail: `現在1構成のみ。Fr中心で質の違いを持たせる`,
    });
  } else if (pullParts.length >= 2) {
    passed.push({ rule: 'Pull 2構成', detail: `${pullParts.length}構成 ✓` });
  }

  // 6) 耐乳酸期 120分で約5000m
  if (period === '5' && practiceTime === '120' && distanceType === 'S') {
    const totalVal = statedTotal ?? blockSum;
    if (totalVal < 4500) {
      issues.push({
        rule: '耐乳酸期120分Sタイプの距離',
        detail: `約5000m目標。現在${totalVal}m`,
      });
    } else if (totalVal >= 4500 && totalVal <= 5500) {
      passed.push({ rule: '耐乳酸期120分Sタイプ', detail: `${totalVal}m（5000m前後） ✓` });
    }
  }

  return { issues, passed, blockSum, statedTotal };
}

// サンプルメニュー（改善前・改善後想定）
const SAMPLES = {
  // 改善前：単一構成・総距離不一致・Pre-Main=Main
  before: {
    warmUp: 'Cho 400m（A1）',
    drill: 'Cho S1 drill 8×50m（EN1）',
    kick: 'Kick Cho 6×50m（EN2）',
    pull: 'Pull Cho 4×100m（EN2）',
    preMain: 'Pre-Main Cho 8×25m（EN3）',
    dive: '',
    rest: 'Rest 100m（A1）',
    main: 'Main S1 6×50m（EN3）',
    down: 'Cho 400m Mixed（A1）',
    total: '合計距離：2,700m',
  },
  // 改善後想定：複数構成・一致・Pre-Main<Main（Rest含めると500+400+400+600+300+100+400+400=3100→down調整で3000）
  after: {
    warmUp: 'Cho 200m（A1）→ Cho 200m SKPS（A1）→ Cho 100m Build（EN1）',
    drill: 'Cho S1 drill 8×50m（EN1）',
    kick: 'Kick 4×50m（Des）（EN1）+ Kick 4×50m（Fins）（EN2）',
    pull: 'Pull Fr 4×50m（DPS）（EN1）+ Pull Fr 4×100m（EN2）',
    preMain: 'Pre-Main Cho 6×50m（EN2）',
    dive: '',
    rest: '',
    main: 'Main S1 8×50m（EN3）',
    down: 'Cho 400m Mixed（A1）',
    total: '合計距離：3,000m',
  },
  // 耐乳酸期120分S用（約5000m目標）500+650+600+900+450+100+1300+500=5000
  lactate: {
    warmUp: 'Cho 200m（A1）→ Cho 200m SKPS（A1）→ Cho 100m Build（EN1）',
    drill: 'Cho S1 drill 13×50m（EN1）',
    kick: 'Kick 6×50m（EN1）+ Kick 6×50m（EN2）',
    pull: 'Pull Fr 6×50m（EN1）+ Pull Fr 6×100m（EN2）',
    preMain: 'Pre-Main Fr 9×50m（EN2）',
    dive: '',
    rest: 'Rest 100m（A1）',
    main: 'Main（耐乳酸MAX）26×50m @45秒（EN3）',
    down: 'Cho 500m Easy（A1）',
    total: '合計距離：5,000m',
  },
};

function runValidation() {
  console.log('=== 練習メニュー精度検証 ===\n');

  // 1. 改善前サンプル
  console.log('【1】改善前サンプル（単一構成・従来型）');
  const v1 = validateMenu(SAMPLES.before);
  console.log('  ブロック合計:', v1.blockSum, 'm / total記載:', v1.statedTotal, 'm');
  v1.issues.forEach((i) => console.log('  ❌', i.rule, ':', i.detail));
  v1.passed.forEach((p) => console.log('  ✓', p.rule));
  console.log('');

  // 2. 改善後サンプル
  console.log('【2】改善後想定サンプル（複数構成・一致）');
  const v2 = validateMenu(SAMPLES.after);
  console.log('  ブロック合計:', v2.blockSum, 'm / total記載:', v2.statedTotal, 'm');
  v2.issues.forEach((i) => console.log('  ❌', i.rule, ':', i.detail));
  v2.passed.forEach((p) => console.log('  ✓', p.rule));
  console.log('');

  // 3. 耐乳酸期120分サンプル
  console.log('【3】耐乳酸期120分Sタイプ（約5000m目標）');
  const v3 = validateMenu(SAMPLES.lactate, { period: '5', practiceTime: '120', distanceType: 'S' });
  console.log('  ブロック合計:', v3.blockSum, 'm / total記載:', v3.statedTotal, 'm');
  v3.issues.forEach((i) => console.log('  ❌', i.rule, ':', i.detail));
  v3.passed.forEach((p) => console.log('  ✓', p.rule));
  console.log('');

  // 4. 耐乳酸サンプルの総距離検証（blockSumとtotalの整合）
  const lactateBlockSum = sumBlockDistance(SAMPLES.lactate.warmUp) +
    sumBlockDistance(SAMPLES.lactate.drill) +
    sumBlockDistance(SAMPLES.lactate.kick) +
    sumBlockDistance(SAMPLES.lactate.pull) +
    sumBlockDistance(SAMPLES.lactate.preMain) +
    sumBlockDistance(SAMPLES.lactate.dive) +
    sumBlockDistance(SAMPLES.lactate.rest) +
    sumBlockDistance(SAMPLES.lactate.main) +
    sumBlockDistance(SAMPLES.lactate.down);
  console.log('【4】耐乳酸サンプル 各ブロック内訳:');
  console.log('  W-up:', sumBlockDistance(SAMPLES.lactate.warmUp), 'm（複数段階）');
  console.log('  Kick:', sumBlockDistance(SAMPLES.lactate.kick), 'm（2構成）');
  console.log('  Pull:', sumBlockDistance(SAMPLES.lactate.pull), 'm（2構成）');
  console.log('  Rest:', sumBlockDistance(SAMPLES.lactate.rest), 'm');
  console.log('  合計:', lactateBlockSum, 'm');
  console.log('');

  // サマリー
  const beforeScore = v1.issues.length;
  const afterScore = v2.issues.length;
  const lactateScore = v3.issues.length;
  console.log('=== 検証サマリー ===');
  console.log('改善前サンプル: 不適合', beforeScore, '件');
  console.log('改善後サンプル: 不適合', afterScore, '件');
  console.log('耐乳酸期サンプル: 不適合', lactateScore, '件');
  if (afterScore < beforeScore || lactateScore === 0) {
    console.log('\n→ 今回のルール追加により、適合度が向上する設計になっています。');
  }
  console.log('\n※ 実際の精度向上は、カスタムメニューAPIで生成した結果を本スクリプトで検証してください。');
}

// ファイル指定があればそのJSONを検証
const fileArg = process.argv[2];
if (fileArg) {
  import('fs').then((fs) => import('path').then((path) => {
    const filePath = path.resolve(process.cwd(), fileArg);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      const menu = data.result ?? data;
      const ctx = {
        period: data.period ?? menu.period,
        practiceTime: data.practiceTime ?? menu.practiceTime,
        distanceType: data.distanceType ?? menu.distanceType,
      };
      console.log('=== ファイル検証:', fileArg, '===\n');
      const v = validateMenu(menu, ctx);
      console.log('ブロック合計:', v.blockSum, 'm / total記載:', v.statedTotal, 'm\n');
      v.issues.forEach((i) => console.log('❌', i.rule, ':', i.detail));
      v.passed.forEach((p) => console.log('✓', p.rule));
      process.exit(v.issues.length > 0 ? 1 : 0);
    } catch (e) {
      console.error('ファイル読み込みエラー:', e.message);
      process.exit(1);
    }
  }));
} else {
  runValidation();
}

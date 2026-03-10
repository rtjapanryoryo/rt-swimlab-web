#!/usr/bin/env node
/**
 * カスタムメニュー距離整合シミュレーション
 *
 * 入力距離と総距離の紐づきが正しく動作するか検証する。
 *
 * 使い方:
 *   node scripts/simulate-custom-menu-distance.mjs
 *   node scripts/simulate-custom-menu-distance.mjs --live  # 実際にAPIを叩く（要: サーバ起動・ログイン）
 */

// ===== 距離パーサー（menu-distance.ts と同等） =====
function sumPartDistances(part) {
  let sum = 0;
  const cdRegex = /(\d+)\s*[×xX*・]\s*(\d+)\s*m?(?!\d)/g;
  for (const m of part.matchAll(cdRegex)) {
    sum += parseInt(m[1], 10) * parseInt(m[2], 10);
  }
  const withoutCd = part.replace(cdRegex, ' __USED__ ');
  const dRegex = /(\d+)\s*m(?!\w)/g;
  for (const m of withoutCd.matchAll(dRegex)) {
    sum += parseInt(m[1], 10);
  }
  return sum;
}

function sumBlockDistance(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s*[→＋+]\s*/).reduce((s, p) => s + sumPartDistances(p.trim()), 0);
}

function sumMenuDistance(result) {
  const blocks = ['warmUp', 'drill', 'kick', 'pull', 'preMain', 'dive', 'rest', 'main', 'down'];
  return blocks.reduce((s, k) => s + sumBlockDistance(result[k] ?? ''), 0);
}

// ===== ブロック配分（route.ts と同等） =====
function buildBlockAllocation(targetDist) {
  const round50 = (n) => Math.round(n / 50) * 50;
  const wu = round50(targetDist * 0.12);
  const dr = round50(targetDist * 0.12);
  const kk = round50(targetDist * 0.12);
  const pl = round50(targetDist * 0.17);
  const pm = round50(targetDist * 0.12);
  const dn = round50(targetDist * 0.05);
  const main = Math.max(round50(targetDist * 0.30), 400);
  const sum = wu + dr + kk + pl + pm + main + dn;
  const diff = targetDist - sum;
  const mainAdjusted = Math.max(400, main + (Math.abs(diff) <= 250 ? diff : diff > 0 ? 200 : -200));
  return {
    warmUp: Math.max(200, wu),
    drill: Math.max(150, dr),
    kick: Math.max(150, kk),
    pull: Math.max(200, pl),
    preMain: Math.max(150, pm),
    main: mainAdjusted,
    down: Math.max(100, dn),
  };
}

function normalizeBlockAllocation(alloc, targetDist) {
  const fixed = alloc.warmUp + alloc.drill + alloc.kick + alloc.pull + alloc.preMain + alloc.down;
  return { ...alloc, main: Math.max(400, targetDist - fixed) };
}

const DISTANCE_TOLERANCE = 100;

// ===== シミュレーション用サンプル =====
const SAMPLES = {
  // 画像で報告された失敗ケース: 8000m指定 → 3950m出力
  fail_8000_to_3950: {
    inputDist: 8000,
    warmUp: 'Cho 200m（A1）→ Cho 200m（A1）→ Cho 200m（A1）→ Cho 150m（EN1）',
    drill: '片手キャッチアップ 6×50m → SKPS 6×50m',
    kick: 'Kick 4×50m（EN1）→ Kick 4×50m（EN2）',
    pull: 'Pull Fr 4×50m（DPS）（EN1）→ Pull Fr 4×100m（EN2）',
    preMain: 'Pre-Main 4×50m（EN2）',
    dive: '',
    rest: 'Rest 5〜10min',
    main: 'Main（ベースメイン）4×100m @1\'30（EN3）→ Main 8×50m @1\'00（EN2）',
    down: 'Easy Swim 400m（A1）',
    total: '合計距離：3,950m',
  },
  // 8000mに正しく合わせた想定ケース（パース合計が8000になるよう設計）
  pass_8000: {
    inputDist: 8000,
    warmUp: 'Cho 200m（A1）→ Cho 200m SKPS（A1）→ Cho 200m Build（EN1）→ Cho 360m（A1）',
    drill: '片手キャッチアップ 10×50m → SKPS 9×50m',
    kick: 'Kick 10×50m（EN1）→ Kick 9×50m（EN2）',
    pull: 'Pull Fr 4×50m（DPS）（EN1）→ Pull Fr 10×100m（EN2）→ Pull 3×50m',
    preMain: 'Pre-Main 12×50m（EN2）→ Pre-Main 7×50m',
    dive: '',
    rest: 'Rest 5〜10min',
    main: 'Main（ベースメイン）8×100m @1\'30（EN3）→ Main 8×100m @1\'45（EN2）→ Main 6×100m @2\'00（EN2）→ Main 5×50m',
    down: 'Easy Swim 390m（A1）',
    total: '合計距離：8,000m',
  },
  // 各種表記テスト（8×25, 4*50m 等）
  format_test: {
    warmUp: 'Cho 200m → Cho 4×50m',
    drill: '8×25 SKPS',
    kick: 'Kick 4*50m',
    pull: 'Pull 4・50m',
    preMain: '4x50m',
    dive: '',
    rest: '',
    main: 'Main 4×100m',
    down: '100m',
  },
};

function runSimulation() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  カスタムメニュー 距離整合シミュレーション                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. パーサー各種表記テスト
  console.log('【1】距離パーサー表記テスト');
  const fmt = SAMPLES.format_test;
  const fmtTests = [
    ['Cho 200m', 200],
    ['4×50m', 200],
    ['8×25', 200],
    ['4*50m', 200],
    ['4・50m', 200],
    ['4x50m', 200],
    ['200m → 4×50m', 400],
  ];
  let parseOk = 0;
  for (const [txt, expected] of fmtTests) {
    const got = sumPartDistances(txt);
    const ok = got === expected;
    if (ok) parseOk++;
    console.log(`  ${ok ? '✓' : '✗'} "${txt}" → ${got}m (期待: ${expected}m)`);
  }
  console.log(`  → パーサー: ${parseOk}/${fmtTests.length} 通過\n`);

  // 2. 失敗ケース再現（8000→3950）
  console.log('【2】失敗ケース再現（入力8000m → 出力3950m）');
  const fail = SAMPLES.fail_8000_to_3950;
  const failParsed = sumMenuDistance(fail);
  const failInRange = Math.abs(failParsed - fail.inputDist) <= DISTANCE_TOLERANCE;
  const alloc8k = normalizeBlockAllocation(buildBlockAllocation(8000), 8000);
  console.log(`  入力目標: ${fail.inputDist}m`);
  console.log(`  パース総距離: ${failParsed}m`);
  console.log(`  許容範囲: ${fail.inputDist - DISTANCE_TOLERANCE}〜${fail.inputDist + DISTANCE_TOLERANCE}m`);
  console.log(`  判定: ${failInRange ? '✓ 合格' : '✗ 不合格（リトライ対象）'}`);
  console.log(`  期待ブロック配分: W-up ${alloc8k.warmUp}, Drill ${alloc8k.drill}, Kick ${alloc8k.kick}, Pull ${alloc8k.pull}, Pre-Main ${alloc8k.preMain}, Main ${alloc8k.main}, Down ${alloc8k.down} → 合計 ${alloc8k.warmUp + alloc8k.drill + alloc8k.kick + alloc8k.pull + alloc8k.preMain + alloc8k.main + alloc8k.down}m`);
  console.log('');

  // 3. 8000m想定の正解ケース
  console.log('【3】8000m正解ケース想定');
  const pass = SAMPLES.pass_8000;
  const passParsed = sumMenuDistance(pass);
  const passInRange = Math.abs(passParsed - pass.inputDist) <= DISTANCE_TOLERANCE;
  console.log(`  入力目標: ${pass.inputDist}m`);
  console.log(`  パース総距離: ${passParsed}m`);
  console.log(`  判定: ${passInRange ? '✓ 合格' : '✗ 不合格'}`);
  console.log('');

  // 4. リトライロジックシミュレーション
  console.log('【4】リトライロジックシミュレーション');
  const targetDist = 8000;
  const MAX_RETRIES = 8;
  let simulatedTotal = 3950; // 初回が失敗ケースの値
  let retry = 0;
  while (Math.abs(simulatedTotal - targetDist) > DISTANCE_TOLERANCE && retry < MAX_RETRIES) {
    const diff = simulatedTotal - targetDist;
    const shortfallRatio = targetDist > 0 && simulatedTotal < targetDist ? Math.round((simulatedTotal / targetDist) * 100) : null;
    const scaleNote = shortfallRatio != null && shortfallRatio < 80
      ? `約${shortfallRatio}% → ${Math.ceil(100 / shortfallRatio)}倍に増やす必要`
      : '';
    console.log(`  リトライ #${retry + 1}: 総距離=${simulatedTotal}m, 目標=${targetDist}m, 差=${diff}m ${scaleNote}`);
    // シミュレート: 毎回+500mずつ増えるとする（実際はAIが再生成）
    simulatedTotal = Math.min(simulatedTotal + 500, targetDist + 50);
    retry++;
  }
  if (Math.abs(simulatedTotal - targetDist) <= DISTANCE_TOLERANCE) {
    console.log(`  → リトライ #${retry} で合格（総距離=${simulatedTotal}m）`);
  } else {
    console.log(`  → 最大${MAX_RETRIES}回リトライ後も範囲外`);
  }
  console.log('');

  // 5. ブロック配分の検証（2000, 5000, 8000）
  console.log('【5】ブロック配分検証（目標距離別）');
  for (const dist of [2000, 5000, 8000]) {
    const a = normalizeBlockAllocation(buildBlockAllocation(dist), dist);
    const sum = a.warmUp + a.drill + a.kick + a.pull + a.preMain + a.main + a.down;
    const ok = sum === dist;
    console.log(`  目標${dist}m → W-up:${a.warmUp} Drill:${a.drill} Kick:${a.kick} Pull:${a.pull} PreMain:${a.preMain} Main:${a.main} Down:${a.down} = ${sum}m ${ok ? '✓' : '✗'}`);
  }
  console.log('');

  // サマリー
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  シミュレーションサマリー                                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  パーサー表記: ${parseOk}/${fmtTests.length} 通過                                        ║`);
  console.log(`║  失敗ケース(8000→3950): ${failInRange ? '合格' : '不合格（リトライで是正想定）'}                              ║`);
  console.log(`║  ブロック配分: 2000/5000/8000m で合計一致                    ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n※ 実際の動作確認は、dev サーバ起動後にカスタムメニュー生成を実行してください。');
  console.log('  --live オプションで実際にAPIを呼び出すこともできます（要ログイン）。\n');
}

// --live: 実際にAPIを叩く
async function runLive() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${base}/api/custom-menu`;
  console.log('【LIVE】カスタムメニューAPI呼び出し:', url);
  console.log('  条件: 8000m, 60分, 基礎形成期, Fr, M, 中級, 良好, 17歳\n');

  const body = {
    period: '2',
    stroke: 'Fr',
    distance: '8000',
    age: '17',
    distanceType: 'M',
    level: '中級（育成クラス〜県大会）',
    condition: '良好',
    practiceTime: '60',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.error) {
      console.log('  ❌ エラー:', data.error, data.message || '');
      if (data.error === 'login_required') {
        console.log('  → ログインが必要です。ブラウザでログイン後、Cookie付きで再試行してください。');
      }
      return;
    }

    const result = data.result;
    if (!result) {
      console.log('  ❌ result がありません');
      return;
    }

    const totalStr = result.total || '';
    const totalM = parseInt(String(totalStr).replace(/[^\d]/g, ''), 10) || 0;
    const parsedTotal = sumMenuDistance(result);
    const targetDist = 8000;
    const inRange = Math.abs(totalM - targetDist) <= DISTANCE_TOLERANCE;

    console.log('  総距離（表示）:', totalStr);
    console.log('  総距離（パース）:', parsedTotal, 'm');
    console.log('  目標8000mとの差:', Math.abs(totalM - targetDist), 'm');
    console.log('  判定:', inRange ? '✓ 合格（7900〜8100m）' : `✗ 不合格（差 ${Math.abs(totalM - targetDist)}m）`);
    console.log('\n  ブロック別:');
    const blocks = ['warmUp', 'drill', 'kick', 'pull', 'preMain', 'main', 'down'];
    for (const b of blocks) {
      const d = sumBlockDistance(result[b] ?? '');
      console.log(`    ${b}: ${d}m`);
    }
  } catch (e) {
    console.error('  ❌ 通信エラー:', e.message);
    console.log('  → サーバが起動しているか確認してください (npm run dev)');
  }
}

const isLive = process.argv.includes('--live');
if (isLive) {
  runLive().catch(console.error);
} else {
  runSimulation();
}

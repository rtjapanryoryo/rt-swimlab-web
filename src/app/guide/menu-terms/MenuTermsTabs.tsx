'use client';

import { type KeyboardEvent, useState } from 'react';

const sections = [
  {
    id: 'sections',
    title: 'メニューの構成',
    terms: [
      ['W-up', 'ウォームアップ。体を温め、水の感覚と泳ぎのリズムを整えます。'],
      ['Drill', 'フォームや動作を部分的に確認する技術練習です。'],
      ['Kick', 'キックを中心に行う練習です。板を使う場合と使わない場合があります。'],
      ['Pull', '腕のかきと水を捉える感覚を中心に行う練習です。'],
      ['Pre-Main', 'メイン練習へ向けて、スピードや動きを段階的に整えます。'],
      ['Main', 'その日の目的を最も強く反映した中心となる練習です。'],
      ['Down / W-down', '練習後にゆっくり泳ぎ、呼吸と体の状態を整えます。'],
    ],
  },
  {
    id: 'strokes',
    title: '泳法・種目',
    terms: [
      ['Fr', '自由形（Freestyle）。通常はクロールを指します。'],
      ['Ba', '背泳ぎ（Backstroke）。'],
      ['Br', '平泳ぎ（Breaststroke）。'],
      ['Fly', 'バタフライ（Butterfly）。'],
      ['IM', '個人メドレー（Individual Medley）。4泳法を順番に泳ぎます。'],
      ['Cho', '泳法を自由に選ぶ指定（Choice）です。'],
      ['S1', '自分の専門種目、またはその練習で指定された中心種目です。'],
    ],
  },
  {
    id: 'patterns',
    title: '練習パターン',
    terms: [
      ['SKPS', 'Swim・Kick・Pull・Swimの順に泳ぎ、全身の動きを整える構成です。'],
      ['Des', '本数を重ねるごとに段階的にスピードを上げます（Descending）。'],
      ['Build / B-up', '1本の中で徐々にスピードを上げます（Build-up）。'],
      ['DPS', '1ストロークで進む距離（Distance Per Stroke）を意識します。'],
      ['Smooth', '力まず、フォームと水の感覚を保って滑らかに泳ぎます。'],
      ['Hold', '指定されたペースやフォームを保ち続けます。'],
      ['Negative split', '後半を前半より速く泳ぐペース配分です。'],
      ['IM Order', 'バタフライ・背泳ぎ・平泳ぎ・自由形の順で泳ぎます。'],
      ['odd / even', '奇数本（odd）と偶数本（even）で内容を切り替えます。'],
      ['Alt', '指定された内容を交互に行います（Alternate）。'],
      ['Easy / Hard / MAX', 'Easyは余裕を持った強度、Hardは高強度、MAXは全力です。'],
    ],
  },
  {
    id: 'intensity',
    title: '強度の目安',
    terms: [
      ['① A1 / A2', '回復やフォーム確認を目的とした、余裕のある強度です。'],
      ['② EN1', '長く続けやすい有酸素運動の基礎強度です。'],
      ['③ EN2', '呼吸が上がる中強度。持久力とペース維持を鍛えます。'],
      ['④ EN3', '高めの有酸素強度。スピードを保つ力を鍛えます。'],
      ['⑤ AN1', '高強度で、乳酸が増える中でも泳ぎを維持する練習です。'],
      ['⑥ AN2', '非常に高い強度。十分な休息を取りながら行います。'],
      ['⑦ MAX', '最大努力のスピード練習です。フォームと安全を優先します。'],
    ],
  },
  {
    id: 'notation',
    title: '数字・記号の読み方',
    terms: [
      ['10×50m', '50mを10本行います。'],
      ['@15sec', 'このアプリでは、本数の間に15秒休む目安を表します。'],
      ['1:30', '1分30秒を表します。'],
      ['1H / 1E', 'Hardを1本、Easyを1本の順で交互に行います。'],
      ['1→4 Des', '1本目から4本目へ向けて段階的に速くします。'],
    ],
  },
] as const;

type SectionId = (typeof sections)[number]['id'];

export default function MenuTermsTabs() {
  const [activeId, setActiveId] = useState<SectionId>(sections[0].id);
  const activeSection = sections.find((section) => section.id === activeId) ?? sections[0];

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % sections.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + sections.length) % sections.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = sections.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextSection = sections[nextIndex];
    setActiveId(nextSection.id);
    requestAnimationFrame(() => document.getElementById(`tab-${nextSection.id}`)?.focus());
  };

  return (
    <>
      <div className="overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          role="tablist"
          aria-label="用語カテゴリ"
          className="flex min-w-max gap-1 pt-4"
        >
          {sections.map((section, index) => {
            const isActive = section.id === activeId;

            return (
              <button
                key={section.id}
                id={`tab-${section.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${section.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveId(section.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`border-b-2 px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'border-cyan-600 text-cyan-800'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {section.title}
              </button>
            );
          })}
        </div>
      </div>

      <section
        id={`panel-${activeSection.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeSection.id}`}
        tabIndex={0}
        className="py-9 focus-visible:outline-none"
      >
        <h2 className="mb-5 text-xl font-bold text-slate-950">{activeSection.title}</h2>
        <dl className="divide-y divide-slate-200 border-b border-slate-200">
          {activeSection.terms.map(([term, description]) => (
            <div key={term} className="grid gap-2 py-4 sm:grid-cols-[150px_1fr] sm:gap-6">
              <dt className="font-bold text-slate-900">{term}</dt>
              <dd className="leading-7 text-slate-600">{description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

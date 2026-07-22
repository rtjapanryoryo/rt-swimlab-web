import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '水泳メニュー用語集 | RT swim lab',
  description: 'RT swim labの練習メニューで使用する水泳用語と強度表記の説明です。',
};

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

export default function MenuTermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link href="/mypage/menu" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
            ← メニュー生成へ戻る
          </Link>
          <span className="text-sm text-slate-500">RT swim lab</span>
        </div>

        <header className="border-b border-slate-300 pb-7">
          <p className="mb-2 text-sm font-bold text-cyan-700">SWIMMING MENU GUIDE</p>
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">水泳メニュー用語集</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            練習メニューに表示される略語や強度の意味を、実際に泳ぐときの考え方とあわせて確認できます。
          </p>
        </header>

        <nav aria-label="用語カテゴリ" className="flex flex-wrap gap-x-5 gap-y-3 border-b border-slate-200 py-5 text-sm font-semibold">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="text-cyan-700 hover:text-cyan-900">
              {section.title}
            </a>
          ))}
        </nav>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-6 border-b border-slate-200 py-9">
            <h2 className="mb-5 text-xl font-bold text-slate-950">{section.title}</h2>
            <dl className="divide-y divide-slate-200">
              {section.terms.map(([term, description]) => (
                <div key={term} className="grid gap-2 py-4 sm:grid-cols-[150px_1fr] sm:gap-6">
                  <dt className="font-bold text-slate-900">{term}</dt>
                  <dd className="leading-7 text-slate-600">{description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <div className="pt-8">
          <Link href="/mypage/menu" className="inline-flex items-center justify-center bg-cyan-600 px-5 py-3 text-sm font-bold text-white hover:bg-cyan-700">
            メニュー生成へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}

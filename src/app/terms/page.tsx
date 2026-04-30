import { createClient } from '@supabase/supabase-js';
import React from 'react';

export const dynamic = 'force-dynamic';
export const metadata = { title: '利用規約 | RT swim lab' };

interface DocSection { title: string; body: string; }
interface LegalDoc {
  doc_title: string;
  intro: string;
  sections: DocSection[];
  footer: string;
  updated_at: string;
}

async function fetchDoc(): Promise<LegalDoc | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await sb.from('legal_documents').select('*').eq('id', 'terms').single();
    return data ?? null;
  } catch {
    return null;
  }
}

function renderBody(body: string): React.ReactNode {
  const blocks: React.ReactNode[] = [];
  const lines = body.split('\n');
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) { blocks.push(<p key={`p${blocks.length}`}>{para.join('\n')}</p>); para = []; }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul${blocks.length}`} className="list-disc list-inside space-y-1 ml-2">
          {list.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
      list = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2)); }
    else if (line === '')      { flushPara(); flushList(); }
    else                       { flushList(); para.push(line); }
  }
  flushPara();
  flushList();
  return <>{blocks}</>;
}

const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-base font-bold text-slate-900 border-l-4 border-cyan-400 pl-3">{title}</h2>
    <div className="text-sm text-slate-600 leading-relaxed space-y-2 pl-1">{children}</div>
  </section>
);

// ── 静的フォールバックコンテンツ ──────────────────────────────────────────
function StaticTerms() {
  const updated = '2026年4月24日';
  return (
    <>
      <p className="text-xs text-slate-400 mt-1">最終更新：{updated}</p>
      <p className="text-sm text-slate-600 leading-relaxed">
        本利用規約（以下「本規約」）は、RT Japan（以下「当社」）が提供する水泳トレーニング支援サービス「RT swim lab」（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただく前に、本規約をよくお読みください。本サービスにアカウント登録または利用を開始した時点で、本規約に同意したものとみなします。
      </p>
      <Sec title="第1条（サービスの概要）">
        <p>本サービスは、人工知能（AI）を活用した水泳トレーニングメニューの自動生成、目標シートの作成支援、練習ログの管理等の機能を提供するものです。</p>
        <p>本サービスが提供するコンテンツはすべて情報提供・参考提示を目的としており、専門的なコーチング指導、医療アドバイス、または怪我の予防・治療を保証するものではありません。</p>
      </Sec>
      <Sec title="第2条（AIが生成するコンテンツについて）">
        <p>本サービスが提供するトレーニングメニュー、アドバイス、フィードバック等のコンテンツは、AIによって自動生成されます。以下の点をご了承ください。</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>AI生成コンテンツは参考情報であり、利用者個人の体力・健康状態・技術レベルに完全に適合することを保証しません。</li>
          <li>提案されたメニューが利用者の目的・レベルに合致するか否かの最終判断は、利用者自身または担当コーチが行ってください。</li>
          <li>AI生成コンテンツの正確性・完全性・有用性について、当社は一切の保証を行いません。</li>
        </ul>
      </Sec>
      <Sec title="第3条（免責事項）">
        <p className="font-semibold text-slate-700">利用者は、以下の内容に同意した上で本サービスを利用するものとします。</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>本サービスを通じて得た情報・トレーニングメニューの実施に伴う怪我、事故、健康上の問題について、当社は一切の責任を負いません。</li>
          <li>新たなトレーニングを開始する前に、必要に応じて医師・専門家に相談してください。</li>
          <li>本サービスは水泳の専門コーチやトレーナーの指導に代わるものではありません。</li>
          <li>本サービスの利用によって生じた直接的・間接的な損害（データの消失、利益の損失等を含む）について、当社の故意または重大な過失による場合を除き、当社は賠償責任を負いません。</li>
          <li>本サービスは現状有姿（as-is）で提供されます。特定の目的への適合性、正確性、継続性、完全性について保証しません。</li>
          <li>通信障害・システム障害・第三者サービスの障害等により本サービスが利用できない場合でも、当社は責任を負いません。</li>
        </ul>
      </Sec>
      <Sec title="第4条（利用者の責任）">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>利用者は、自己の責任において本サービスを利用するものとします。</li>
          <li>アカウント情報（メールアドレス・パスワード）の管理は利用者自身の責任で行ってください。第三者による不正利用が生じた場合でも、当社は責任を負いません。</li>
          <li>利用者が本規約に違反したことにより当社に損害が生じた場合、利用者は当該損害を賠償する責任を負います。</li>
        </ul>
      </Sec>
      <Sec title="第5条（禁止事項）">
        <p>利用者は、以下の行為を行ってはなりません。</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>当社の著作権・知的財産権を侵害する行為</li>
          <li>本サービスのシステムに不正にアクセスする行為</li>
          <li>本サービスを通じて取得した情報を無断で第三者に提供・販売する行為</li>
          <li>虚偽の情報を入力・登録する行為</li>
          <li>その他、法令・公序良俗に反する行為</li>
        </ul>
      </Sec>
      <Sec title="第6条（サービスの変更・停止・終了）">
        <p>当社は、以下の場合にサービスの全部または一部を変更・停止・終了することができます。その際、利用者への事前通知に努めますが、緊急の場合はこの限りではありません。</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>システムのメンテナンス・更新を行う場合</li>
          <li>天変地異・停電等の不可抗力が生じた場合</li>
          <li>その他、当社が必要と判断した場合</li>
        </ul>
        <p>サービスの変更・停止・終了によって利用者に生じた損害について、当社は責任を負いません。</p>
      </Sec>
      <Sec title="第7条（知的財産権）">
        <p>本サービスに含まれるコンテンツ、デザイン、ソフトウェア等の知的財産権はすべて当社または正当な権利者に帰属します。利用者は、個人的な利用目的の範囲内でのみ本サービスのコンテンツを利用できます。</p>
      </Sec>
      <Sec title="第8条（規約の変更）">
        <p>当社は、必要に応じて本規約を変更することができます。変更後の規約は本サービス上に掲載した時点で効力を生じ、利用者が変更後に本サービスを利用した場合、変更後の規約に同意したものとみなします。</p>
      </Sec>
      <Sec title="第9条（準拠法・管轄裁判所）">
        <p>本規約は日本法に準拠します。本規約に関して紛争が生じた場合は、当社所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
      </Sec>
      <div className="border-t border-slate-100 pt-6 text-xs text-slate-400">
        <p>お問い合わせ：サービス内のフィードバック機能またはコーチへのご連絡をご利用ください。</p>
      </div>
    </>
  );
}

export default async function TermsPage() {
  const doc = await fetchDoc();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-8">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{doc?.doc_title ?? '利用規約'}</h1>
            <p className="text-xs text-slate-400 mt-1">
              最終更新：{doc?.updated_at
                ? new Date(doc.updated_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                : '2026年4月24日'}
            </p>
          </div>

          {doc ? (
            <>
              {doc.intro && <p className="text-sm text-slate-600 leading-relaxed">{doc.intro}</p>}
              {doc.sections.map((s, i) => (
                <Sec key={i} title={s.title}>{renderBody(s.body)}</Sec>
              ))}
              {doc.footer && (
                <div className="border-t border-slate-100 pt-6 text-xs text-slate-400">
                  <p>{doc.footer}</p>
                </div>
              )}
            </>
          ) : (
            <StaticTerms />
          )}
        </div>
      </div>
    </div>
  );
}

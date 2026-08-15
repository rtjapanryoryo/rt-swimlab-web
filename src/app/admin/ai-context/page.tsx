import { getCustomMenuContextSummary } from '@/lib/ai-context/custom-menu-context';

const VERSION_LABELS: Record<string, string> = {
  contextVersion: 'コンテキスト',
  promptVersion: 'プロンプト',
  knowledgeVersion: 'ナレッジ',
  outputContractVersion: '出力形式',
  evaluationVersion: '評価基準',
  generationRuleVersion: 'メニュー構成ルール',
  timingRuleVersion: 'サークル算出ルール',
};

const OUTPUT_FIELD_LABELS: Record<string, string> = {
  purpose: '目的',
  intention: 'ねらい',
  coachingPoint: '指導ポイント',
  caution: '注意点',
  expectedEffect: '期待できる効果',
};

export default function AiContextPage() {
  const context = getCustomMenuContextSummary();

  return (
    <main className="max-w-6xl space-y-8 p-6 lg:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-sky-600">Custom Menu</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">AIコンテキスト</h1>
          <p className="mt-2 text-sm text-slate-600">
            custom生成で現在使われている設定と、更新対象を確認できます。
          </p>
        </div>
        <span className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
          閲覧専用
        </span>
      </header>

      <section aria-labelledby="version-heading" className="space-y-3">
        <div>
          <h2 id="version-heading" className="text-lg font-bold text-slate-900">バージョン</h2>
          <p className="mt-1 text-sm text-slate-500">生成履歴に保存される現在の識別情報です。</p>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(context.versions).map(([key, value]) => (
            <div key={key} className="bg-white px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">{VERSION_LABELS[key] ?? key}</dt>
              <dd className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="model-heading" className="space-y-3">
        <h2 id="model-heading" className="text-lg font-bold text-slate-900">モデル既定値</h2>
        <dl className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-slate-500">モデル</dt><dd className="mt-1 font-mono text-sm font-semibold text-slate-800">{context.modelDefaults.model}</dd></div>
          <div><dt className="text-xs text-slate-500">Temperature</dt><dd className="mt-1 font-mono text-sm font-semibold text-slate-800">{context.modelDefaults.temperature}</dd></div>
          <div><dt className="text-xs text-slate-500">最大トークン</dt><dd className="mt-1 font-mono text-sm font-semibold text-slate-800">{context.modelDefaults.maxTokens}</dd></div>
          <div><dt className="text-xs text-slate-500">レスポンス形式</dt><dd className="mt-1 font-mono text-sm font-semibold text-slate-800">{context.modelDefaults.responseFormat}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="prompt-heading" className="space-y-3">
        <div>
          <h2 id="prompt-heading" className="text-lg font-bold text-slate-900">システムプロンプト</h2>
          <p className="mt-1 text-sm text-slate-500">AIへ毎回渡している最優先ルールです。</p>
        </div>
        <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-950 p-5 text-sm leading-7 text-slate-100">
          {context.systemPrompt}
        </pre>
      </section>

      <section aria-labelledby="output-heading" className="space-y-3">
        <div>
          <h2 id="output-heading" className="text-lg font-bold text-slate-900">AIが生成する項目</h2>
          <p className="mt-1 text-sm text-slate-500">距離・本数・サークルはサーバー側で確定し、AIは次の説明文だけを生成します。</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr><th className="px-4 py-3 font-semibold">項目</th><th className="px-4 py-3 font-semibold">出力例</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {context.outputFields.map((field) => (
                <tr key={field}>
                  <th className="w-44 px-4 py-3 align-top font-semibold text-slate-800">{OUTPUT_FIELD_LABELS[field] ?? field}<span className="ml-2 font-mono text-xs font-normal text-slate-400">{field}</span></th>
                  <td className="whitespace-pre-line px-4 py-3 leading-6 text-slate-600">{context.outputExample[field as keyof typeof context.outputExample]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="evaluation-heading" className="space-y-3">
        <div>
          <h2 id="evaluation-heading" className="text-lg font-bold text-slate-900">固定評価ケース</h2>
          <p className="mt-1 text-sm text-slate-500">{context.evaluation.purpose}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-800">全ケース共通の合格基準</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 lg:grid-cols-2">
            {context.evaluation.commonCriteria.map((criterion) => (
              <li key={criterion} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {context.evaluation.cases.map((evaluationCase) => (
            <article key={evaluationCase.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-slate-900">{evaluationCase.title}</h3>
                <code className="shrink-0 text-[11px] text-slate-400">{evaluationCase.id}</code>
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500">入力条件</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {evaluationCase.inputSummary.map((item) => (
                    <li key={item} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{item}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500">このケースで確認すること</p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                  {evaluationCase.expected.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="source-heading" className="space-y-3">
        <div>
          <h2 id="source-heading" className="text-lg font-bold text-slate-900">管理場所</h2>
          <p className="mt-1 text-sm text-slate-500">変更はGit管理のファイルで行い、レビュー後に反映します。</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {context.managementLocations.map((location) => (
              <li key={location.path} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div><p className="text-sm font-semibold text-slate-800">{location.label}</p><p className="mt-1 break-all font-mono text-xs text-slate-500">{location.path}</p></div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">使用中</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="inactive-heading" className="space-y-3">
        <div>
          <h2 id="inactive-heading" className="text-lg font-bold text-slate-900">未接続の知識ファイル</h2>
          <p className="mt-1 text-sm text-slate-500">次のファイルは存在しますが、現在のcustom生成には読み込まれていません。</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {context.inactiveKnowledgeSources.map((path) => (
            <li key={path} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <code className="break-all text-xs text-amber-950">{path}</code>
              <span className="shrink-0 text-xs font-semibold text-amber-700">未接続</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

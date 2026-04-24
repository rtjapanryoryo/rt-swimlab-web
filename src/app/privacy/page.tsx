export const metadata = { title: 'プライバシーポリシー | RT swim lab' };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-base font-bold text-slate-900 border-l-4 border-cyan-400 pl-3">{title}</h2>
    <div className="text-sm text-slate-600 leading-relaxed space-y-2 pl-1">{children}</div>
  </section>
);

export default function PrivacyPage() {
  const updated = '2026年4月24日';
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-8">

          <div>
            <h1 className="text-xl font-bold text-slate-900">プライバシーポリシー</h1>
            <p className="text-xs text-slate-400 mt-1">最終更新：{updated}</p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            RT Japan（以下「当社」）は、水泳トレーニング支援サービス「RT swim lab」（以下「本サービス」）の利用者の個人情報を適切に取り扱うため、以下のプライバシーポリシーを定めます。
          </p>

          <Section title="1. 収集する情報">
            <p>本サービスでは、以下の情報を収集する場合があります。</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>アカウント情報：</strong>メールアドレス、パスワード（暗号化して保存）、表示名</li>
              <li><strong>プロフィール情報：</strong>水泳レベル、専門種目、目標タイム、所属クラブ等（任意入力）</li>
              <li><strong>利用データ：</strong>生成したトレーニングメニュー、目標シート、練習ログ、フィードバック</li>
              <li><strong>サービス利用履歴：</strong>アクセス日時、機能の利用状況</li>
              <li><strong>技術情報：</strong>IPアドレス、ブラウザの種類（サービス改善目的）</li>
            </ul>
          </Section>

          <Section title="2. 情報の利用目的">
            <p>収集した情報は以下の目的で利用します。</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>本サービスの提供・運営・改善</li>
              <li>AIによるパーソナライズされたトレーニングメニューの生成</li>
              <li>コーチとの情報共有（担当コーチがいる場合）</li>
              <li>お問い合わせ・サポート対応</li>
              <li>サービスに関する重要なお知らせの送信</li>
              <li>利用状況の分析・統計処理（個人を特定しない形）</li>
            </ul>
          </Section>

          <Section title="3. 情報の第三者提供">
            <p>当社は、以下の場合を除き、利用者の個人情報を第三者に提供しません。</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>利用者本人の同意がある場合</li>
              <li>法令に基づく開示が必要な場合</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
            </ul>
            <p>本サービスは、データベース・認証機能の提供においてSupabase Inc.のサービスを利用しています。利用者データはSupabaseのサーバーに保存される場合があります。</p>
          </Section>

          <Section title="4. 個人情報の管理">
            <p>当社は、利用者の個人情報を適切に管理し、不正アクセス・紛失・破壊・改ざん・漏洩等のリスクに対して合理的な安全対策を講じます。ただし、インターネット上での完全な安全性を保証するものではありません。</p>
          </Section>

          <Section title="5. データの保存期間">
            <p>収集した個人情報は、サービスの提供に必要な期間保存します。アカウント削除のご要望があった場合は、合理的な期間内に対象データを削除します。ただし、法令上の保存義務がある情報はこの限りではありません。</p>
          </Section>

          <Section title="6. Cookieの利用">
            <p>本サービスでは、ログイン状態の維持等のために必要最小限のCookieを使用します。ブラウザの設定によりCookieを無効にすることができますが、その場合、一部の機能が正常に動作しない場合があります。</p>
          </Section>

          <Section title="7. 利用者の権利">
            <p>利用者は以下の権利を有します。</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>自己の個人情報の開示・訂正・削除の請求</li>
              <li>アカウントの削除（本サービス内の設定またはお問い合わせより）</li>
            </ul>
            <p>上記のご要望は、サービス内のフィードバック機能よりお問い合わせください。</p>
          </Section>

          <Section title="8. 未成年者の利用">
            <p>18歳未満の利用者が本サービスを利用する場合は、保護者の同意を得た上でご利用ください。当社は、保護者の同意なく18歳未満の方の個人情報を意図的に収集することはありません。</p>
          </Section>

          <Section title="9. プライバシーポリシーの変更">
            <p>当社は、法令の改正やサービス内容の変更に伴い、本ポリシーを変更することがあります。変更後は本ページに掲載し、重要な変更の場合はサービス内でお知らせします。</p>
          </Section>

          <div className="border-t border-slate-100 pt-6 text-xs text-slate-400 space-y-1">
            <p>お問い合わせ：サービス内のフィードバック機能よりご連絡ください。</p>
          </div>

        </div>
      </div>
    </div>
  );
}

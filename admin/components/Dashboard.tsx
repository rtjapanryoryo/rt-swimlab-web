'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type Summary = { thisMonthCount: number; totalUsers: number; totalGenerated: number };
type MonthlyCount = { month: string; count: number };
type HourlyDist = { hour: number; label: string; count: number };
type UserRank = { id: string; display_name: string; count: number; role: string; joined: string };
type Analytics = {
  summary: Summary;
  monthlyCounts: MonthlyCount[];
  hourlyDistribution: HourlyDist[];
  userRanking: UserRank[];
};

export default function Dashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('データ取得に失敗しました'); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm animate-pulse">読み込み中...</div>
    </div>
  );
  if (error || !data) return (
    <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>
  );

  const { summary, monthlyCounts, hourlyDistribution, userRanking } = data;
  const thisMonth = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

  return (
    <div className="space-y-8">
      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label={`${thisMonth}の生成回数`} value={summary.thisMonthCount} unit="回" color="indigo" />
        <SummaryCard label="登録ユーザー数" value={summary.totalUsers} unit="名" color="emerald" />
        <SummaryCard label="累計生成回数" value={summary.totalGenerated} unit="回" color="violet" />
      </div>

      {/* 月別生成回数 */}
      <Section title="月別生成回数" subtitle="過去の月ごとの生成数推移">
        {monthlyCounts.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyCounts} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                formatter={(v) => [`${v}回`, '生成回数']}
              />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* 時間帯別分布 */}
      <Section title="時間帯別利用分布" subtitle="何時に使われているか（全期間）">
        {hourlyDistribution.every(h => h.count === 0) ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyDistribution} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" tickFormatter={h => `${h}時`} tick={{ fill: '#94a3b8', fontSize: 11 }} interval={2} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                formatter={(v) => [`${v}回`, '利用回数']}
                labelFormatter={h => `${h}時台`}
              />
              <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ユーザー別利用回数 */}
      <Section title="ユーザー別利用回数" subtitle="累計生成回数の多い順（上位20名）">
        {userRanking.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2.5 pr-4 text-slate-400 font-medium">#</th>
                  <th className="text-left py-2.5 pr-4 text-slate-400 font-medium">ユーザー名</th>
                  <th className="text-right py-2.5 pr-4 text-slate-400 font-medium">生成回数</th>
                  <th className="text-left py-2.5 pr-4 text-slate-400 font-medium">役割</th>
                  <th className="text-left py-2.5 text-slate-400 font-medium">登録日</th>
                </tr>
              </thead>
              <tbody>
                {userRanking.map((u, i) => (
                  <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 pr-4 text-slate-500">{i + 1}</td>
                    <td className="py-2.5 pr-4 text-slate-100 font-medium">{u.display_name}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="text-indigo-400 font-semibold">{u.count}</span>
                      <span className="text-slate-500 text-xs ml-1">回</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        u.role === 'admin' ? 'bg-amber-900/50 text-amber-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 text-xs">
                      {new Date(u.joined).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function SummaryCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-600/20 border-indigo-700/50 text-indigo-400',
    emerald: 'bg-emerald-600/20 border-emerald-700/50 text-emerald-400',
    violet: 'bg-violet-600/20 border-violet-700/50 text-violet-400',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-bold text-white">{value.toLocaleString()}<span className="text-base font-normal text-slate-400 ml-1">{unit}</span></p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyState() {
  return <p className="text-center text-slate-500 text-sm py-8">データがありません</p>;
}

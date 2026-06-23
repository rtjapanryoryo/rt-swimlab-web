import MenuGeneratorPanel from '@/components/MenuGeneratorPanel';
import { MAINTENANCE_MODE } from '@/lib/plan-limits';

export default function RTSwimLabMenuPage() {
  return (
    <div className="space-y-5">
      {MAINTENANCE_MODE && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-bold">本リリース準備中です</p>
          <p className="mt-1">
            クイック生成の画面確認はできます。カスタム生成は現在停止中のため、正式公開準備が完了してから利用できます。
          </p>
        </div>
      )}

      <MenuGeneratorPanel embedded />
    </div>
  );
}

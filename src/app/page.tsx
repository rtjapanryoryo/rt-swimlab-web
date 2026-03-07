'use client';

import MenuGeneratorPanel from '@/components/MenuGeneratorPanel';

/** トップページ：ミドルウェアでログイン時は /mypage へリダイレクトされるため、ここには通常到達しない */
export default function Page() {
  return <MenuGeneratorPanel />;
}

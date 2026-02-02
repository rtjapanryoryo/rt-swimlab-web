'use client';

import { signOut, useSession } from 'next-auth/react';

export function UserNav() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const { name, email, image } = session.user;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 truncate max-w-[180px]">
        {name ?? email ?? 'ログイン中'}
      </span>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          width={32}
          height={32}
          className="rounded-full w-8 h-8"
        />
      )}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
      >
        ログアウト
      </button>
    </div>
  );
}

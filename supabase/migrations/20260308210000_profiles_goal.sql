-- profiles に「あなたの目標」と表示切替を追加
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_goal BOOLEAN NOT NULL DEFAULT true;

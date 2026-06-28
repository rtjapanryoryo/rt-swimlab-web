# GPT / Codex 開発運用ルール

このドキュメントは、RT Swim Lab の開発・運用作業で GPT / Codex に依頼する
ときの前提ルールを記録します。

目的は、作業方針、担当範囲、PR本文言語、merge方法、env / DB 方針が、
事前相談なしに変更されることを防ぐことです。

## 1. 基本方針

- 方針変更は必ず事前に人間へ確認する。
- 承認なしに作業方針を変えない。
- Codex に任せていた作業を GPT 判断で手作業へ切り替えない。
- 手作業に切り替える場合は、理由、影響、代替案を提示して承認を得る。
- 手作業から Codex へ切り替える場合も、同じように事前確認する。
- 方針変更が必要になった場合は、実行前に止まり、人間の明示承認を待つ。

## 2. PR / Git 運用

- PR本文は日本語を基本とする。
- PRタイトル・本文の言語を変える場合は、事前に確認する。
- merge方法は通常の merge commit を基本とする。
- squash merge、rebase merge、force push は勝手に使わない。
- PR作成、PR確認、merge、branch cleanup まで手順を省略しない。
- PR確認時は、Files changed、checks、conflict、secret混入確認を必ず行う。
- merge前に、対象PR番号、head branch、base branch、merge状態を確認する。
- merge後に、ローカル `main` の最新化と不要branch整理を行う。

## 3. env / secret / DB 運用

- `.env.ai` / `.env.local` の実値を表示しない。
- Project URL、anon key、service_role key、DB password、UID、connection string を表示しない。
- `NEXT_PUBLIC_` に service_role を入れない。
- Supabase、Vercel、DB、認証に触る作業は、対象環境を明示する。
- Production、Preview、staging、local の区別を必ず書く。
- 本番DBに書き込む可能性がある作業は、事前確認なしに実行しない。
- migration、`db push`、SQL実行、Authユーザー作成、Vercel env変更は、
  対象環境と影響範囲を確認してから行う。
- secret値は README、docs、Issue、PR本文、チャットログに書かない。

## 4. 一時対応ルール

- 一時対応の場合は、必ず「一時対応」と明記する。
- 一時対応の目的、影響範囲、戻し方、恒久対応の判断基準を書く。
- 一時対応を恒久対応のように扱わない。
- 一時対応を行った場合は、後で見直せるようにdocs、Issue、PR本文のいずれかに
  判断材料を残す。

## 5. Codex 指示文に入れる固定文

重要作業を Codex へ依頼する場合は、必要に応じて次の固定文を入れる。

```text
# 方針変更禁止

これまでの運用方針を変更しないでください。

- Codexに任せている作業を、勝手に手作業へ切り替えない
- PR本文の言語を勝手に変更しない
- merge方法を勝手に変更しない
- env運用、DB操作方針、本番/Preview方針を勝手に変更しない
- 方針変更が必要な場合は、実行前に必ず人間へ確認する
- 承認なしに進めない
```

## 6. 今回の再発防止メモ

今回の事例では、Codex ではなく GPT 側が方針変更した。

- Codex は指示に沿って動いていた。
- ユーザー側の問題ではない。
- GPT 側が、事前相談なしに手作業PR作成へ誘導した。
- GPT 側が、日本語PR本文方針に反して英語本文を出した。
- 今後は、作業方針、担当範囲、PR本文言語、merge方式、env / DB 方針を
  変える前に必ず確認する。

このルールは、GPT / Codex の作業品質を安定させるための運用ルールであり、
既存の env 運用、DB操作方針、本番 / Preview 方針を変更するものではない。

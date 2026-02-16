# LINE での共有・PDF保存

## 概要

LINEでURLを送ると、デフォルトでは**LINE内ブラウザ**（WebView）で開きます。LINE内ブラウザでは以下の制限があります。

- PDFダウンロードが正常に動作しない場合がある
- 印刷が制限される場合がある
- Googleログイン等で問題が起きる場合がある

## 解決策：外部ブラウザで開く

### 方法1：URLにパラメータを付ける（推奨）

**LINEで共有するURLの末尾に `?openExternalBrowser=1` を付けてください。**

例：
```
https://rt-swimlab-web-tl3a.vercel.app/?openExternalBrowser=1
```

このURLをタップすると、Safari・Chrome などの**外部ブラウザ**で開き、PDF保存・印刷が確実に動作します。

### 方法2：アプリ内の「LINEで共有する」ボタン

トップページの「LINEで共有する（URLコピー）」をタップすると、`openExternalBrowser=1` 付きのURLがコピーされます。そのURLをLINEに貼り付けて送信してください。

### 方法3：LINE内で表示中の場合

LINE内ブラウザで開いてしまった場合、画面上部に黄色の案内バナーが表示されます。

- **「ブラウザ用URLをコピー」** をタップ → コピーしたURLをLINEで自分に送る → そのURLをタップすると外部ブラウザで開く
- または **右上の ⋮ メニュー** → 「Safariで開く」「Chromeで開く」を選択

### 方法4：ユーザー側の設定（iOSのみ）

LINEアプリの設定で「リンクをデフォルトのブラウザで開く」をオンにすると、すべてのリンクが外部ブラウザで開きます。

- ホーム → 設定（歯車）→ LINE Labs → 「リンクをデフォルトのブラウザで開く」をオン

※LINE Labs は予告なく変更される場合があります。

## 動作確認済み

- メッセージ内のURLをタップ
- リッチメニューからURLを開く
- QRコード読み取りでURLを開く

いずれも `openExternalBrowser=1` 付きURLであれば、iOS・Android ともに外部ブラウザで開くことを確認しています。

## 参考

- [LINEで利用できるURLスキーム｜LINE Developers](https://developers.line.biz/ja/docs/line-login/using-line-url-scheme/#opening-url-in-external-browser)

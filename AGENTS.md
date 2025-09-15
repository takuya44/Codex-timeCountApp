# Repository Guidelines

## プロジェクト構成とモジュール配置
- ルート直下: `index.html`（UI/DOM）、`styles.css`（デザインルール準拠のスタイル）、`app.js`（ストップウォッチ/カウントダウンのロジック）。
- ドキュメント: `docs/`（`DESIGN_RULE.md`, `UX_IMPROVEMENTS.md`, `PROMPTS_USED.md`）。
- 依存なし・静的構成（フレームワーク未使用）。アセットは現状なし。

## ビルド・実行・開発コマンド
- そのまま開く: `index.html` をブラウザで開く（最速の確認）。
- 簡易サーバ（推奨）:
  - `python3 -m http.server 8080` ⇒ `http://localhost:8080`
  - `npx serve .` ⇒ `http://localhost:3000` など
- ビルド工程はありません。変更は即時反映（リロードで確認）。

## コーディング規約と命名
- インデント: 2スペース、セミコロン必須、シングルクォート優先（HTML除く）。
- JavaScript: 変数/関数は lowerCamelCase、列挙/型は PascalCase（例: `Mode`）、定数は UPPER_SNAKE 可。
- CSS: クラスは kebab-case（例: `.timer-display`, `.btn-primary`）。
- ファイル: 小文字＋必要に応じてハイフン（例: `utils-time.js`）。
- アクセシビリティ: `aria-live` 等の属性を削除しない。`focus-visible` の可視リングを維持。

## テスト方針
- 自動テストは未導入。PR 前に次を手動確認:
  - キーボード操作（Tab/Enter/Space）で全機能が動く
  - `aria-live` による読み上げ文言が適切
  - プリセット（1/10/15分）が正しく反映
  - カウントダウン完了の通知・状態遷移
  - モバイル幅でのレイアウト崩れ無し
- 追加提案: 将来的に Playwright で E2E を導入可。

## コミット・プルリクエスト規約
- コミットは Conventional Commits 準拠を推奨: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `chore:`
  - 例: `feat(timer): ラップ機能を追加`
- PR には以下を含める:
  - 目的・背景、主要変更点、スクリーンショット/GIF、関連Issue、手動確認手順、影響範囲
  - 変更は小さく分割し、不要ファイル（ビルド物/ログ）は含めない

## セキュリティと設定
- `.env` はコミットしない（`.env.example` を用意推奨）。外部 API 依存は現状なし。
- 静的配信で動作（CORS/認証設定は不要）。`.gitignore` は既に適用済み。

## アーキテクチャ概要
- Vanilla JS + DOM API。状態はフラット変数で保持し、`setInterval` による tick 更新。
- UI は `index.html` と `styles.css` に集約。複雑化する場合はモジュール分割（`/scripts`, `/styles` 等）を検討します。

# Markdown List Continuation

Markdown の行頭マーカー (`-` `*` `+` `1.` `> ` タスクリスト) を Enter で自動継続する、最小構成の Kiro/VS Code 拡張機能。

## 特徴

- **JS は約 50 行のみ、外部依存ゼロ、ネットワーク通信なし**
- 大半の処理は VS Code 組み込みの `onEnterRules` (宣言ルール) に任せ、JS は特殊ケース 2 つだけ処理する
- ビルド不要、パッケージング不要

## 対応している挙動

| 入力例 | Enter 後 |
| --- | --- |
| `- foo` | 次行に `- ` |
| `* foo` | 次行に `* ` |
| `+ foo` | 次行に `+ ` |
| `  - foo` (ネスト) | 次行に `  - ` (同じインデント) |
| `1. foo` | 次行に `2. ` (自動採番) |
| `1) foo` | 次行に `2) ` |
| `- [ ] foo` | 次行に `- [ ] ` |
| `- [x] foo` | 次行に `- [ ] ` |
| `> foo` | 次行に `> ` |
| `- ` だけの行で Enter | 行頭〜行末を削除 (マーカー解除) |
| 箇条書き行で Tab | インデントを 1 段増やす |
| 箇条書き行で Shift+Tab | インデントを 1 段減らす |

## 制限

- 番号付きリストの「途中に行を挿入したら以降を採番し直す」のような後追い修正はしない
- Tab でのインデント変更時にマーカーを段階に応じて変える (`-` → `*` → `+` のような切り替え) はしない。インデントのみ変更
- フェンス付きコードブロック内は素朴に判定 (上から ``` の数を数える)。長文ファイルでも実用上問題ないが、奇抜な構造の文書では誤判定する可能性あり

## 仕組み

```
Enter キー入力
    ↓
package.json の keybindings で markdownListContinuation.onEnter にルーティング
    ↓
extension.js の onEnter() が判定
    ├── 空のリスト項目? → 行を削除
    ├── 番号付きリスト? → 次の番号を挿入
    └── それ以外 → vscode.commands.executeCommand('type', {text: '\n'})
                     ↓
                   VS Code 本体が onEnterRules を評価し、
                   language-configuration.json のルールで
                   - / * / + / > / - [ ] を継続
```

JS 側は「`onEnterRules` で表現できないケース」だけを引き受ける薄いラッパー

## インストール

### 方法 A: シンボリックリンク (おすすめ)

```bash
# Kiro の場合
ln -s {{git clone を実行したフォルダ}}/code-oss-extentions/markdown-list-continuation \
      ~/.kiro/extensions/sugikeitter.markdown-list-continuation-0.2.0
```

その後、Kiro のコマンドパレットで `Developer: Reload Window` を実行。

### 方法 B: VSIX としてパッケージング

```bash
npm install -g @vscode/vsce
cd {{git clone を実行したフォルダ}}/code-oss-extentions/markdown-list-continuation
vsce package --allow-missing-repository

# Kiro の場合
kiro --install-extension markdown-list-continuation-0.2.0.vsix
```

## アンインストール

### Kiro の場合
- 方法 A: `rm ~/.kiro/extensions/sugikei.markdown-list-continuation-0.2.0`
- 方法 B: コマンドパレットの "Extensions: Show Installed Extensions" から削除

## トラブルシュート

- Enter を押しても何も起きない → `editor.acceptSuggestionOnEnter` が `on` のときに補完が出ていると、`!suggestWidgetVisible` 条件で発火しないことがある (これは仕様)
- Enter で常に挿入されてしまう → `editorLangId == markdown` の言語判定が効いているか確認 (ステータスバー右下)

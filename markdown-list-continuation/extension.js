// @ts-check
'use strict';

const vscode = require('vscode');

/** @param {vscode.ExtensionContext} context */
function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('markdownListContinuation.onEnter', onEnter),
        vscode.commands.registerCommand('markdownListContinuation.onTab', () => onTab(false)),
        vscode.commands.registerCommand('markdownListContinuation.onShiftTab', () => onTab(true))
    );
}

async function onEnter() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selections.length > 1 || !editor.selection.isEmpty) {
        return defaultEnter();
    }

    // フェンス付きコードブロック判定は実用上不要なため無効化 (元コードは isInFencedCodeBlock 関数を参照)
    // if (isInFencedCodeBlock(editor.document, editor.selection.active.line)) {
    //     return defaultEnter();
    // }

    const cursor = editor.selection.active;
    const line = editor.document.lineAt(cursor.line);

    // 1) 空のリスト項目で Enter
    //    インデント + (- | * | + | 数字. | 数字)) + (任意のチェックボックス) + 1個以上の空白
    //    末尾を \s+$ にして "-" 単独 / "1." 単独などにマッチしないようにする
    const EMPTY = /^(\s*)(?:[-*+]|\d+[.)])(?:\s+\[[ xX]\])?\s+$/;
    const empty = EMPTY.exec(line.text);
    if (empty) {
        if (empty[1].length > 0) {
            // ネストしている -> 一段アウトデント (もう一度 Enter で解除)
            return vscode.commands.executeCommand('editor.action.outdentLines');
        }
        // トップレベル -> 行を空にする
        await editor.edit(b => b.delete(new vscode.Range(
            new vscode.Position(cursor.line, 0),
            line.range.end
        )));
        return;
    }

    // 1b) 空の引用ブロックで Enter -> 行を空にする
    //     "> " "> > " ">> " などの形にマッチ
    const EMPTY_QUOTE = /^(?:\s*>)+\s+$/;
    if (EMPTY_QUOTE.test(line.text)) {
        await editor.edit(b => b.delete(new vscode.Range(
            new vscode.Position(cursor.line, 0),
            line.range.end
        )));
        return;
    }

    // 2) 番号付きリストの自動採番
    //    "  3. foo" の行で、カーソルがマーカーの後 (列 >= プレフィックス長) のときだけ
    //    次行に "  4. " を挿入する。行頭にカーソルがあるときは defaultEnter に渡して通常の改行扱い。
    const NUM = /^((\s*)(\d+)([.)])\s+)\S/;
    const m = NUM.exec(line.text);
    if (m && cursor.character >= m[1].length) {
        const indent = m[2];
        const next = parseInt(m[3], 10) + 1;
        const sep = m[4];
        await editor.edit(b => b.replace(editor.selection, `\n${indent}${next}${sep} `));
        return;
    }

    // 上記以外は通常の Enter (onEnterRules が走る)
    return defaultEnter();
}

// /**
//  * フェンス付きコードブロック内かどうかを判定する。
//  * 現状の使い道では Enter ごとに先頭から全行を走査するコストに見合わないため使用していない。
//  * 必要になったら有効化する。
//  *
//  * @param {vscode.TextDocument} doc
//  * @param {number} lineNumber
//  */
// function isInFencedCodeBlock(doc, lineNumber) {
//     let fences = 0;
//     for (let i = 0; i < lineNumber; i++) {
//         if (/^\s*```/.test(doc.lineAt(i).text)) fences++;
//     }
//     return fences % 2 === 1;
// }

function defaultEnter() {
    // 'type' コマンドに '\n' を渡すと、エディタの通常入力経路で改行が処理される。
    // この経路では language-configuration.json の onEnterRules も評価される。
    return vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' });
}

/** @param {boolean} shift */
async function onTab(shift) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const cursor = editor.selection.active;
    const line = editor.document.lineAt(cursor.line);

    // リスト項目の行かどうか (- / * / + / 数字. / 数字))
    const LIST = /^\s*(?:[-*+]|\d+[.)])(?:\s+\[[ xX]\])?\s/;

    if (editor.selection.isEmpty && LIST.test(line.text)) {
        return vscode.commands.executeCommand(
            shift ? 'editor.action.outdentLines' : 'editor.action.indentLines'
        );
    }

    // それ以外は通常の Tab/Shift+Tab
    return vscode.commands.executeCommand(shift ? 'outdent' : 'tab');
}

function deactivate() { }

module.exports = { activate, deactivate };

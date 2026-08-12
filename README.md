# 地上戦活動DB Ver.2（分割版）

HTML・CSS・JavaScript・Google Apps Scriptを分け、GitHubで管理しやすくした構成です。

## 構成

```text
ground-campaign-db-v2/
├── index.html
├── assets/
│   ├── css/styles.css
│   └── js/
│       ├── config.js
│       ├── state.js
│       ├── utils.js
│       ├── api.js
│       ├── auth.js
│       ├── map.js
│       ├── records.js
│       ├── views.js
│       ├── admin.js
│       └── main.js
├── gas/Code.gs
└── README.md
```

## 設定

1. Googleスプレッドシートを作成します。
2. Apps Scriptへ `gas/Code.gs` を貼り付けます。
3. Apps Scriptエディタで次を一度実行します。

```javascript
setup_({
  adminLoginId: 'admin',
  adminPassword: '必ず強いパスワードに変更',
  adminName: '管理者'
});
```

4. Apps Scriptをウェブアプリとしてデプロイします。
5. 発行された `/exec` URLを `assets/js/config.js` の `SCRIPT_URL` に設定します。
6. フォルダ一式をGitHubへ置き、GitHub Pagesを有効にします。

## GitHub運用例

現在の公開版を残したまま、`v2-dev` ブランチへ入れる方法が安全です。

```bash
git checkout -b v2-dev
git add .
git commit -m "地上戦活動DB Ver.2を分割構成へ変更"
git push -u origin v2-dev
```

## 権限

- `member`：所属支部のデータ閲覧・登録・編集
- `leader`：所属支部のユーザー管理
- `prefecture_admin`：全支部閲覧・管理
- `system_admin`：全権限

氏名・住所を扱うため、公開前にダミーデータで動作確認してください。

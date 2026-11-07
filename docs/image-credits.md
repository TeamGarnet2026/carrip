# 画像の出典とライセンス

ホーム画面「行き先から考える」のエリアカード（`carrip/app/page.tsx` の `AREAS`）で使う写真です。
実ファイルは `carrip/public/areas/<slug>-<幅>.jpg`（4:5 にトリミングのうえ再圧縮）。
用意してある幅は `AREAS` の `widths` と一致させてください。元画像が小さく拡大になる幅は作りません。

いずれも CC0 またはパブリックドメインで、表示時の出典表記は不要です。
差し替える場合もこの条件を満たすものを選んでください。

> 検索で見つけた画像や、他サイトで使われている画像をそのまま持ってこないこと。
> 明示的なライセンス表示がない写真は原則として転載できません。

| slug | エリア | 被写体 | 出典 | ライセンス |
| --- | --- | --- | --- | --- |
| `kyoto` | 京都 | 伏見稲荷大社 千本鳥居 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:20181110_Fushimi_Inari_Torii_3.jpg) | CC0 |
| `hakone` | 箱根 | 芦ノ湖と富士山 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:View_of_Mount_Fuji_from_Lake_Ashi.jpg) | CC0 |
| `izu` | 伊豆 | 堂ヶ島 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Dogashima_20121019.jpg) | パブリックドメイン |
| `karuizawa` | 軽井沢 | 雲場池の紅葉 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Karuizawa_-_Karuizawa6410.jpg) | CC0 |

## ヒーロー画像

`carrip/app/page.tsx` / `carrip/app/not-found.tsx` / `carrip/components/layout/app-shell.tsx` が参照している
`images.unsplash.com/photo-1493976040374-85c8e12f0c0e` は Unsplash からの外部ホットリンクで、
ローカルには持っていません。

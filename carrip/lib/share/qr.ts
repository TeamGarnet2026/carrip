import QRCode from 'qrcode'

/**
 * 共有URLの QR コードの設定。
 * 画面に 200px で表示し、ダウンロードした画像も読み取れるよう 360px で作る。
 * margin はカメラが QR を見つけるための余白（モジュール数）
 */
export const SHARE_QR_OPTIONS = { width: 360, margin: 1 } as const

/** 共有URLの QR コードを PNG の data URL で作る（共有URLを外部サービスに送らない） */
export function createShareQrDataUrl(shareUrl: string): Promise<string> {
  return QRCode.toDataURL(shareUrl, SHARE_QR_OPTIONS)
}

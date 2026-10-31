import jsQR from 'jsqr'
import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import { SHARE_QR_OPTIONS, createShareQrDataUrl } from '@/lib/share/qr'

/**
 * QR コードを画像（RGBA）にしてから jsQR で読み取る。
 * カメラで読み取ったときと同じく、画像から URL を取り出せるかを確かめる
 */
function decodeQr(text: string): string | null {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const { size, data } = qr.modules
  const margin = SHARE_QR_OPTIONS.margin
  const scale = Math.max(1, Math.floor(SHARE_QR_OPTIONS.width / (size + margin * 2)))
  const pixels = (size + margin * 2) * scale
  const rgba = new Uint8ClampedArray(pixels * pixels * 4).fill(255)

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!data[row * size + col]) continue
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const px = (col + margin) * scale + x
          const py = (row + margin) * scale + y
          const i = (py * pixels + px) * 4
          rgba[i] = 0
          rgba[i + 1] = 0
          rgba[i + 2] = 0
        }
      }
    }
  }

  return jsQR(rgba, pixels, pixels)?.data ?? null
}

describe('share QR code', () => {
  it('decodes back to the production share URL', () => {
    const url = 'https://carrip.vercel.app/share/Ab3dE9xZ'
    expect(decodeQr(url)).toBe(url)
  })

  it('keeps the exact URL for local and preview hosts', () => {
    for (const url of [
      'http://localhost:3000/share/k7Pq2mWn',
      'https://carrip-git-feature-fr09-test-teamgarnet2026.vercel.app/share/Zz00Yy11',
    ]) {
      expect(decodeQr(url)).toBe(url)
    }
  })

  it('creates a PNG data URL for display and download', async () => {
    const dataUrl = await createShareQrDataUrl('https://carrip.vercel.app/share/Ab3dE9xZ')
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
  })

  it('leaves a quiet zone so phone cameras can find the code', () => {
    expect(SHARE_QR_OPTIONS.margin).toBeGreaterThanOrEqual(1)
    expect(SHARE_QR_OPTIONS.width).toBeGreaterThanOrEqual(200)
  })
})

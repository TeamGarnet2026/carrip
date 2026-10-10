/**
 * 配列内の要素を from の位置から to の位置へ移動した新しい配列を返す。
 * 範囲外の指定や from === to の場合は元の並びのコピーを返す。
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return next
  }

  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

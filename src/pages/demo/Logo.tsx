import { cx } from '../../lib/cx'

export type LogoProps = {
  /** Render the "InsuraLens" wordmark beside the mark. */
  wordmark?: boolean
  /** Diameter of the mark, in pixels. */
  size?: number
  /**
   * Mount the mark on a light tile.
   *
   * The mark's ink is 95% #0E544C (measured in the brand pipeline). On white
   * that is 8.78:1; on the deep navy brand panel it is 1.55:1, so the mark
   * would effectively disappear. The tile is presentation, not a new asset —
   * the shipped PNG is untouched, exactly as scripts/brand/build.py composites
   * it onto a light background for the touch icon.
   */
  tile?: boolean
  className?: string
}

export function Logo({ wordmark = true, size = 48, tile = false, className }: LogoProps) {
  const mark = (
    <img
      className="logo__mark"
      src="/brand/logo.png"
      width={size}
      height={size}
      alt={wordmark ? '' : 'InsuraLens'}
    />
  )

  return (
    <span className={cx('logo', className)}>
      {tile ? <span className="logo__tile">{mark}</span> : mark}
      {wordmark && <span className="logo__word">InsuraLens</span>}
    </span>
  )
}

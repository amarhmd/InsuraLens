import { BrandVisual } from './BrandVisual'

/**
 * The left panel: what the product is, stated once.
 *
 * The lens illustration sits in the upper-right area and the headline is
 * anchored to the bottom-left, so the copy and the art never compete. The panel
 * is purely presentational and is dropped entirely below the lg breakpoint.
 */
export function BrandPanel() {
  return (
    <aside className="brand" aria-labelledby="brand-statement">
      <div className="brand__art" aria-hidden="true">
        <BrandVisual className="brand__visual" />
      </div>

      <div className="brand__copy">
        <p className="brand__headline" id="brand-statement">
          Bring complex claims evidence <span className="brand__accent">into focus.</span>
        </p>
        <p className="brand__support">
          AI connects and explains the evidence. People make the final call.
        </p>
      </div>
    </aside>
  )
}

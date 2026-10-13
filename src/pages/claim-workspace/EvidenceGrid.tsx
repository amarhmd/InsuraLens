import { cx } from '../../lib/cx'
import type { EvidenceItem } from '../../data/claim'
import { DocGlyph, PhotoGlyph } from './glyphs'

type EvidenceGridProps = {
  items: EvidenceItem[]
  /** Tile to pulse briefly, when a finding chip points at it. */
  highlightedId: string | null
}

/** "Evidence & documents" — photos as gradient tiles, documents as dashed tiles. */
export function EvidenceGrid({ items, highlightedId }: EvidenceGridProps) {
  return (
    <section className="cw-card cw-section" aria-labelledby="cw-evidence-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title" id="cw-evidence-title">
          Evidence &amp; documents
        </h2>
      </div>

      <ul className="cw-evidence">
        {items.map((item) => (
          <li
            key={item.id}
            id={`evidence-${item.id}`}
            className={cx(
              'cw-evidence__tile',
              item.kind === 'photo' ? 'cw-evidence__tile--photo' : 'cw-evidence__tile--doc',
              highlightedId === item.id && 'cw-evidence__tile--highlight',
            )}
          >
            <span className="cw-evidence__thumb">
              {item.kind === 'photo' ? <PhotoGlyph /> : <DocGlyph />}
            </span>
            <span className="cw-evidence__caption">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

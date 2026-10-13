import { BrandVisual } from './BrandVisual'
import { TrustPoint } from './TrustPoint'
import { LinkIcon, SparkleIcon, UserCheckIcon } from '../../components/ui/icons'

/**
 * The left panel: what the product is, stated once. The illustration is a large
 * decorative background behind the copy (see .brand__art in login.css); the
 * three trust points answer "what does it actually do?" without a paragraph.
 *
 * Purely presentational — the panel collapses to a logo banner below 900px.
 */
export function BrandPanel() {
  return (
    <aside className="brand" aria-labelledby="brand-statement">
      <div className="brand__logo">
        <img
          src="/insuralens-logo-white.png"
          alt="InsuraLens"
          className="login-logo login-logo--navy"
        />
      </div>

      <div className="brand__art" aria-hidden="true">
        <BrandVisual className="brand__visual" />
      </div>

      <div className="brand__copy">
        <p className="brand__statement" id="brand-statement">
          Bring complex claims evidence <span className="brand__accent">into focus</span>.
        </p>
        <p className="brand__support">
          AI-assisted claims review that connects evidence, explains findings, and keeps final
          decisions in human hands.
        </p>

        <ul className="brand__trust">
          <TrustPoint icon={<LinkIcon size={16} />}>Evidence-linked findings</TrustPoint>
          <TrustPoint icon={<SparkleIcon size={16} />}>Explainable AI analysis</TrustPoint>
          <TrustPoint icon={<UserCheckIcon size={16} />}>Human-in-the-loop decisions</TrustPoint>
        </ul>
      </div>
    </aside>
  )
}

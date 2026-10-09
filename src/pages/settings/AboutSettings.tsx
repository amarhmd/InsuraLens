import { DEMO_MODULES, PRODUCT } from '../../lib/settingsStore'
import { DefList, DefRow, SectionHeader, SettingsGroup } from './settingsKit'

/**
 * About InsuraLens — product facts only. No fictional company details,
 * certifications, or customer numbers.
 */
export function AboutSettings() {
  return (
    <>
      <SectionHeader title="About InsuraLens" description="Product information and prototype details." />

      <div className="st-about">
        <p className="st-about__name">{PRODUCT.name}</p>
        <p className="st-about__desc">{PRODUCT.description}</p>
        <p className="st-about__principle">{PRODUCT.principle}</p>
      </div>

      <SettingsGroup title="Product details">
        <DefList>
          <DefRow label="Product name">{PRODUCT.name}</DefRow>
          <DefRow label="Product description">{PRODUCT.description}</DefRow>
          <DefRow label="Version">
            <span className="st-badge st-badge--info">{PRODUCT.version}</span>
          </DefRow>
          <DefRow label="Interface status">
            <span className="st-badge st-badge--info">{PRODUCT.interfaceStatus}</span>
          </DefRow>
          <DefRow label="Available sections">
            <ul className="st-links">
              {DEMO_MODULES.map((module) => (
                <li key={module.label}>
                  <a className="st-link" href={module.hash}>
                    {module.label}
                  </a>
                </li>
              ))}
            </ul>
          </DefRow>
        </DefList>
      </SettingsGroup>

      <SettingsGroup title="Product principle">
        <p className="st-placeholder">{PRODUCT.principle}</p>
      </SettingsGroup>
    </>
  )
}

import { ShieldIcon } from '../../components/layout/icons'
import { EyeIcon, LinkIcon, LockIcon, SparkleIcon } from '../../components/ui/icons'
import { useAiPrefs } from '../../hooks/useAiPrefs'
import { saveAiPrefs, type AiPrefs } from '../../lib/aiPrefs'
import { SectionHeader, SettingsGroup, SavedStatus, ToggleRow, useSavedFlash } from './settingsKit'

/**
 * AI Review Preferences — the display switches the Claim workspace really
 * reads. Each one hides or shows a specific piece of AI-assisted UI; none of
 * them changes an AI analysis or a claim decision, and Approve stays disabled
 * until every damage area is confirmed or dismissed whatever these are set to.
 */
export function AIReviewSettings() {
  const prefs = useAiPrefs()
  const { saved, flash } = useSavedFlash()

  const set = (patch: Partial<AiPrefs>) => {
    saveAiPrefs(patch)
    flash()
  }

  return (
    <>
      <SectionHeader
        icon={<SparkleIcon size={20} />}
        title="AI Review Preferences"
        description="Choose how AI-assisted suggestions appear while you review a claim."
      />

      <SettingsGroup
        title="Claim workspace display"
        hint="These switches only change what the Claim workspace shows you. They do not change any AI analysis or any claim decision."
      >
        <ToggleRow
          id="ai-damage-boxes"
          icon={<EyeIcon size={18} />}
          label="Show AI-suggested damage boxes on the damage map"
          hint="Shows the numbered damage areas the AI marked on the illustration."
          checked={prefs.damageBoxes}
          onChange={(damageBoxes) => set({ damageBoxes })}
        />
        <ToggleRow
          id="ai-evidence-links"
          icon={<LinkIcon size={18} />}
          label="Show evidence links on AI findings"
          hint="Shows the chips linking a finding to the evidence it relies on."
          checked={prefs.evidenceLinks}
          onChange={(evidenceLinks) => set({ evidenceLinks })}
        />
        <ToggleRow
          id="ai-badges"
          icon={<SparkleIcon size={18} />}
          label="Show AI-generated badges and verification reminders"
          hint="Shows the AI-suggested tags and each finding's status badge."
          checked={prefs.aiBadges}
          onChange={(aiBadges) => set({ aiBadges })}
        />
      </SettingsGroup>

      <SavedStatus visible={saved} />

      <div className="st-fixed-note">
        <span className="st-fixed-note__icon" aria-hidden="true">
          <ShieldIcon size={18} />
        </span>
        <p className="st-fixed-note__text">
          <strong className="st-fixed-note__lead">
            Final claim decisions always remain with an authorized reviewer.
          </strong>{' '}
          This cannot be changed.
        </p>
        <span className="st-fixed-note__lock">
          <LockIcon size={14} />
          Always on
        </span>
      </div>
    </>
  )
}

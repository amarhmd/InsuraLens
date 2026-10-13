import { CheckIcon } from './chatIcons'

export type StepState = 'complete' | 'current' | 'attention' | 'pending'

export interface Step {
  state: StepState
  label: string
  value: string
}

/**
 * Vertical investigation timeline. Filled / current / attention / pending
 * states are carried by both a glyph colour and the status text, so the
 * sequence never reads by colour alone.
 */
export function StatusStepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="stepper">
      {steps.map((step, i) => (
        <li key={step.label} className={`stepper__item stepper__item--${step.state}`}>
          <span className="stepper__rail" aria-hidden="true">
            <span className="stepper__node">
              {step.state === 'complete' && <CheckIcon size={11} />}
            </span>
            {i < steps.length - 1 && <span className="stepper__line" />}
          </span>
          <span className="stepper__body">
            <span className="stepper__label">{step.label}</span>
            <span className="stepper__value">{step.value}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

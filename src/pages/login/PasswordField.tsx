import { useId, useState, type RefObject } from 'react'
import { cx } from '../../lib/cx'
import { EyeIcon, EyeOffIcon } from '../../components/ui/icons'
import { FieldError } from './FieldError'

export type PasswordFieldProps = {
  label?: string
  name?: string
  value: string
  onChange: (value: string) => void
  /**
   * Message shown under the field. Its presence switches the field to the
   * invalid state, so the parent decides when a field has been interacted
   * with — no message ever appears before the reviewer has typed.
   */
  error?: string
  onBlur?: () => void
  autoComplete?: 'current-password' | 'new-password'
  disabled?: boolean
  placeholder?: string
  /** Lets the parent move focus here when a submitted form is invalid. */
  inputRef?: RefObject<HTMLInputElement>
}

/**
 * The password control: a pill input with a show/hide toggle at the end. The
 * label is visually hidden — the placeholder carries it — but stays in the
 * accessibility tree.
 */
export function PasswordField({
  label = 'Password',
  name = 'password',
  value,
  onChange,
  error,
  onBlur,
  autoComplete = 'current-password',
  disabled = false,
  placeholder = 'Password',
  inputRef,
}: PasswordFieldProps) {
  const uid = useId()
  const inputId = `pw-${uid}`
  const errorId = `${inputId}-error`
  const [visible, setVisible] = useState(false)

  return (
    <div className={cx('field', error && 'field--invalid')}>
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>

      <div className="field__control field__control--trailing">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          className="field__input"
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />

        <button
          type="button"
          className="field__toggle"
          onClick={() => setVisible((was) => !was)}
          aria-pressed={visible}
          aria-controls={inputId}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={disabled}
        >
          {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>

      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  )
}

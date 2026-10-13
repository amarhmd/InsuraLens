import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cx } from '../../lib/cx'
import { FieldError } from './FieldError'
import { Spinner, AlertIcon, MailIcon } from '../../components/ui/icons'
import { PasswordField } from './PasswordField'
import { DemoButton } from './DemoButton'
import { PasswordRecoveryDialog } from './PasswordRecoveryDialog'
import { login } from '../../api/auth'
import { readRememberMe, writeRememberMe } from '../../lib/rememberMe'

/* Deliberately loose: the point is to catch a typo, not to judge an address.
   Anything with a local part, an @ and a dot in the domain passes. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SubmitState = 'idle' | 'submitting' | 'wrong'

export type LoginCardProps = {
  /** Enter the demo workspace. Credentials are never read. */
  onDemo: () => void
}

/**
 * The sign-in card. Behaviour is unchanged from the original form — mock auth,
 * demo entry, validation timing — with presentation tightened: leading icons,
 * a disabled-until-ready submit, a remember-me control, and one labelled
 * divider instead of stray rules.
 */
export function LoginCard({ onDemo }: LoginCardProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  /* Unchecked until the reviewer chooses otherwise; the choice is read once
     and written only when they actively toggle the control. */
  const [remember, setRemember] = useState(() => readRememberMe())
  const [emailBlurred, setEmailBlurred] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const trimmed = email.trim()
  const emailMissing = trimmed === ''
  const emailMalformed = !emailMissing && !EMAIL_PATTERN.test(trimmed)
  const busy = submitState === 'submitting' || demoLoading

  /* The submit button stays disabled until there is something valid to submit.
     An empty or malformed field is still explained in words the moment the
     reviewer leaves it, so the reason the button is inert is never a mystery. */
  const canSubmit = !emailMissing && !emailMalformed && password !== '' && !busy

  const emailError = emailMissing
    ? emailBlurred || submitted
      ? 'Please enter your work email.'
      : undefined
    : emailMalformed && (emailBlurred || submitted)
      ? 'Enter a valid work email.'
      : undefined

  const passwordError =
    submitState === 'wrong'
      ? 'Incorrect email or password'
      : submitted && password === ''
        ? 'Please enter your password.'
        : undefined

  /* Returning focus to the password field after a rejected sign-in has to wait
     for the field to leave its submitting (disabled) state, so it lives in an
     effect rather than next to setSubmitState in the catch. */
  useEffect(() => {
    if (submitState === 'wrong') passwordRef.current?.focus()
  }, [submitState])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setSubmitted(true)

    if (!EMAIL_PATTERN.test(trimmed)) {
      setSubmitState('idle')
      emailRef.current?.focus()
      return
    }
    if (password === '') {
      setSubmitState('idle')
      passwordRef.current?.focus()
      return
    }

    /* Hand the credentials to the auth API (mock-backed today, ~150 ms):
       any work email with the demo password succeeds; anything else comes
       back rejected and shows the wrong-credentials state. */
    setSubmitState('submitting')
    login(trimmed, password)
      .then(() => {
        setSubmitState('idle')
        onDemo()
      })
      .catch(() => {
        setSubmitState('wrong')
      })
  }

  return (
    <>
      <header className="auth__head">
        <h1 className="auth__title">Welcome back</h1>
        <p className="auth__subtitle">Sign in to your InsuraLens workspace</p>
      </header>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {submitState === 'wrong' && (
          <div className="alert" role="alert" aria-live="assertive">
            <AlertIcon size={15} className="alert__icon" />
            <div className="alert__text">
              <p className="alert__title">Incorrect email or password</p>
            </div>
          </div>
        )}

        <div className={cx('field', emailError && 'field--invalid')}>
          <label className="field__label" htmlFor="login-email">
            Work email
          </label>
          <div className="field__control field__control--leading">
            <MailIcon size={18} className="field__icon" />
            <input
              ref={emailRef}
              id="login-email"
              name="email"
              type="email"
              className="field__input"
              value={email}
              placeholder="you@company.com"
              autoComplete="email"
              autoCapitalize="off"
              spellCheck={false}
              disabled={busy}
              onChange={(event) => {
                setEmail(event.target.value)
                if (submitState === 'wrong') setSubmitState('idle')
              }}
              onBlur={() => setEmailBlurred(true)}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'login-email-error' : undefined}
            />
          </div>
          {emailError && <FieldError id="login-email-error">{emailError}</FieldError>}
        </div>

        <PasswordField
          value={password}
          onChange={(value) => {
            setPassword(value)
            if (submitState === 'wrong') setSubmitState('idle')
          }}
          error={passwordError}
          disabled={busy}
          inputRef={passwordRef}
          forgotPassword={{
            onClick: () => setRecoveryOpen(true),
            disabled: busy,
          }}
        />

        <div className="form__options">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => {
                const next = event.target.checked
                setRemember(next)
                writeRememberMe(next)
              }}
              disabled={busy}
            />
            <span>Remember me</span>
          </label>
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={!canSubmit}
          aria-busy={busy || undefined}
        >
          {busy ? (
            <>
              <Spinner size={16} />
              <span>Signing in…</span>
            </>
          ) : (
            'Sign in'
          )}
        </button>

        <div className="divider" aria-hidden="true">
          <span className="divider__label">or</span>
        </div>

        <DemoButton
          onClick={() => {
            if (busy) return
            setDemoLoading(true)
            setTimeout(() => {
              setDemoLoading(false)
              onDemo()
            }, 100)
          }}
          disabled={busy}
          loading={demoLoading}
        />

        <p className="trust">
          AI connects and explains evidence. Final claim decisions remain with a human reviewer.
        </p>
      </form>

      <PasswordRecoveryDialog open={recoveryOpen} onClose={() => setRecoveryOpen(false)} />
    </>
  )
}

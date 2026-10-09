import { useRef, useState, type FormEvent } from 'react'
import { cx } from '../../lib/cx'
import { FieldError } from './FieldError'
import { Spinner, AlertIcon } from '../../components/ui/icons'
import { PasswordInput } from './PasswordInput'
import { DemoButton } from './DemoButton'
import { PasswordRecoveryDialog } from './PasswordRecoveryDialog'
import { login } from '../../api/auth'

/* Deliberately loose: the point is to catch a typo, not to judge an address.
   Anything with a local part, an @ and a dot in the domain passes. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SubmitState = 'idle' | 'submitting' | 'wrong'

export type LoginFormProps = {
  /** Enter the demo workspace. Credentials are never read. */
  onDemo: () => void
}

export function LoginForm({ onDemo }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  /* No message appears before the reviewer has had a chance to type: an empty
     field is only wrong once they have asked to submit. A malformed address is
     wrong as soon as they leave it. */
  const emailError = emailMissing
    ? submitted
      ? 'Please enter your work email.'
      : undefined
    : emailMalformed && (emailBlurred || submitted)
      ? 'Enter a valid work email.'
      : undefined

  const passwordError = submitted
    ? password === ''
      ? 'Please enter your password.'
      : submitState === 'wrong'
        ? 'Incorrect email or password'
        : undefined
    : undefined

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
        passwordRef.current?.focus()
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
          <div className="field__control">
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

        <PasswordInput
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

        <div className="form__aux">
        </div>

        <button
          type="submit"
          className="btn btn--primary"
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

        <div className="form__rule" aria-hidden="true" />

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

        <div className="form__rule" aria-hidden="true" />

        <p className="trust">
          Your workspace is protected and designed for responsible claims review.
        </p>
      </form>

      <PasswordRecoveryDialog open={recoveryOpen} onClose={() => setRecoveryOpen(false)} />
    </>
  )
}

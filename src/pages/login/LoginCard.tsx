import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cx } from '../../lib/cx'
import { FieldError } from './FieldError'
import { Spinner, AlertIcon } from '../../components/ui/icons'
import { PasswordField } from './PasswordField'
import { PasswordRecoveryDialog } from './PasswordRecoveryDialog'
import { continueAsGuest, login } from '../../api/auth'
import { readRememberMe, writeRememberMe } from '../../lib/rememberMe'

/* Deliberately loose: the point is to catch a typo, not to judge an address.
   Anything with a local part, an @ and a dot in the domain passes. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SubmitState = 'idle' | 'submitting' | 'wrong'

/** Guest sessions only ever sit idle, run, or fail — there is no "wrong". */
type GuestState = 'idle' | 'requesting' | 'error'

/** How long the request may run before we tell the reviewer the server is waking. */
const GUEST_WAKE_AFTER_MS = 5_000

export type LoginCardProps = {
  /** Called after the backend accepts the credentials. */
  onSuccess: () => void
  /** Called after a credential-less guest session starts. */
  onGuest: () => void
}

/**
 * The sign-in card. Credentials go to POST /api/auth/login; a rejected sign-in
 * shows the wrong-credentials state, and the submit button stays disabled until
 * there is something valid to submit. Below the form, "Continue as guest
 * reviewer" opens a real session through POST /api/auth/demo for judges who have
 * no account.
 */
export function LoginCard({ onSuccess, onGuest }: LoginCardProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  /* Unchecked until the reviewer chooses otherwise; the choice is read once
     and written only when they actively toggle the control. */
  const [remember, setRemember] = useState(() => readRememberMe())
  const [emailBlurred, setEmailBlurred] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [guestState, setGuestState] = useState<GuestState>('idle')
  const [guestSlow, setGuestSlow] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const guestTimer = useRef<number | undefined>(undefined)

  const trimmed = email.trim()
  const emailMissing = trimmed === ''
  const emailMalformed = !emailMissing && !EMAIL_PATTERN.test(trimmed)
  const busy = submitState === 'submitting'

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

  /* The guest wake-up timer must not fire after the card unmounts. */
  useEffect(() => {
    return () => {
      if (guestTimer.current !== undefined) {
        window.clearTimeout(guestTimer.current)
      }
    }
  }, [])

  /* Returning focus to the password field after a rejected sign-in has to wait
     for the field to leave its submitting (disabled) state, so it lives in an
     effect rather than next to setSubmitState in the catch. */
  useEffect(() => {
    if (submitState === 'wrong') passwordRef.current?.focus()
  }, [submitState])

  async function startGuest() {
    if (guestState === 'requesting') return
    setGuestState('requesting')
    setGuestSlow(false)
    setGuestError(null)

    if (guestTimer.current !== undefined) {
      window.clearTimeout(guestTimer.current)
    }
    guestTimer.current = window.setTimeout(() => setGuestSlow(true), GUEST_WAKE_AFTER_MS)

    try {
      await continueAsGuest()
      onGuest()
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : 'Could not start a guest session. Please try again.'
      setGuestState('error')
      setGuestError(message)
    } finally {
      if (guestTimer.current !== undefined) {
        window.clearTimeout(guestTimer.current)
        guestTimer.current = undefined
      }
      setGuestSlow(false)
    }
  }

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

    /* POST /api/auth/login. A success hands control back to the app; a
       rejection shows the wrong-credentials state. */
    setSubmitState('submitting')
    login(trimmed, password)
      .then(() => {
        setSubmitState('idle')
        onSuccess()
      })
      .catch(() => {
        setSubmitState('wrong')
      })
  }

  return (
    <>
      <div className="auth__top">
        <span className="auth__brand">
          <img
            className="auth__mark"
            src="/brand/insuralens-icon.png"
            alt=""
            width={28}
            height={28}
          />
          <span className="auth__wordmark">InsuraLens</span>
        </span>
      </div>

      <div className="auth__body">
        <h1 className="auth__title">Sign In</h1>

        <form className="form auth__form" onSubmit={handleSubmit} noValidate>
          {submitState === 'wrong' && (
            <div className="alert" role="alert" aria-live="assertive">
              <AlertIcon size={15} className="alert__icon" />
              <div className="alert__text">
                <p className="alert__title">Incorrect email or password</p>
              </div>
            </div>
          )}

          <div className={cx('field', emailError && 'field--invalid')}>
            <label className="sr-only" htmlFor="login-email">
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
                placeholder="Work email"
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
          />

          <div className="auth__options">
            <button
              type="button"
              className="linkbtn"
              onClick={() => setRecoveryOpen(true)}
              disabled={busy}
            >
              Forgot password?
            </button>
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
              'Sign In'
            )}
          </button>
        </form>

        <div className="guest">
          <button
            type="button"
            className="btn btn--secondary guest__btn"
            onClick={startGuest}
            disabled={guestState === 'requesting' || busy}
            aria-busy={guestState === 'requesting' || undefined}
          >
            {guestState === 'requesting' ? (
              <>
                <Spinner size={16} />
                <span>Opening a guest session…</span>
              </>
            ) : (
              'Continue as guest reviewer'
            )}
          </button>

          <p
            className={cx('guest__note', guestState === 'requesting' && guestSlow && 'guest__note--waking')}
            aria-live="polite"
          >
            {guestState === 'requesting' && guestSlow
              ? 'Waking up the server, this can take a minute.'
              : 'No account needed. Opens a real session on the live backend.'}
          </p>

          {guestState === 'error' && guestError && (
            <div className="alert guest__alert" role="alert" aria-live="assertive">
              <AlertIcon size={15} className="alert__icon" />
              <div className="alert__text">
                <p className="alert__title">{guestError}</p>
                <button
                  type="button"
                  className="linkbtn guest__retry"
                  onClick={startGuest}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PasswordRecoveryDialog open={recoveryOpen} onClose={() => setRecoveryOpen(false)} />
    </>
  )
}

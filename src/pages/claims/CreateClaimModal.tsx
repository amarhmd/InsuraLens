import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { IncidentType, Priority } from '../../lib/constants'
import { CloseIcon, Spinner } from '../../components/ui/icons'
import { PolicyViewer } from '../../components/feedback/PolicyViewer'
import {
  ClaimDetailsFields,
  type ClaimField,
  type ClaimFieldErrors,
  type ClaimRequiredField,
} from './ClaimDetailsFields'
import { PhotoEvidence } from './PhotoEvidence'
import { DocEvidence } from './DocEvidence'
import {
  DOC_SLOTS,
  DOC_TYPES,
  DOC_EXTENSIONS,
  MAX_DOC_MB,
  MAX_PHOTOS,
  MAX_PHOTO_MB,
  PHOTO_TYPES,
  PHOTO_EXTENSIONS,
  formatBytes,
  matchesType,
  type DocSlotKey,
  type StagedDoc,
  type StagedPhoto,
} from './claimAttachments'

export interface ClaimDraft {
  customer: string
  date: string
  incident: IncidentType | ''
  description: string
  policyRef: string
  priority: Priority
  /** Thumbnails handed to the claim on create — object URLs stay alive. */
  photos: Array<{ name: string; url: string; caption: string }>
  /** Display names of the document slots that were filled. */
  documents: string[]
  /** The staged bytes, uploaded with the claim via POST /api/claims. */
  files: File[]
}

type Errors = ClaimFieldErrors
type RequiredField = ClaimRequiredField
type TextField = ClaimField

type Props = {
  onClose: () => void
  /** Hands the finished draft to the page; may be async (the API call). */
  onCreate: (draft: ClaimDraft) => void | Promise<void>
}

/**
 * Create-claim form. Field values and staged photos/documents live in this
 * component's local state; the finished draft (including the staged File
 * objects) is handed back to the page on submit, which posts it to the
 * backend via createClaim(). Staged files are not transferred early — the
 * upload is part of that create request, so the modal shows an indeterminate
 * "Creating…" indicator rather than inventing a percentage. Object URLs are
 * revoked whenever a file leaves the form, except the thumbnails a created
 * claim takes ownership of.
 *
 * The dialog keeps its header and footer fixed while only the body scrolls,
 * traps Tab inside itself, closes on Escape, and returns focus to the
 * "New Claim" button it was opened from.
 */
export function CreateClaimModal({ onClose, onCreate }: Props) {
  const [values, setValues] = useState<Omit<ClaimDraft, 'files'>>({
    customer: '',
    date: '',
    incident: '',
    description: '',
    policyRef: '',
    priority: 'medium',
    photos: [],
    documents: [],
  })
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const [photos, setPhotos] = useState<StagedPhoto[]>([])
  const [photoError, setPhotoError] = useState('')
  const [docFiles, setDocFiles] = useState<Record<DocSlotKey, StagedDoc | null>>({
    accident: null,
    statement: null,
  })
  const [docErrors, setDocErrors] = useState<Record<DocSlotKey, string>>({
    accident: '',
    statement: '',
  })
  /* One polite live region announces every rejection and every finished
     transfer, so keyboard and screen-reader users hear what the progress
     bars show. */
  const [liveMessage, setLiveMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)

  const dialog = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const alive = useRef(true)
  const committed = useRef(false)
  /** Membership mirror of `photos` — the source for capacity checks. */
  const photosRef = useRef<StagedPhoto[]>([])
  const photoSeq = useRef(0)

  /* Focus: remember what opened the dialog (the New Claim button), focus the
     first field, and hand focus back when the dialog goes away. */
  useEffect(() => {
    alive.current = true
    returnFocusTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    firstFieldRef.current?.focus()
    return () => {
      alive.current = false
      /* A created claim takes ownership of its thumbnails; anything still
         staged here is ours to release. */
      if (!committed.current) {
        photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url))
      }
      const target =
        returnFocusTo.current && returnFocusTo.current.isConnected
          ? returnFocusTo.current
          : document.getElementById('claims-new-claim')
      target?.focus()
    }
  }, [])

  /* Capture="environment" only makes sense where it drives the camera. */
  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobile(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  /* Escape closes; Tab is trapped inside the dialog. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        /* The policy viewer sits on top of this dialog; Escape closes it first. */
        if (showPolicy) {
          setShowPolicy(false)
          return
        }
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const root = dialog.current
      if (!root) return
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]'),
      ).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex >= 0 && el.getClientRects().length > 0,
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const inside = active instanceof HTMLElement && root.contains(active)
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, showPolicy])

  const set = (key: TextField, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validateField = (key: RequiredField): Errors => {
    const next: Errors = {}
    if (key === 'customer') {
      if (!values.customer.trim()) next.customer = 'Customer name is required.'
      else if (values.customer.trim().length < 2) next.customer = 'Enter at least 2 characters.'
    }
    if (key === 'date') {
      if (!values.date) next.date = 'Incident date is required.'
      else if (Number.isNaN(Date.parse(`${values.date}T00:00:00Z`))) next.date = 'Enter a valid date.'
    }
    if (key === 'incident' && !values.incident) next.incident = 'Select an incident type.'
    return next
  }

  const handleBlurField = (key: RequiredField) =>
    setErrors((prev) => ({ ...prev, ...validateField(key) }))

  const validate = (): Errors => ({
    ...validateField('customer'),
    ...validateField('date'),
    ...validateField('incident'),
  })

  /* The Create button stays disabled until these three are valid. */
  const requiredValid =
    values.customer.trim().length >= 2 &&
    !!values.date &&
    !Number.isNaN(Date.parse(`${values.date}T00:00:00Z`)) &&
    !!values.incident

  /* ---------------------------------------------------------------- photos */

  const addPhotoFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList)
    const problems: string[] = []
    const accepted: StagedPhoto[] = []
    const room = MAX_PHOTOS - photosRef.current.length

    for (const file of incoming) {
      if (!matchesType(file, PHOTO_TYPES, PHOTO_EXTENSIONS)) {
        problems.push(`"${file.name}" isn't a supported photo — use JPG, PNG, or WebP.`)
        continue
      }
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        problems.push(`"${file.name}" is ${formatBytes(file.size)} — the limit is 10 MB per photo.`)
        continue
      }
      if (accepted.length >= room) {
        problems.push(`"${file.name}" was skipped — this claim is limited to ${MAX_PHOTOS} photos.`)
        continue
      }
      accepted.push({
        id: `photo-${photoSeq.current++}`,
        file,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        caption: '',
      })
    }

    /* Rejected files never clear the valid ones already staged. */
    setPhotoError(problems[0] ?? '')
    const parts: string[] = []
    if (problems.length > 0) parts.push(problems.join(' '))
    if (accepted.length > 0) {
      parts.push(
        `${accepted.length} photo${accepted.length === 1 ? '' : 's'} added — they upload when you create the claim.`,
      )
      const next = [...photosRef.current, ...accepted]
      photosRef.current = next
      setPhotos(next)
    }
    if (parts.length > 0) setLiveMessage(parts.join(' '))
  }

  const removePhoto = (id: string) => {
    const target = photosRef.current.find((p) => p.id === id)
    if (target) URL.revokeObjectURL(target.url)
    const next = photosRef.current.filter((p) => p.id !== id)
    photosRef.current = next
    setPhotos(next)
    if (target) setLiveMessage(`${target.name} removed.`)
  }

  const setPhotoCaption = (id: string, caption: string) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)))

  /* ------------------------------------------------------------- documents */

  const addDocFile = (slot: DocSlotKey, file: File) => {
    const label = DOC_SLOTS.find((s) => s.key === slot)?.label ?? 'Document'

    if (!matchesType(file, DOC_TYPES, DOC_EXTENSIONS)) {
      const message = `"${file.name}" isn't a PDF file.`
      setDocErrors((prev) => ({ ...prev, [slot]: message }))
      setLiveMessage(`${label}: ${message}`)
      return /* any file already in the slot stays put */
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      const message = `"${file.name}" is ${formatBytes(file.size)} — the limit is ${MAX_DOC_MB} MB per document.`
      setDocErrors((prev) => ({ ...prev, [slot]: message }))
      setLiveMessage(`${label}: ${message}`)
      return
    }

    setDocErrors((prev) => ({ ...prev, [slot]: '' }))
    setDocFiles((prev) => ({
      ...prev,
      [slot]: { file, name: file.name, size: file.size },
    }))
    setLiveMessage(`${label}: ${file.name} ready — uploads when you create the claim.`)
  }

  const removeDoc = (slot: DocSlotKey) => {
    setDocFiles((prev) => ({ ...prev, [slot]: null }))
    setDocErrors((prev) => ({ ...prev, [slot]: '' }))
  }

  /* ---------------------------------------------------------------- submit */

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.getElementById(`claim-${Object.keys(found)[0]}`)?.focus()
      return
    }
    if (submitting) return
    setSubmitting(true)

    if (!alive.current) return /* dialog closed while uploading */

    /* The page persists the claim and any staged files via POST /api/claims,
       and closes this dialog when the request settles. */
    committed.current = true
    onCreate({
      customer: values.customer.trim(),
      date: values.date,
      incident: values.incident,
      description: values.description.trim(),
      policyRef: values.policyRef.trim(),
      priority: values.priority,
      photos: photos.map(({ name, url, caption }) => ({ name, url, caption })),
      documents: DOC_SLOTS.flatMap((slot) => {
        const staged = docFiles[slot.key]
        return staged ? [staged.name] : []
      }),
      /* The actual bytes ride along with the create request so the backend has
         the evidence the moment the claim exists. */
      files: [
        ...photos.map((photo) => photo.file),
        ...DOC_SLOTS.flatMap((slot) => {
          const staged = docFiles[slot.key]
          return staged ? [staged.file] : []
        }),
      ],
    })
  }

  /* ----------------------------------------------------------------- render */

  return (
    <div
      className="claims-modal__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialog}
        className="claims-modal"
        role="dialog"
        aria-modal="true"
        aria-busy={submitting}
        aria-labelledby="create-claim-title"
        aria-describedby="create-claim-subtitle"
      >
        <div className="claims-modal__head">
          <div>
            <h2 className="claims-modal__title" id="create-claim-title">
              Create new claim
            </h2>
            <p className="claims-modal__subtitle" id="create-claim-subtitle">
              Enter the initial details to start a claim review.
            </p>
          </div>
          <button
            type="button"
            className="claims-modal__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <form className="claims-modal__form" onSubmit={submit} noValidate>
          <div className="claims-modal__body">
            <ClaimDetailsFields
              values={values}
              errors={errors}
              firstFieldRef={firstFieldRef}
              onChange={set}
              onBlurField={handleBlurField}
              onViewPolicy={() => setShowPolicy(true)}
            />

            {/* ------------------------------------------------ Evidence */}
            <section className="claims-evidence" aria-labelledby="claim-evidence-title">
              <h3 className="claims-evidence__title" id="claim-evidence-title">
                Evidence (optional)
              </h3>
              <p className="claims-evidence__intro">
                Photos and documents you add here are attached to the claim when you create it.
              </p>

              {/* Rejections and completed transfers, announced politely. */}
              <p className="sr-only" aria-live="polite" aria-atomic="true">
                {liveMessage}
              </p>

              <PhotoEvidence
                photos={photos}
                photoError={photoError}
                dragging={dragging}
                isMobile={isMobile}
                onDraggingChange={setDragging}
                onAddFiles={addPhotoFiles}
                onCaptionChange={setPhotoCaption}
                onRemove={removePhoto}
              />

              <DocEvidence
                docFiles={docFiles}
                docErrors={docErrors}
                onAdd={addDocFile}
                onRemove={removeDoc}
              />
            </section>
          </div>

          <div className="claims-modal__foot">
            {submitting && (
              <div
                className="claims-upload__progress claims-upload__progress--indeterminate"
                role="progressbar"
                aria-label="Creating claim and uploading evidence"
              >
                <span className="claims-upload__bar" />
              </div>
            )}
            <p className="claims-modal__note">
              Attachments are stored with the claim and appear in its evidence section.
            </p>
            <div className="claims-modal__actions">
              <button type="button" className="claims-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="claims-btn claims-btn--primary"
                disabled={!requiredValid || submitting}
              >
                {submitting && <Spinner size={14} />}
                {submitting ? 'Creating…' : 'Create Claim'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showPolicy && (
        <PolicyViewer policyRef={values.policyRef} onClose={() => setShowPolicy(false)} />
      )}
    </div>
  )
}
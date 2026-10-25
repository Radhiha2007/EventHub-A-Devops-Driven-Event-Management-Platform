import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import { formatDateTimeUtc } from '@/lib/format'
import { Button } from './ui/Button'
import { Field } from './ui/Form'
import { Notice } from './ui/States'

function CameraScanner({
  onScan,
  onClose,
}: {
  onScan: (value: string) => void
  onClose: () => void
}) {
  const [err, setErr] = useState<string | null>(null)
  const onScanRef = useRef(onScan)
  const done = useRef(false)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    let active = true
    let started = false
    let scanned = false
    let starting: Promise<void> | null = null

    const qr = new Html5Qrcode('qr-reader')

    const stopAndClear = async () => {
      try {
        if (qr.isScanning) {
          await qr.stop()
        }
      } catch {
        // The scanner may already be stopped.
      }

      try {
        qr.clear()
      } catch {
        // The scanner may already be cleared.
      }
    }

    starting = (async () => {
      try {
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (text) => {
            if (!active || scanned || done.current) return

            scanned = true
            done.current = true

            await stopAndClear()

            if (active) {
              onScanRef.current(text)
            }
          },
          () => {}
        )

        started = true

        if (!active) {
          await stopAndClear()
        }
      } catch (e) {
        if (active) {
          setErr(
            e instanceof Error ? e.message : 'Could not open the camera.'
          )
        }
      }
    })()

    return () => {
      active = false

      void (async () => {
        if (starting) {
          await starting
        }

        if (started || qr.isScanning) {
          await stopAndClear()
        } else {
          try {
            qr.clear()
          } catch {
            // The scanner may already be cleared.
          }
        }
      })()
    }
  }, [])

  return (
    <div className="space-y-2">
      {err && <Notice tone="error">{err}</Notice>}

      <div
        id="qr-reader"
        className="w-full max-w-sm overflow-hidden rounded-xl bg-charcoal"
        aria-label="QR code camera scanner"
      />

      <Button type="button" variant="outline" size="sm" onClick={onClose}>
        Close camera
      </Button>
    </div>
  )
}

/** Checks an attendee in by QR credential via POST /api/attendance/check-in. */
export function CheckInPanel({
  onCheckedIn,
}: {
  onCheckedIn?: () => void
}) {
  const qc = useQueryClient()
  const [credential, setCredential] = useState('')
  const [camera, setCamera] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (value: string) => api.checkIn(value),
    onSuccess: () => {
      setCredential('')
      void qc.invalidateQueries({ queryKey: ['registrations'] })
      void qc.invalidateQueries({ queryKey: ['my-registrations'] })
      onCheckedIn?.()
    },
  })

  const run = (value: string) => {
    const v = value.trim()

    if (v.length < 32 || v.length > 128) {
      setLocalErr(
        'A credential is 32–128 characters. Scan the attendee’s QR code or paste the full code.'
      )
      return
    }

    setLocalErr(null)
    mutation.mutate(v)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(credential)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field
          label="QR credential"
          error={localErr ?? undefined}
          hint="Scan the QR code or paste the full credential."
        >
          <input
            className="input font-mono"
            autoComplete="off"
            spellCheck={false}
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="green"
            loading={mutation.isPending}
            disabled={!credential.trim()}
          >
            Check in
          </Button>

          {!camera && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCamera(true)}
            >
              Scan with camera
            </Button>
          )}
        </div>
      </form>

      {camera && (
        <CameraScanner
          onClose={() => setCamera(false)}
          onScan={(value) => {
            setCamera(false)
            setCredential(value)
            run(value)
          }}
        />
      )}

      {mutation.isError && (
        <Notice tone="error">{errorMessage(mutation.error)}</Notice>
      )}

      {mutation.isSuccess && (
        <Notice
          tone="success"
          title={`${mutation.data.attendee_name} is checked in ✓`}
        >
          Recorded at {formatDateTimeUtc(mutation.data.checked_in_at)}.
        </Notice>
      )}
    </div>
  )
}

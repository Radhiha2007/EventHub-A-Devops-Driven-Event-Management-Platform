import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { ApiError, errorMessage } from '@/api/client'
import type { Club } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Card, Field } from '@/components/ui/Form'
import { Notice } from '@/components/ui/States'
import { useMyClub } from './ClubContext'

function ClubForm({ club, onSaved }: { club: Club | null; onSaved: (c: Club) => void }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState(club?.name ?? '')
  const [description, setDescription] = useState(club?.description ?? '')
  const [advisor, setAdvisor] = useState(club?.advisor_name ?? '')
  const [localErr, setLocalErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () => {
      // The backend only accepts the signed-in account's own email as the club contact email.
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        advisor_name: advisor.trim() || null,
        contact_email: profile!.email,
      }
      return club ? api.updateClub(club.id, body) : api.createClub(body)
    },
    onSuccess: (c) => {
      setSaved(true)
      void qc.invalidateQueries({ queryKey: ['clubs'] })
      void qc.invalidateQueries({ queryKey: ['club', c.id] })
      onSaved(c)
    },
  })
  const fe = save.error instanceof ApiError ? save.error.fieldErrors : {}

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSaved(false)
    if (!name.trim()) return setLocalErr('Club name is required.')
    if (!profile?.email) return setLocalErr('Your account has no email, which the backend needs to link a club to you.')
    setLocalErr(null)
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Club name" required error={localErr && !name.trim() ? localErr : fe.name}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
      </Field>
      <Field label="Description" error={fe.description}>
        <textarea className="input min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Faculty advisor" error={fe.advisor_name}>
        <input className="input" value={advisor} onChange={(e) => setAdvisor(e.target.value)} />
      </Field>
      <Field label="Contact email" hint="Fixed to your signed-in account. The backend only lets you manage a club whose contact email matches your account.">
        <input className="input bg-cream-100" value={profile?.email ?? ''} readOnly />
      </Field>
      {localErr && name.trim() && <Notice tone="error">{localErr}</Notice>}
      {save.isError && <Notice tone="error">{errorMessage(save.error)}</Notice>}
      {saved && <Notice tone="success">{club ? 'Club profile updated.' : 'Club created.'}</Notice>}
      <Button type="submit" variant="green" loading={save.isPending}>{club ? 'Save changes' : 'Create club'}</Button>
    </form>
  )
}

export function ClubProfilePage() {
  const { club, clubs, setClubId } = useMyClub()
  const [creating, setCreating] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-extrabold tracking-tight">{club && !creating ? 'Club profile' : 'Create your club'}</h2>
      {flash && <Notice tone="success">{flash}</Notice>}
      {clubs.length > 1 && !creating && (
        <div className="max-w-sm">
          <label htmlFor="club-switch2" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Club</label>
          <select id="club-switch2" className="input" value={club?.id} onChange={(e) => setClubId(e.target.value)}>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <Card>
        {creating || !club ? (
          <ClubForm key="new" club={null} onSaved={(c) => { setClubId(c.id); setCreating(false); setFlash(`Club “${c.name}” created.`) }} />
        ) : (
          <ClubForm key={club.id} club={club} onSaved={() => setFlash(null)} />
        )}
      </Card>
      {club && !creating && (
        <Button variant="ghost" size="sm" onClick={() => setCreating(true)}>+ Create another club</Button>
      )}
      {creating && club && <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>}
    </div>
  )
}

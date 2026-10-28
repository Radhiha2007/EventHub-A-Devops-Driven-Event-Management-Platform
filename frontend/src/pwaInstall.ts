export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

window.addEventListener('beforeinstallprompt', (event: Event) => {
  event.preventDefault()
  deferredPrompt = event as BeforeInstallPromptEvent
  window.dispatchEvent(new Event('pwa-install-available'))
})

export function getInstallPrompt() {
  return deferredPrompt
}

export function clearInstallPrompt() {
  deferredPrompt = null
}

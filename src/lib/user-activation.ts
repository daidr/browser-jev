export interface UserActivationSource {
  hasBeenActive: () => boolean
  subscribe: (callback: () => void) => () => void
}

export const browserUserActivation: UserActivationSource = {
  hasBeenActive: () => navigator.userActivation?.hasBeenActive ?? false,
  subscribe(callback) {
    // Mouse activation occurs on pointerdown; touch/pen activation occurs on pointerup.
    const events = ['pointerdown', 'pointerup', 'keydown'] as const
    const listener = (event: Event) => {
      if (event.isTrusted && navigator.userActivation?.hasBeenActive) callback()
    }
    for (const event of events) window.addEventListener(event, listener, true)
    return () => {
      for (const event of events) window.removeEventListener(event, listener, true)
    }
  },
}

export function getFriendlyNetworkMessage(err: unknown): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet connection. Please reconnect and try again.';
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'Request timed out due to slow internet. Please try again.';
  }
  return 'Network issue. Please reconnect and try again.';
}

export function getFriendlyServerMessage(fallback = 'Something went wrong. Please try again.'): string {
  return fallback;
}

export function getFriendlyOrderError(backendError: string): string {
  if (backendError.includes('do not exist')) {
    return 'Some items in your cart are no longer available. Please review your cart and try again.';
  }
  return 'Unable to place order right now. Please check your internet and try again.';
}

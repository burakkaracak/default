// Basit olay yolu: modüller birbirini doğrudan çağırmadan haberleşir.
const handlers = {};
export const bus = {
  on(ev, fn) { (handlers[ev] ||= []).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { const a = handlers[ev]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
  emit(ev, ...args) { const a = handlers[ev]; if (a) for (const fn of [...a]) fn(...args); },
};

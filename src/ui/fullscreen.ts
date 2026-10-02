// Pantalla completa: en un navegador en ventana el ratón sale por los bordes superior e inferior
// (pestañas, barra de tareas) y el desplazamiento por bordes se corta. A pantalla completa no.

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export function enterFullscreen() {
  if (isFullscreen() || !document.documentElement.requestFullscreen) return;
  document.documentElement
    .requestFullscreen({ navigationUI: 'hide' })
    .then(() => {
      // Chrome/Edge: Esc abre el menú del juego en vez de salir (mantener Esc pulsado sale).
      const kb = (navigator as any).keyboard;
      if (kb?.lock) kb.lock(['Escape']).catch(() => {});
    })
    .catch(() => {
      /* sin gesto de usuario o no permitido */
    });
}

export function exitFullscreen() {
  if (!isFullscreen()) return;
  (navigator as any).keyboard?.unlock?.();
  document.exitFullscreen().catch(() => {});
}

export function toggleFullscreen() {
  if (isFullscreen()) exitFullscreen();
  else enterFullscreen();
}

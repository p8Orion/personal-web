# Papercuts

Trampas no obvias y soluciones reutilizables de este repo. Más recientes primero. Sin secretos.

## 2026-09-04 — cambiar `gl.alpha` del `<Canvas>` no toma efecto con HMR

- **Síntoma:** después de pasar el `<Canvas>` a `alpha: true` y bajar el Z-panel debajo de `.experience` en mobile, no se veía **nada** del Z-panel: matrix, fractal y nebulosa tapados por negro. El CSS nuevo sí se aplicaba.
- **Contexto:** `src/scene/Experience.tsx` (react-three-fiber), Vite dev server, DevTools en modo celular.
- **Causa:** los flags de `gl={{...}}` van al `getContext('webgl2')` y el contexto WebGL se crea **una sola vez**. Un HMR update re-renderiza el componente pero reusa el contexto, así que el canvas sigue con `alpha: false` y opaco. El CSS de stacking sí se aplica al instante, o sea que quedás con el canvas opaco *arriba* del Z-panel: el peor de los dos mundos, y parece que el reorden de capas está mal.
- **Solución:** recargar la página entera (F5) después de tocar cualquier flag de `gl`. Verificar con `document.querySelector('.experience canvas').getContext('webgl2').getContextAttributes().alpha`.
- **No reintentar:** buscar el culpable en `z-index`, en `scene.background` o en `setClearColor`. Con el contexto correcto los tres estaban bien.

## 2026-09-04 — en mobile la card tapa casi todo el Z-panel

- **Síntoma:** con el Z-panel detrás de la grid en mobile, los efectos (matrix/nebulosa) siguen sin verse aunque el canvas ya sea transparente y las capas estén bien ordenadas.
- **Contexto:** `@media (max-width: 768px)` en `src/styles.css`. Ahí `.stage` es `top: 0; bottom: 50%` y `.document__card` está centrada verticalmente.
- **Causa:** en un viewport de 390×844 la card mide ~355×642 y arranca en `y = -82`, así que cubre el rango 0–422 completo del stage y deja solo ~18 px de margen a cada lado. El `.panel` es `rgba(14,11,13,0.8)` + `backdrop-filter: blur(10px)`, o sea que lo que queda detrás pasa a ~20% y borroneado.
- **Solución:** para verificar si el stage realmente dibuja, ocultar la card (`document.querySelector('.document').style.visibility = 'hidden'`) antes de concluir que el Z-panel no renderiza. Para que se vea en uso real hay que tocar la opacidad del panel o la geometría del stage, no el `z-index`.

## 2026-08-28 — clamp independiente de canvas.width/height estira el overlay

- **Síntoma:** Mandelbrot, matrix y nebulosa se veían estirados y en baja resolución en desktop, aunque el Z-panel ya era fullscreen.
- **Contexto:** `fitCanvas` copiado en `MandelbrotField.tsx`, `MatrixRain.tsx` y `OrionNebula.tsx`. El panel CSS es `inset: 0; width/height: 100%`.
- **Causa:** `w = min(720, cssW * dpr)` y `h = min(720, cssH * dpr)` por separado. En un viewport 16:9 eso deja un backing **cuadrado** (720×720) que el CSS estira al box widescreen. El cap de 720 nació cuando el panel era chico; al pasar a fullscreen el desajuste de aspecto se volvió el síntoma, no “falta de DPR” ni un `object-fit`.
- **Solución:** un solo scale uniforme (`min(dpr, maxEdge / max(cssW, cssH))`) en `fitOverlayCanvas.ts`. El backing conserva el aspecto del box; `maxEdge` es el lado largo, no un techo por eje.
- **No reintentar:** `object-fit: contain` en el canvas. Enmascara el buffer cuadrado con letterbox; no corrige la resolución ni el UV del shader.

## 2026-08-27 — un overlay con ventana de Z corta casi no recorre paleta

- **Síntoma:** "los colores del fractal no van cambiando con el z", aunque el piso, las estructuras y la UI sí se ven girar de color al scrollear.
- **Contexto:** `src/ui/MandelbrotField.tsx` y `src/ui/MatrixRain.tsx`, que llaman `paletteHues(z)` igual que el resto de la escena.
- **Causa:** el hue global **es** `z`, así que un elemento vive solo la rebanada de hue que cubre su ventana. El fractal (`FRACTAL_Z_START/END` 0.01–0.6, `FRACTAL_Z_FADE` 0.2) está a opacidad plena solo entre 0.21 y 0.4: ~68° de giro, todo azul-violeta, y los hues distintos caen en las colas donde ya está en fade. El cableado está bien; la aritmética de la ventana es la que aplana el efecto. Se pierde tiempo buscando un uniform que no se actualiza, color management de three, o `filter` en CSS.
- **Solución:** darle al overlay su propio recorrido: `paletteHues(start + local * SPAN)`, con `local` el progreso dentro de la ventana **lineal** (no el eased, que estaciona el hue en los extremos) y `start` el inicio de la ventana, para no cortar la continuidad con el resto de la escena. Ya está hecho en los dos: `FRACTAL_HUE_SPAN` y `MATRIX_HUE_SPAN` en `debug.ts`. Poner el span en `end - start` reproduce el comportamiento viejo. Si agregás otro overlay con ventana propia, replicá esto.
- **No reintentar:** verificar `hueToRgb` por color management. `Color.setHSL()` en three 0.185 usa `colorSpace = workingColorSpace` por defecto, o sea `colorSpaceToWorking()` es no-op y devuelve HSL→RGB crudo, correcto para WebGL a pelo y canvas 2D.

## 2026-08-27 — un uniform de iteraciones mayor al tope del loop rellena el interior del fractal

- **Síntoma:** en el tramo de zoom profundo el interior del Mandelbrot, que debería ser transparente, salía como una mancha plana de un solo color.
- **Contexto:** `FRAG` en `src/ui/MandelbrotField.tsx`; el test de pertenencia es `if (i >= uMaxIter) { gl_FragColor = vec4(0.0); return; }`.
- **Causa:** GLSL ES 1.0 necesita un tope constante en el `for`, así que el loop corta en `MAX = 192` mientras `uMaxIter` llegaba a `72 + 1.3 * 110 = 215`. Los puntos interiores salen con `i = 192`, que **no** cumple `i >= 215`, y se pintan como exterior con un `mu` casi constante.
- **Solución:** una sola constante para los dos lados: `MAX_ITER` en TS, interpolada en el shader (`const float MAX = ${MAX_ITER}.0;`) y clampeando el uniform con `Math.min(MAX_ITER, ...)`.
- **No reintentar:** subir `MAX` sin más. Cada iteración se paga en todos los píxeles; el bug es la desincronización entre uniform y tope, no que falten iteraciones.

## 2026-08-27 — `prefers-reduced-motion` deja las cards clavadas y parece bug de CSS

- **Síntoma:** las scroll-panel cards aparecían ya fijas en el centro y desaparecían de golpe al final de su ventana de Z. Nunca entraban desde abajo ni salían hacia arriba.
- **Contexto:** `src/ui/SectionCopy.tsx` + `cardShift()` en `src/content/zMap.ts`, Windows 11 con "Efectos de animación" apagado.
- **Causa:** el gate era `SCROLL_STICK > 0 && !reduce`, y con `reduce` en `true` `cardShift()` devolvía `0`, que en ese modelo significa *parked en el centro* (no *sin efecto*). El síntoma se lee como capa de compositor o `position` mal puesto, así que se pierde tiempo en CSS.
- **Solución:** `cardTravel()` devuelve un factor −1..1 y el caller lo multiplica por `(50vh + 50%)`. Ya no hay booleano `stick` que colapse a `0`, y el viaje no depende de `prefers-reduced-motion`. `SCROLL_STICK = 0` en `debug.ts` es el único apagador.
- **No reintentar:** no es el `backdrop-filter` del `.panel` promoviendo una capa fija, ni `translateY(-50%)` mezclado con vh, ni el `id` del hash sobre la card fija. Se probaron los tres y ninguno era la causa. `transform` sobre `.document__card` funciona bien; el problema era el valor que le llegaba.

## 2026-08-27 — la búsqueda por glob no lista los assets binarios

- **Síntoma:** buscar `src/content/images/*` y `**/*.jpg` devolvía 0 resultados, dando a entender que la carpeta de imágenes estaba vacía o que los `src` de las cards apuntaban a archivos inexistentes.
- **Contexto:** `src/content/images/` con los `.jpg` de las cards.
- **Causa:** la herramienta de glob indexa texto, no binarios. No es `.gitignore` (no excluye imágenes) ni un problema del repo.
- **Solución:** listar el directorio (`Get-ChildItem -Recurse -File`) para confirmar assets binarios antes de concluir que faltan o de renombrar nada.

## 2026-08-27 — un shine con `background-clip: text` no se ve si el elemento es un bloque full-width

- **Síntoma:** el barrido de luz sobre `.eyebrow` no se veía. La versión previa, con una banda en `::after`, sí se veía pero barría mucho más ancho que el texto.
- **Contexto:** `.eyebrow` es un `<p>` dentro de `.panel`, `src/styles.css`.
- **Causa:** `background-size` y `background-position` se calculan contra el área de posicionamiento (`background-origin`, por defecto `padding-box`), que en un bloque es **todo el ancho del contenedor**, no el ancho del texto. `background-clip: text` recorta la *pintura* a los glifos pero no cambia ese área. Con un eyebrow corto en un panel ancho, casi todo el recorrido cae sobre vacío y el destello dura una fracción del tiempo de la animación.
- **Solución:** `width: fit-content` en el elemento del texto (más `max-width: 100%`). Ahí el área de posicionamiento coincide con los glifos y el recorrido completo es visible.
- **No reintentar:** subir la duración o el ancho de la banda. El problema es el encuadre, no el timing; alargarlo solo estira el tramo invisible.

## 2026-08-27 — un viaje fijo en vh siempre deja la card asomando

- **Síntoma:** al inicio de su ventana de Z la card se veía asomando por el borde inferior en vez de estar fuera de pantalla. Peor con la card que tiene foto (más alta) y con la ventana del browser chica.
- **Contexto:** `CardSlot` en `src/ui/SectionCopy.tsx`, cards centradas verticalmente en un stage `position: fixed`.
- **Causa:** para tapar una card centrada de alto `h` hacen falta `50vh + h/2`, no una constante. Con `120vh` alcanzaba en viewport grande y fallaba en uno chico, así que parecía intermitente y no un error de cuentas.
- **Solución:** `translate3d(0, calc(${factor} * (50vh + 50%)), 0)`. El `%` en `translate` se resuelve contra la altura del propio elemento, así que la mitad de la distancia la aporta la card y cualquier altura sale de pantalla. El factor que viene de JS queda sin unidad.
- **No reintentar:** subir la constante de vh. Tapa el caso que estás mirando y reaparece en otro tamaño de viewport.

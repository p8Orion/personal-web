# Papercuts

Trampas no obvias y soluciones reutilizables de este repo. Más recientes primero. Sin secretos.

## 2026-09-09 — en PowerShell `git log HEAD..origin/main` sale vacío aunque el remoto adelantó

- **Síntoma:** `git fetch` muestra `5b6745d..6dfd219 main -> origin/main`, pero `git log --oneline HEAD..origin/main` no imprime nada (exit 0). `git status` después del fetch sí dice *behind by 1 commit*.
- **Contexto:** PowerShell 5.x en Windows. Cualquier comando git con `A..B` (log, diff, rev-list).
- **Causa:** `..` es el operador de rango de PowerShell. Sin comillas reescribe el argumento y git recibe otra cosa (o nada útil), no el rango de commits. No es que origin/main y HEAD coincidan.
- **Solución:** citar el rango: `git log --oneline "HEAD..origin/main"`. Lo mismo para `git diff`. Alternativa: `git log --oneline HEAD origin/main` no es equivalente; para "qué va a entrar" usá `git log --oneline origin/main -N` o `git show --stat origin/main`.
- **No reintentar:** volver a fetch, ni asumir que el working tree dirty tapó el log. El fetch ya había actualizado `origin/main`.

## 2026-09-04 — flash celeste a pantalla completa al cerrar el lightbox en mobile

- **Síntoma:** en mobile (real y con el Device Toolbar de DevTools), al salir de una imagen ampliada tocando la pantalla, toda la pantalla destella celeste un frame. Saliendo por scroll no pasa nunca.
- **Contexto:** `.pic-modal` en `src/styles.css`, que es el `div` de dismiss del lightbox: `position: fixed; inset: 0` con un `onClick` en `PicModal`.
- **Causa:** el tap highlight por defecto de Blink. Alcanza con que un elemento tenga handler de click para que Chrome le pinte encima su overlay celeste al tocarlo, y el overlay cubre **toda la caja del elemento tocado**, que acá es el viewport entero. Las tres pistas que parecen apuntar a otra cosa en realidad confirman esta: solo en mobile porque el highlight es de touch; solo al tocar y no al scrollear porque hace falta un tap; y "solo en DevTools" porque el Device Toolbar emula touch. Nada de esto tiene que ver con la animación.
- **Solución:** `-webkit-tap-highlight-color: transparent` en la superficie de dismiss. Puesto en `.pic-modal` y en `.overlay__backdrop`, que es el otro botón a pantalla completa. Si algún día molesta en toda la app, el global es `html { -webkit-tap-highlight-color: transparent; }`, pero ojo que eso le saca el feedback de tap a los botones reales.
- **No reintentar:** buscarlo en las Web Animations del zoom, en `will-change`, en el `-webkit-mask-image` de `.pic-modal__img` o en promoción de capas del compositor. Ya se fue por ese camino una vez y el flash siguió. Un destello de un color que no está en la paleta del proyecto es señal de que lo pinta el browser, no el CSS propio.

## 2026-09-04 — `npx tsc --noEmit` en este repo no chequea NADA y sale 0

- **Síntoma:** `npx tsc --noEmit` sale con código 0 y da a entender que el proyecto tipa bien. En realidad `npm run build` estaba roto hacía rato, con tres errores (`01-about.en.ts` sin `text`, y dos en `SectionCopy.tsx`).
- **Contexto:** raíz del repo, cualquier verificación de tipos antes de commitear o después de tocar `src/content`.
- **Causa:** el `tsconfig.json` de la raíz es un *solution file*: `{"files": [], "references": [...]}`. Sin `-b`, `tsc` lee ese archivo, ve cero archivos de entrada y termina contento. Los `compilerOptions` y el `include: ["src"]` viven en `tsconfig.app.json`, que solo se alcanza siguiendo las referencias. El exit 0 es el peor resultado posible porque parece confirmación.
- **Solución:** `npx tsc -b` (agregar `--force` si el `.tsbuildinfo` está caliente y querés rechequear todo). Es lo que corre `npm run build`. Filtrar el ruido de PowerShell con `2>&1 | Select-String -NotMatch 'npm warn|CategoryInfo|^\s*\+'`, porque el warning de npm en stderr hace que PowerShell reporte `NativeCommandError` aunque el exit code sea 0.
- **No reintentar:** `npx tsc --noEmit -p tsconfig.app.json` tampoco es equivalente: ignora `tsconfig.node.json` y por lo tanto `vite.config.ts`.

## 2026-09-04 — mezclar propiedades eased y lineales en la misma ventana de Z parece que algo se rompe

- **Síntoma:** el fractal hace zoom y a determinada altura "se termina" el zoom y queda girando en el lugar. Tercera vez que aparece la misma familia de bug en el archivo (antes con el hue y con el spin).
- **Contexto:** `paint()` en `src/ui/MandelbrotField.tsx`. Varias propiedades se manejan del mismo `t` normalizado de la ventana.
- **Causa:** el zoom pasaba por `t*t*(3-2t)` y el spin era lineal en `t`. Smoothstep tiene pendiente **cero** en los dos extremos, así que sobre el final del recorrido el zoom frena hasta detenerse mientras el spin sigue a tasa constante. No hay ningún clamp ni límite involucrado: es solo que dos propiedades animadas sobre la misma ventana usan curvas distintas, y la que se estaciona hace que la otra parezca el bug. Se pierde tiempo buscando un `Math.min` o un tope de escala.
- **Solución:** lineal en `t` para todo lo que anima sobre la ventana. Para el zoom no se pierde nada: la escala es exponencial, así que pendiente constante en log ya **es** velocidad aparente constante, y el ease-in sobra porque el fade de opacidad ya tapa la entrada. Si agregás otra propiedad animada acá, hacela lineal salvo que tengas una razón, y si le ponés easing ponéselo a todas.
- **No reintentar:** compensar subiendo `FRACTAL_ZOOM_SPEED`. Arriba de 1 el `min(1, ...)` clava el zoom en el piso todavía antes y agrava exactamente el mismo síntoma.

## 2026-09-04 — las coordenadas "famosas" del Mandelbrot no sirven como targets de zoom

- **Síntoma:** con `TARGETS` cargado de landmarks conocidos (seahorse valley, scepter, triple spiral, elephant valley…), en muchas ejecuciones el fractal no mostraba nada.
- **Contexto:** `TARGETS` en `src/ui/MandelbrotField.tsx`, recorrido de `SCALE_START = 0.14` a ~8e-5 con un presupuesto de 256 iteraciones.
- **Causa:** dos cosas que no se ven a simple vista. Una, una coordenada publicada es interesante **a la profundidad para la que se publicó**; acá el mismo punto tiene que aguantar todo el rango, y a 3.6e-2 el medio alto de pantalla ya es 0.018, así que errarle por poco al borde deja el frame entero adentro o entero afuera. Dos, "no se ve nada" tiene dos formas opuestas y se confunden: todo interior es negro literal (alpha 0), y todo exterior con `mu` casi constante es un lavado plano de un color. Medido: scepter valley daba `inside = 1.00` de profundidad media en adelante y triple spiral `inside = 0.00`. Ninguna de las dos se detecta mirando el código.
- **Solución:** `scripts/fractal-targets.mjs` replica el escape del shader en Node, puntúa cada candidato por su **peor** frame del recorrido (estructura en pantalla × qué tan lejos está el split interior/exterior de los dos extremos muertos) y busca puntos nuevos por bisección entre un punto de adentro y uno de afuera, más hill-climbing. Los targets encontrados puntúan 0.22–0.32 contra 0.00–0.095 de los famosos. Si cambiás el rango de escalas o `FRACTAL_MAX_ITER`, corré el script de nuevo: los targets son válidos para *ese* recorrido, no en abstracto.
- **No reintentar:** buscar más coordenadas publicadas, ni juzgarlas por un screenshot. Un target puede abrir perfecto y morir a mitad del zoom, que es justo lo que el promedio esconde y el peor frame expone.

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

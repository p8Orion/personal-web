# ThreeJs

Portfolio personal-profesional: Vite + React + TypeScript + React Three Fiber.

```
npm run dev
```

Contenido editable en `src/content/` (`00-intro.*` … `04-contact.*`, `identity.ts`). Fotos en `src/content/images/`. Cada card tiene `pics[]` con `{ src, fit }`: `horizontal` (100% ancho, antes del texto) o `vertical` (columna a la derecha). `src` con `new URL('./images/archivo.jpg', import.meta.url).href`. Mapeos Z en `src/content/zMap.ts`. Knobs de escena y Z-Panel en `src/content/debug.ts`.

## Z

**Z** es el progreso de scroll del documento: `0` arriba, `1` al final. El HUD lo muestra como `Z`. La cámara, el hue de la paleta, el giro de la grilla y el Z-Panel leen el mismo valor.

Dos mapeos independientes en `src/content/zMap.ts`:

| Mapa | Qué es |
| --- | --- |
| **`CARD_Z`** | Ventana de Z en la que cada scroll-panel card está en escena (entra desde abajo, se clava, sale hacia arriba). |
| **`NAV_Z`** | A qué Z salta cada vínculo del nav (y el hash `#intro` … `#contact`). |

El highlight del nav sigue `NAV_Z`. El readout `SEC` sigue la card que está en escena (`CARD_Z`).

## Paleta

Tres hues en `src/scene/materials.ts` (`paletteHues`):

| Nombre | Qué es |
| --- | --- |
| **PRIMARIO** | Hue = Z (una vuelta completa de color a lo largo de toda la página). Solo la **grilla**. |
| **SC_1** | Split-complementario: `PRIMARIO + 150°`. Color del **HUD** y de los **scroll panels** (grisáceo). |
| **SC_2** | Split-complementario: `PRIMARIO + 210°`. |

Títulos y acentos del copy usan SC_1 a saturación plena; fondo, texto y bordes del panel son el mismo hue, desaturado (el grisáceo). SC_1/SC_2 también van al Mandelbrot (gradiente por iteración). Los dots de debug (`DEBUG_PALETTE`) muestran SC_1 y SC_2 en vivo.

## Capas

| Capa | Qué es | Cómo se mueve |
| --- | --- | --- |
| **World / grid** | Escena 3D: piso, cámara, figuras atadas a la grilla | Gira y panea con Z |
| **HUD** | Chrome fijo: `portfolio.os`, nav (intro, sobre, proyectos…), reloj, Z | No scrollea |
| **Scroll panels** | Copy HTML (intro, sobre, proyectos, stack, contacto) | Fijas en pantalla; aparecen según `CARD_Z` |
| **Z-Panel** | Superficie HTML fija, transparente | No scrollea: **muta con Z** |

Stacking: canvas `0` → Z-Panel `7` → scroll panels `8` → HUD `12`. El copy queda encima del fractal.

### World / grid

`src/scene/`. El piso (`Ground`) es un shader en world-space (el mesh no gira). El yaw gira el muestreo de la grilla; las figuras viven en `GridWorld` con el **mismo signo de yaw** y el mismo pivote (hit del suelo en el centro-abajo de la pantalla) para quedar clavadas a las celdas.

El shader XZ usa `[[c,-s],[s,c]]` y Three.js Y usa `[[c,s],[-s,c]]`: no hay que negar el yaw “para invertir el UV”.

Figuras: 12 grupitos (2–3 piezas, mitad de tamaño, snapped a la grilla). Cuerpo SC apagado + overlay de código. Oscurecen hacia el horizonte con la misma función que las líneas mayores del piso (`src/scene/horizonFade.ts`).

### HUD

Entidad: chrome HTML **fijo**. `src/ui/HUD.tsx` (`.hud`). Brand (`portfolio.os`), nav de secciones, reloj, readout de Z. Color: **SC_1**.

### Scroll panels

`src/ui/SectionCopy.tsx`. Desktop: izquierda, centro vertical. Mobile: centro vertical. La pista de scroll (`--page-length`) sale de `SCROLL_SPEED`. Cada card entra/sale según **`CARD_Z`** en `zMap.ts`. `SCROLL_STICK` activa el vuelo; `SCROLL_STICK_DURATION` parte la ventana (1 = tercios: entra / clava / sale). El nav usa **`NAV_Z`**, no el id del DOM.

### Z-Panel

`src/ui/StagePanel.tsx` (`.stage`). No es una ventana: slot transparente para cosas que reaccionan a Z (`--stage-z` en el aside).

- **Desktop:** centro de la mitad derecha (`left: 75%`).
- **Mobile:** 60% superior de la pantalla.
- Cubo de debug: `DEBUG_STAGE_CUBE`.

#### Mandelbrot

`src/ui/MandelbrotField.tsx`. Se **calcula** cada frame en un fragment shader (`z → z² + c`), no es una imagen.

- Visible entre `FRACTAL_Z_START` y `FRACTAL_Z_END`.
- Fade-in / fade-out en Z (`FRACTAL_Z_FADE`). Fade espacial (`FRACTAL_EDGE_FADE`) a los cuatro bordes en desktop; en mobile solo el borde inferior.
- Opacidad máxima: `FRACTAL_ALPHA`.
- Color: gradiente SC_1 ↔ SC_2 según iteración suave.
- El eje de zoom es un filamento de la **costa** (medida 0), valle de los caballitos de mar — no el origen ni la antena en −2.
- **`FRACTAL_SEED`** = profundidad de arranque sobre ese eje (`0` = costa amplia, `1` = zoom de referencia). No es un ángulo.
- **`FRACTAL_ZOOM_SPEED`** = qué tan rápido recorre el tramo de Z (`1` = todo el tramo, `0.5` = a mitad de camino al final).

Un rayo desde el infinito hacia 0 **no** garantiza un borde interesante: en el semi-eje negativo aterriza en la punta de la antena y el cuadro se vuelve un bloque liso.

#### Matrix rain

`src/ui/MatrixRain.tsx`. Columnas de glifos haciendo scroll **hacia arriba**, color SC_1. Visible entre `MATRIX_Z_START` y `MATRIX_Z_END`, con fade en Z (`MATRIX_Z_FADE`), fade espacial (`MATRIX_EDGE_FADE`, en mobile solo abajo), opacidad `MATRIX_ALPHA` y velocidad `MATRIX_SPEED`.

## Analytics (Umami)

Umami Cloud (Hobby, gratis). Snippet en `index.html`. Eventos custom en `src/analytics.ts`. Dashboard: [cloud.umami.is](https://cloud.umami.is).

Cada visita manda el pageview automático del script. Encima:

| Evento | Cuándo | Propiedades |
| --- | --- | --- |
| **`image`** | Clic en una foto de un scroll panel | `file` (nombre del archivo), `section` (`intro`, `projects`, …) |
| **`contact`** | Clic en una fila de contacto | `target` (`linkedin`, `github`, `twitter`, `email`) |
| **`scroll-0.2`** … **`scroll-1.0`** | Al cruzar cada 0.2 de Z, una vez por visita | — |

Si la página abre a mitad de scroll (hash), se mandan todos los umbrales ya superados. Código: `track()` / `useBindUmami()` en `src/analytics.ts`; disparos en `SectionCopy.tsx` (fotos) y `ContactList.tsx` (contacto).

## Debug (`src/content/debug.ts`)

| Knob | Rol |
| --- | --- |
| `DEBUG_PALETTE` | Dots SC_1 / SC_2 |
| `DEBUG_STAGE_CUBE` | Cubo 3D CSS en el Z-Panel |
| `SCROLL_SPEED` | Largo de la página en pantallas (5 / speed) |
| `SCROLL_STICK` | Vuelo de las cards (0 = corte seco) |
| `SCROLL_STICK_DURATION` | Split entra/clava/sale dentro de `CARD_Z` |
| `GRID_GLOW` | Grosor/halo de las líneas del piso |
| `FRACTAL_ALPHA` | Techo de opacidad del Mandelbrot |
| `FRACTAL_ZOOM_SPEED` | Velocidad del zoom en el tramo de Z |
| `FRACTAL_Z_FADE` | Cuánto Z tarda en aparecer/desaparecer |
| `FRACTAL_EDGE_FADE` | Alcance del fade espacial (UV, 0 = corte seco) |
| `FRACTAL_Z_START` / `FRACTAL_Z_END` | Ventana de visibilidad |
| `FRACTAL_SEED` | Profundidad inicial sobre la costa |
| `MATRIX_ALPHA` | Techo de opacidad del rain |
| `MATRIX_SPEED` | Velocidad del scroll hacia arriba |
| `MATRIX_Z_FADE` | Fade-in/out en Z del rain |
| `MATRIX_EDGE_FADE` | Fade espacial del rain |
| `MATRIX_Z_START` / `MATRIX_Z_END` | Ventana de visibilidad del rain |

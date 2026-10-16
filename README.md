# ConvertToPDF

Herramientas PDF en español: unir archivos, extraer páginas por rangos y organizar páginas (orden, giro y eliminación). Interfaz adaptable a teléfonos. Proyecto independiente; no modifica ConvertToMap.

## Desarrollo

Requiere Node.js 22 o posterior.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

`dist/` contiene el sitio estático; las dependencias y el worker se incluyen en la compilación. No requiere CDN, API, cuenta de usuario ni base de datos.

## GitHub Pages

El workflow publica `dist/` al hacer push a `main`. En Settings → Pages, seleccionar GitHub Actions como origen antes de ejecutarlo. `base: './'` permite servirlo bajo el nombre del repositorio sin dominio propio. No hay integración con ConvertToMap todavía.

## Privacidad y alcance

Los documentos se procesan en memoria, sin subidas, almacenamiento persistente ni analítica. Límite inicial de 50 MB y 300 páginas por sesión, sujeto a la memoria disponible del equipo. Se rechazan PDF cifrados y se muestran errores de lectura. Las miniaturas se generan con PDF.js; el archivo final se construye copiando páginas con pdf-lib, conservando texto y gráficos sin convertirlos a imágenes.

Dividir extrae páginas a un único PDF (no crea un ZIP por rangos). No incluye PDF a Word/Excel ni OCR. No promete conservar estructuras a nivel de documento, formularios interactivos, marcadores, adjuntos o firmas digitales; validar documentos con estos elementos. Las ediciones invalidan las firmas digitales existentes.

## Dependencias

- pdf-lib (MIT): manipulación de páginas.
- PDF.js/pdfjs-dist (Apache-2.0): miniaturas.
- Vite (MIT): compilación.

Conservar avisos y licencias de dependencias al redistribuir. El nombre es provisional.

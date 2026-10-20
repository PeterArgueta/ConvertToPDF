# ConvertToPDF

Aplicación web para **unir, extraer y reorganizar páginas de archivos PDF directamente en el navegador**. El procesamiento se realiza en el dispositivo del usuario, sin transferir el documento a un servidor.

## Funcionalidades

- Unir múltiples documentos PDF.
- Extraer páginas seleccionadas por rangos en un único PDF.
- Reordenar, girar y eliminar páginas.
- Previsualizar páginas mediante miniaturas.
- Descargar el documento resultante.

## Diseño técnico

Aplicación estática construida con **Vite**. Utiliza **PDF.js (`pdfjs-dist`)** para la lectura y representación de miniaturas y **pdf-lib** para la manipulación de documentos. Al no requerir un backend, puede desplegarse en un alojamiento de archivos estáticos.

El procesamiento permanece en memoria. Las operaciones se realizan sobre las páginas y no convierten todo el documento a imágenes.

## Desarrollo local

Requiere Node.js 22 o posterior.

```bash
npm ci
npm run dev
```

**Validación y compilación**

```bash
npm test
npm run build
npm run preview
```

Las pruebas se encuentran en `tests/`. La compilación genera `dist/`.

## Despliegue

El workflow de `.github/workflows/` publica `dist/` mediante GitHub Pages tras cambios en `main`. Para habilitarlo, selecciona **GitHub Actions** como origen de Pages. La configuración `base: './'` permite publicar el sitio bajo la ruta del repositorio.

Este proyecto es independiente y no modifica ConvertToMap.

## Privacidad, límites y compatibilidad

- Los archivos se procesan en memoria, sin carga a API, almacenamiento persistente ni analítica de documentos.
- Límite inicial: 50 MB y 300 páginas por sesión, sujeto a la memoria disponible.
- Se rechazan PDFs cifrados y se presentan errores de lectura.
- La extracción de rangos genera un PDF, no un ZIP separado por cada rango.
- No incluye OCR ni conversión a Word o Excel.
- No se garantiza preservar marcadores, adjuntos, formularios interactivos ni firmas digitales. Modificar un PDF firmado puede invalidar su firma.

Estas condiciones describen el diseño previsto del proyecto; comprueba el funcionamiento en tu navegador y con tus documentos antes de tratar resultados como definitivos.

## Dependencias principales

- [pdf-lib](https://pdf-lib.js.org/): manipulación de archivos PDF (MIT).
- [PDF.js](https://mozilla.github.io/pdf.js/): visualización de PDF (Apache-2.0).
- [Vite](https://vite.dev/): servidor de desarrollo y compilación (MIT).

Respeta los avisos de licencia de las dependencias al distribuir compilaciones.

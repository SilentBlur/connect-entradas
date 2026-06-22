# Connect · Entradas

Plataforma propia de Connect para crear eventos, emitir entradas con **QR personal e intransferible**, repartir links por cabeza y controlar el ingreso con un lector QR. Reemplaza a JoinUs con una herramienta a la medida.

---

## 🚀 Cómo abrirla

### Opción rápida (local)
Doble clic en **`index.html`**. Funciona todo menos la **cámara del escáner** (los navegadores solo permiten cámara en `https` o `localhost`).

### Opción recomendada (con cámara + links que se pueden compartir)
1. Entra a **https://app.netlify.com/drop**
2. Arrastra la carpeta **`connect-entradas`** completa.
3. Netlify te da una URL (ej. `https://connect-entradas.netlify.app`). Ábrela desde el celular y ya tienes cámara + links reales.
4. En **Configuración → URL base**, pega esa URL para que los links de los cabezas salgan correctos.

> Los datos se guardan en el navegador (localStorage). Usa **Configuración → Exportar respaldo** para tener una copia.

---

## 🧭 Secciones

| Sección | Para qué sirve |
|---|---|
| **Resumen** | KPIs generales: eventos, entradas, ingresos, recaudación. |
| **Eventos** | Crear/editar eventos con flyer, fecha, lugar y tipos de entrada (Box, Estándar, Cortesía, Free/SREEE). |
| **Entradas** | Generar entradas, ver listado, buscar, filtrar y exportar a Excel. Ver el QR de cada una. |
| **Cabezas** | Tus vendedores. Cada uno tiene su **link propio** y prefijo; las ventas se le atribuyen solas. |
| **Solicitudes** | Pedidos que llegan desde los links. Apruebas → se emite el QR. Rechazas → no pasa nada. |
| **Escáner QR** | Lector con cámara (verde = válida, rojo = no válida, ámbar = ya ingresó). También validación manual por código. |
| **Asistentes** | Quiénes tienen entrada y quiénes ya ingresaron. Check-in manual y exportación. |
| **Reportes** | Recaudado, por cobrar, ranking de cabezas, composición de entradas y detalle por tipo. |
| **Configuración** | Organización, moneda, datos de pago, URL base, respaldo/restauración. |

---

## 🎟️ Las dos formas de entregar entradas

1. **Códigos para reclamar** (como JoinUs, pero mejor): generas N códigos para un cabeza → él los reparte → cada persona entra al link, pone su código y sus datos, y recibe su QR.
2. **Link del cabeza** (lo nuevo): le pasas al cabeza **un solo link**. Sus compradores eligen entrada, ponen sus datos y **solicitan/compran**. Tú (o el cabeza) apruebas en *Solicitudes* y se emite el QR. Así nadie "inventa" entradas en un Excel.

Para cortesías directas: **Generar entradas → Entrada directa con datos** y el QR queda listo para enviar.

---

## 🔑 Notas
- Cada QR es único e intransferible: al escanearlo se marca como usado y no se puede volver a entrar.
- La identidad (logo, rombo, colores) sale de la carpeta **`assets/`**. Para cambiarla, reemplaza esos archivos.
- Primer evento cargado de ejemplo: **Gala 4**. Puedes editarlo o crear el real.

Hecho para Connect 🖤

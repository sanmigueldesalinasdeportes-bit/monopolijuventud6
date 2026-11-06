# San Miguel Joven: El futuro está en tus manos

Web para que jóvenes de 12 a 18 años repartan 100 monedas simbólicas entre 8 categorías de actividades.

## Estructura

```
public/                 Web estática (lo que ve el público)
  index.html            Juego: portada → código → reparto → revisión → confirmación
  admin.html            Panel de administración (sin datos hasta introducir la contraseña)
  css/app.css           Estilos (móvil primero, respeta "reducir movimiento")
  js/categorias.js      Las 8 categorías: nombre, descripción, color e icono
  js/app.js             Lógica del juego
  js/admin.js           Lógica del panel
netlify/functions/
  publico.mjs           /api/config, /api/codigo, /api/votar
  admin.mjs             /api/admin/* (resultados, CSV, códigos, borrado) — exige contraseña
netlify/lib/comun.mjs   Validación, almacenamiento y autenticación compartidos
netlify.toml            Configuración de Netlify
```

## Publicar en Netlify

1. Sube esta carpeta a un repositorio de GitHub y crea un sitio en Netlify desde él
   (o usa `netlify deploy --prod` con Netlify CLI). Netlify instala `@netlify/blobs` solo.
   **No sirve arrastrar la carpeta a Netlify Drop**: Drop solo publica archivos estáticos y no ejecuta las funciones.
2. En *Site configuration → Environment variables* crea:

| Variable | Obligatoria | Valor |
|---|---|---|
| `ADMIN_PASSWORD` | Sí | Contraseña del panel, mínimo 10 caracteres (mejor 16 o más). Sin ella el panel responde "no configurado". |
| `PARTICIPACION_ABIERTA` | No | Pon `si` para votar **sin** códigos. Si no existe, los códigos son obligatorios. |

3. Vuelve a desplegar (*Deploys → Trigger deploy*) para que se apliquen las variables.

## Probar en local

```
npm install
npx netlify-cli dev        # abre http://localhost:8888
```
Crea un archivo `.env` con `ADMIN_PASSWORD=...` para probar el panel. `netlify dev` usa un almacenamiento local de pruebas, separado del real.

## Administración

- Entra en `https://TU-SITIO.netlify.app/admin` con la contraseña de `ADMIN_PASSWORD`.
- Verás: jugadas enviadas, monedas totales, ranking con gráfico, tabla con monedas y %, y cuántas jugadas dejaron cada categoría a 0.
- **Descargar resumen (CSV)**: ranking agregado. **Descargar jugadas anónimas (CSV)**: una fila por jugada (fecha y monedas por categoría). Separador `;` para abrir directamente en Excel.
- **Códigos**: genera hasta 500 por tanda y descárgalos en CSV para imprimirlos. También se puede compartir un enlace con el código ya puesto: `https://TU-SITIO.netlify.app/?codigo=ABCD-1234` (útil para QR individuales).
- **Borrar votos**: para limpiar las pruebas antes de abrir la votación. Pide escribir BORRAR.

La contraseña nunca está en el código del navegador: se comprueba en el servidor. El navegador la guarda solo en la pestaña abierta (sessionStorage) y se borra al cerrarla o pulsar *Salir*.

## Dónde se guardan los votos

En **Netlify Blobs**, el almacenamiento persistente del propio sitio (no hace falta crear cuentas externas):
- almacén `smj-votos`: una entrada por jugada con id aleatorio, el reparto y el día. Sin IP, nombre, dispositivo ni código.
- almacén `smj-codigos`: cada código con su estado (libre/usado) y fecha.

Se pueden consultar también en el panel de Netlify, en *Blobs*.

## Votos duplicados: cómo funciona y sus límites

- **Con códigos (por defecto)**: cada código vale una sola jugada; el servidor lo marca como usado con una escritura condicional para que dos envíos simultáneos no lo usen dos veces. Límites: quien tenga varios códigos puede votar varias veces, y un código perdido o compartido lo puede usar otra persona. La jugada no se guarda unida al código, así que no se puede saber qué votó cada persona.
- **Sin códigos** (`PARTICIPACION_ABIERTA=si`): solo se recuerda en el navegador que ya se votó. Es un freno ligero: basta con otro navegador, modo incógnito o borrar datos para volver a votar. Úsalo solo en actividades supervisadas o si el duplicado no es un problema.

## Seguridad: qué hay y qué no

- Hay: contraseña solo en el servidor, comparación en tiempo constante, espera de 0,7 s tras cada contraseña incorrecta, validación en servidor (8 categorías, enteros, suma exacta 100), cabeceras `noindex` en el panel.
- No hay: bloqueo de IP por intentos ni usuarios individuales de administración. Usa una contraseña larga y cámbiala si se comparte de más.

## Cambiar textos o categorías

Textos y colores: `public/js/categorias.js`. Si cambias o añades un `id`, cámbialo también en `netlify/lib/comun.mjs`.

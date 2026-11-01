# ZenBot

<p align="center">
  <img src="assets/readme/zenbot-banner.svg" alt="ZenBot, bot de WhatsApp hecho sobre Zyrix" width="100%">
</p>

<p align="center">
  Bot de WhatsApp de <strong>Axelix09</strong>, construido sobre <a href="https://github.com/Axelix09/zyrix">Zyrix</a>.
</p>

<p align="center">
  <img src="assets/readme/icons/community.svg" width="52" alt="Grupos">
  &nbsp;&nbsp;
  <img src="assets/readme/icons/gamepad.svg" width="52" alt="Juegos">
  &nbsp;&nbsp;
  <img src="assets/readme/icons/media.svg" width="52" alt="Multimedia">
  &nbsp;&nbsp;
  <img src="assets/readme/icons/database.svg" width="52" alt="Base de datos">
  &nbsp;&nbsp;
  <img src="assets/readme/icons/shield.svg" width="52" alt="Moderación">
</p>

ZenBot junta en un solo bot comandos para grupos, juegos, economía, multimedia y otras utilidades. El menú que aparece en cada chat depende de la configuración de esa instalación: escribí **`.menu`** para verlo.

## ✨ Qué trae

- Comandos para grupos y moderación.
- Juegos, economía, rankings y rachas.
- Descargas, conversiones e imágenes.
- Anime, búsquedas, IA y utilidades.
- Registro, funciones sociales y subbots.
- Herramientas de administración para el propietario.

## 📋 Requisitos

Para que ZenBot se ejecute necesitás una **terminal** (o cualquier entorno que te deje correr comandos) con soporte para lo siguiente:

- **Node.js 20 o superior** y **npm**.
- **Git**: una dependencia (`zyrix`) se descarga directamente desde GitHub.
- **FFmpeg**: lo usan las conversiones, stickers animados, audios y varias descargas.
- Una cuenta de WhatsApp para vincular el bot.
- Opcional: Chromium, solo para las tarjetas con render HTML (si no está, ZenBot usa una tarjeta SVG automáticamente).

Sirve cualquier terminal de Linux, macOS, Windows, Termux en Android o la consola de un hosting, siempre que tenga lo de arriba.

### 💾 RAM y almacenamiento

| Recurso | Mínimo | Recomendado |
| --- | --- | --- |
| RAM libre | 512 MB | 1 GB o más |
| Almacenamiento libre | 1 GB | 2 GB o más |

- Son valores aproximados: dependen de los comandos que uses. Las conversiones con FFmpeg y las descargas grandes son lo que más memoria y espacio temporal consumen.
- El almacenamiento cubre `node_modules`, la carpeta `tmp/`, la base de datos y la sesión de WhatsApp.
- Cada subbot necesita memoria extra: ZenBot no levanta uno si hay menos de **250 MB de RAM libre**.

## ☁️ Instalación recomendada: Akirax Host

La forma más cómoda de tener ZenBot encendido sin depender de tu celular o tu PC es un hosting. Te recomendamos **[Akirax Host](https://home.akirax.net)**:

1. Entrá a [home.akirax.net](https://home.akirax.net) y creá una cuenta con **Create Account**.
2. Creá tu servidor desde el panel y revisá que el plan cubra los requisitos de RAM y almacenamiento de arriba.
3. Subí o cloná ZenBot siguiendo la instalación de abajo y ejecutá `npm start`.

## 🚀 Instalación

```bash
git clone https://github.com/Axelix09/ZenBot.git
cd ZenBot
npm install
npm start
```

Para desarrollo, `npm run dev` reinicia el proceso cuando detecta cambios.

## 📱 Instalación en Termux (limitaciones)

Se puede correr ZenBot desde Android con Termux, pero tiene limitaciones:

- Instalá Termux desde **F-Droid** o **GitHub**; la versión de Play Store está desactualizada.
- Instalá las herramientas antes de `npm install`:

  ```bash
  pkg update && pkg upgrade
  pkg install git nodejs ffmpeg python make clang
  ```

- **Dependencias nativas**: `better-sqlite3` y `sharp` pueden tardar mucho en instalarse o fallar en Android, porque se compilan en el dispositivo.
- **Segundo plano**: Android puede cerrar Termux para ahorrar batería y el bot se desconecta. Desactivá la optimización de batería para Termux y usá `termux-wake-lock`.
- **Sesión abierta**: si cerrás Termux, el bot se detiene. Podés usar `tmux` para dejarlo corriendo.
- **Sin Chromium**: las tarjetas HTML no funcionan en Termux y se reemplazan por la versión SVG.
- **Recursos limitados**: con poca RAM, las conversiones con FFmpeg pueden ser lentas o fallar, y conviene usar pocos subbots (o ninguno).
- Guardá el proyecto dentro del home de Termux, no en `/sdcard`: el almacenamiento compartido da problemas de permisos con `node_modules`.
- Dependés de la conexión del celular: si cambia de red o se queda sin datos, el bot se cae.

Si necesitás que funcione 24/7, un hosting como Akirax Host es mejor opción que Termux.

## ⚙️ Configuración

Los datos de cada instalación se editan en `zen.config.js`. Los campos de propietario y cuenta del bot vienen vacíos a propósito:

```js
ownerNumbers: [],
botPhoneNumber: '',
```

Agregá tus números a `ownerNumbers` usando código de país y solo dígitos. Si dejás `botPhoneNumber` vacío, ZenBot te va a pedir el número al iniciar. No subas tu configuración personal ya completada a un repositorio público.

En el mismo archivo podés cambiar el prefijo, el nombre del bot, el límite de subbots y otros ajustes. `nsfwEnabled` controla los comandos para adultos; la edad del registro es declarada por el usuario y no se verifica de forma independiente.

## 🔑 Variables de entorno (`.env`)

Copiá `.env-example` como `.env` y completá lo que necesites:

- `APIKEY`: clave de **Hikari API**, la fuente principal de `YTmp3`, `YTmp4` y `Play`. Para conseguirla tenés que **registrarte en el sitio** de [Hikari API](https://hikariapi.skyultraweb.com). Si la dejás vacía, esos comandos usan los respaldos, que pueden ser menos estables.
- `MONGODB_URI`: solo si preferís MongoDB en lugar de SQLite.

## 📲 Vincular WhatsApp

Al iniciar por primera vez, seguí el código que muestra la terminal. En WhatsApp, abrí **Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono** e ingresá ese código. Es temporal: no lo compartas.

La sesión se guarda en `ZenSessions/`. Si el proceso se reinicia, ZenBot puede volver a conectarse usando esos datos.

## 🗃️ Base de datos

Por defecto se usa SQLite y el archivo se crea en `lib/database/sqlite/zenbot.sqlite`. Si preferís MongoDB, copiá `.env-example` como `.env` y completá `MONGODB_URI`.

Si MongoDB no conecta, el adaptador puede continuar con SQLite. Revisá qué motor está activo antes de dar por hecho dónde quedaron guardados los datos. Guardá una copia de seguridad de la base y no arranques dos instancias usando el mismo directorio de sesión.

## 🛡️ Antes de dejarlo corriendo

- No compartas `ZenSessions/`: contiene la autenticación de WhatsApp.
- Mantené tus números de propietario en tu `zen.config.js` local y no publiques ese archivo con valores personales.
- Usá las herramientas administrativas solo con cuentas de confianza.
- Si no querés habilitar contenido para adultos, desactivá `nsfwEnabled` en `zen.config.js`.
- El comando `.get` admite URLs públicas, valida redirecciones y limita las descargas multimedia a 100 MiB.

El `.gitignore` excluye `.env`, sesiones, temporales y bases SQLite para ayudar a evitar subidas accidentales.

## 🧪 Pruebas

`npm test` usa el ejecutor de pruebas de Node. Por ahora el proyecto todavía no tiene una suite automatizada, así que ese comando no comprueba el funcionamiento completo del bot.

## 📄 Licencia

ZenBot se distribuye bajo **GPL-3.0-only**. Consultá el archivo `LICENSE` incluido en el repositorio.

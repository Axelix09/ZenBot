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

## 🚀 Instalación

Necesitás Node.js 20 o superior, npm y una cuenta de WhatsApp para vincular el bot.

```bash
git clone https://github.com/Axelix09/ZenBot.git
cd ZenBot
npm install
npm start
```

Para desarrollo, `npm run dev` reinicia el proceso cuando detecta cambios.

## ⚙️ Configuración

Los datos de cada instalación se editan en `zen.config.js`. Los campos de propietario y cuenta del bot vienen vacíos a propósito:

```js
ownerNumbers: [],
botPhoneNumber: '',
```

Agregá tus números a `ownerNumbers` usando código de país y solo dígitos. Si dejás `botPhoneNumber` vacío, ZenBot te va a pedir el número al iniciar. No subas tu configuración personal ya completada a un repositorio público.

En el mismo archivo podés cambiar el prefijo, el nombre del bot, el límite de subbots y otros ajustes. `nsfwEnabled` controla los comandos para adultos; la edad del registro es declarada por el usuario y no se verifica de forma independiente.

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

<p align="center">
  <img src="assets/readme/zenbot-banner.svg" alt="ZenBot — el chat cobra vida" width="100%">
</p>

<p align="center">
  <strong>El bot que le pone vida al grupo.</strong><br>
  <sub>Juegos, comunidad, economía y multimedia. Todo en un solo lugar, con la potencia de <a href="https://github.com/Axelix09/zyrix">Zyrix</a>.</sub>
</p>

<p align="center">
  <img src="assets/readme/icons/community.svg" alt="Comunidad" width="54">
  &nbsp;&nbsp;
  <img src="assets/readme/icons/gamepad.svg" alt="Juegos" width="54">
  &nbsp;&nbsp;
  <img src="assets/readme/icons/media.svg" alt="Multimedia" width="54">
  &nbsp;&nbsp;
  <img src="assets/readme/icons/database.svg" alt="Persistencia" width="54">
  &nbsp;&nbsp;
  <img src="assets/readme/icons/shield.svg" alt="Moderación" width="54">
</p>

<p align="center">
  <img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-43853d?logo=nodedotjs&logoColor=white">
  <img alt="WhatsApp bot" src="https://img.shields.io/badge/WhatsApp-Bot-25D366?logo=whatsapp&logoColor=white">
  <img alt="Powered by Zyrix" src="https://img.shields.io/badge/Powered%20by-Zyrix-8b5cf6">
  <img alt="GPL 3.0 only" src="https://img.shields.io/badge/License-GPL--3.0--only-22223b">
</p>

---

## 🌙 ¿Qué es ZenBot?

ZenBot no viene solo a responder comandos: viene a **darle movimiento a la comunidad**. Es un bot multidispositivo para WhatsApp, hecho para que haya algo más que un «hola» en el grupo: partidas, progresión, herramientas útiles y un toque propio.

La idea es simple: que el bot sea divertido para la gente y configurable para quien lo administra. El proyecto está construido sobre [Zyrix](https://github.com/Axelix09/zyrix), la base que conecta ZenBot con WhatsApp.

> ✨ **La onda de ZenBot:** comunidad primero, funciones útiles y diversión sin perder de vista la seguridad.

## 🎮 ¿Qué podés hacer?

- 💬 **Mover el grupo:** bienvenida, utilidades de administración y herramientas de moderación.
- 🪙 **Jugar y progresar:** economía, monedas, niveles, rachas, rankings y juegos interactivos.
- 🎧 **Usar multimedia:** descargas, conversiones e imágenes.
- 🔎 **Explorar:** anime, búsquedas, IA y comandos de utilidad.
- 🫶 **Conectar a la comunidad:** registro, perfil y funciones sociales.
- 🤖 **Levantar subbots:** sesiones adicionales cuando la función esté habilitada.
- 🛠️ **Administrar el bot:** herramientas de creador reservadas al propietario.

El menú puede variar según la configuración de cada instancia. En WhatsApp, escribí **`.menu`** para ver qué está activo.

## 🚀 Arranque rápido

### 1. Lo que necesitás

- Node.js **20 o superior** y npm.
- Una cuenta de WhatsApp para vincular el bot.
- Internet desde el equipo donde va a correr.
- Opcional: una instancia de MongoDB. Si no configurás MongoDB, ZenBot usa SQLite local.

### 2. Instalá las dependencias

```bash
git clone https://github.com/Axelix09/ZenBot.git
cd ZenBot
npm install
```

### 3. Dale tu estilo

Antes del primer inicio, abrí `zen.config.js` y revisá los ajustes que querés cambiar:

- `prefix`: el prefijo de los comandos; por defecto es `.`.
- `OWNER_NUMBERS`: números propietarios separados por coma, con código de país y solo dígitos. Se cargan desde `.env`, no desde el código.
- `BOT_PHONE_NUMBER`: la cuenta de WhatsApp que se va a vincular. Si queda vacío, el proceso solicita el número en la terminal.
- `subbotLimit`: cuántos subbots puede administrar el servidor.
- `nsfwEnabled` y `devMode`: activación de funciones opcionales.
- Los datos de marca, canal y redes sociales del bot.

Copiá `.env-example` como `.env` y completá allí los valores privados. No publiques `.env`, números personales ni credenciales. Para empezar, editá estas variables:

```dotenv
OWNER_NUMBERS=tu_numero_con_codigo_de_pais[,otro_numero]
BOT_PHONE_NUMBER=
TENOR_API_KEY=
MONGODB_URI=
```

## 📲 Conectá WhatsApp

Iniciá ZenBot:

```bash
npm start
```

Cuando aparezca el código, abrí WhatsApp en la cuenta que querés conectar y andá a **Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono**. Ingresá el código que muestra la terminal.

🔐 El código dura poco: usalo vos y no lo publiques ni lo mandes a un grupo. Cuando la conexión se complete, ZenBot queda en línea mientras el proceso siga activo.

Para desarrollar con reinicio automático al cambiar archivos:

```bash
npm run dev
```

## 🗃️ Datos y persistencia

Sin `MONGODB_URI`, la base local se guarda en:

```text
lib/database/sqlite/zenbot.sqlite
```

Para usar MongoDB, abrí el `.env` local —creado a partir de `.env-example`— y completá `MONGODB_URI` con la cadena de conexión de tu instancia. No pegues esa cadena en chats ni en el repositorio.

ZenBot carga `.env` al iniciar. **No subas ese archivo a GitHub.** Si la conexión a MongoDB falla, el adaptador actual puede continuar con SQLite; confirmá qué motor está usando la instancia antes de confiar en dónde quedaron los datos.

Las sesiones de WhatsApp se almacenan en `ZenSessions/`. Guardá esa carpeta y la base de datos en almacenamiento persistente, hacé backups protegidos y no ejecutes dos instancias usando el mismo directorio de sesión.

## 🛡️ Seguridad, sin vueltas

- **EmojiMix:** el comando requiere `TENOR_API_KEY` en `.env`. La clave que venía incrustada en una copia anterior fue retirada; si era real y seguía activa, rotala en Tenor/Google. Nunca subas el valor.
- **Datos personales:** reemplazá los números y otros identificadores locales de `zen.config.js` antes de compartir el proyecto.
- **Sesiones:** `ZenSessions/` contiene datos de autenticación. Limitá su acceso y nunca la incluyas en commits o ZIP públicos.
- **Subbots:** los códigos de vinculación son secretos temporales. Iniciá la vinculación desde un chat privado y no compartas el código.
- **Funciones +18:** la edad se declara al registrarse; no se comprueba de forma independiente. No la trates como verificación de edad. Si necesitás una restricción verificada, mantené esas funciones apagadas.
- **Comandos de creador:** pueden tener acceso sensible al bot. Protegé la cuenta propietaria y ejecutá únicamente código de fuentes confiables.

Para cuidar el servidor, ejecutá el bot con un usuario dedicado, permisos mínimos y límites de recursos razonables.

## 🧰 Un par de detalles útiles

El comando **`.get`** acepta URLs públicas HTTP/HTTPS, valida redirecciones y limita las descargas multimedia a 100 MiB. Las respuestas de texto tienen un límite menor para no llenar la memoria del proceso.

El adaptador SQLite soporta las consultas encadenadas y los filtros lógicos utilizados por varios comandos, como los rankings de juegos. Las rachas diarias suman una vez por día y vuelven a empezar si se pierde un día.

## 🧪 Desarrollo y pruebas

El proyecto incluye el comando:

```bash
npm test
```

El script usa `node --test`, pero en el árbol revisado todavía no hay pruebas automatizadas. Que el comando termine no significa que el bot esté validado. Antes de desplegar cambios importantes, agregá pruebas para permisos, economía, persistencia y reglas de grupos.

## 📜 Licencia

El `package.json` declara **GPL-3.0-only**. Antes de distribuir, incluí el texto oficial de esa licencia en un archivo `LICENSE`.

---

<p align="center">
  <sub>Hecho con cariño por <strong>Axelix09</strong> · Que el chat nunca se quede quieto ✦</sub>
</p>

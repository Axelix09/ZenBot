<div align="center">

<img src="banner.svg" alt="ZΞN-BOT" width="800"/>

**Bot de WhatsApp multifuncional**
**Created by: [AxelDev09](https://github.com/AxelDev09)**

[![Version](https://img.shields.io/badge/versión-8.0.0-blueviolet?style=for-the-badge&logo=whatsapp&logoColor=white)](.)
[![Node](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](.)
[![ESM](https://img.shields.io/badge/módulos-ESM-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](.)
[![MongoDB](https://img.shields.io/badge/base%20de%20datos-MongoDB%20%7C%20JSON-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](.)
[![License](https://img.shields.io/badge/licencia-GPL--3.0-22c55e?style=for-the-badge)](LICENSE)
</div>

---

## ¿Qué es ZenBot?

**ZenBot** es un bot de WhatsApp de alto rendimiento construido sobre [Baileys](https://github.com/WhiskeySockets/Baileys), con una arquitectura modular de plugins, economía propia, sistema RPG, descargas multimedia y mucho más. Diseñado para grupos grandes, con soporte para múltiples sub-bots simultáneos.

> **Más de 245 archivos. Más de 16 categorías de plugins. Un solo bot que los gobierna a todos 🥵.**

---

## Instalación

### Requisitos previos

- **Node.js** v18 o superior (recomendado: v20+)
- **MongoDB** (local o Atlas) — *opcional*, ver [Base de datos](#base-de-datos) más abajo
- **ffmpeg** instalado en el sistema
- Cuenta de WhatsApp activa

### QUÉ DEBO HACER?

**1. Configurar variables de entorno**

Crear un archivo `.env` en la raíz del proyecto:
```env
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/zenbot
NODE_ENV=production
```

> 💡 `MONGODB_URI` es **opcional**. Si no la definís (o la conexión falla), el bot arranca igual usando **almacenamiento JSON local** como respaldo automático. Ver [Base de datos](#base-de-datos).

**2. Editar la configuración**

Abrir `config.js` y personalizar:
```js
ownerNumber: ['549XXXXXXXXXX'],   // Tu número con código de país (sin +)
botName: 'ZΞN-BOT',
MODE: 'public',                   // 'public' o 'private'
```

**3. Iniciar el bot**
```bash
npm start
```

Al iniciar por primera vez, se pedirá el número de teléfono para generar el código de vinculación. Ingresarlo en WhatsApp → **Dispositivos vinculados → Vincular con número de teléfono**.

---

## Instalación en Termux (Android)

### 1 — Actualizar el entorno e instalar dependencias (Ejemplo con Termux)

```bash
pkg update && pkg upgrade
pkg install git nodejs yarn ffmpeg -y
```

---

### 2 — Configurar acceso al almacenamiento (Específico de Termux)

> ⚠️ Paso obligatorio para poder trabajar en `/sdcard` desde Termux.

```bash
termux-setup-storage
```

Cuando aparezca el popup de permisos → tocá **Permitir**. Esto habilita el acceso a `/sdcard` y todo tu almacenamiento interno.

---

### 3 — Clonar el repositorio

```bash
git clone https://github.com/Axelix09/ZenBot.git /sdcard/ZenBot
cd /sdcard/ZenBot
```

> 💡 El proyecto queda en tu almacenamiento interno, accesible desde cualquier explorador de archivos de Android.

---

### 4 — Instalar dependencias de Node.js

```bash
npm install
# o bien
yarn install
```

---

### 5 — Iniciar el bot

```bash
npm start
```
---

## Sistema de plugins

Los plugins se cargan automáticamente desde la carpeta `plugins/`. En modo desarrollo, se recargan al guardar sin necesidad de reiniciar el bot.

**Estructura de un plugin:**
```js
const handler = async (m, { conn, args, text, usedPrefix, command, isOwner, userDb, config }) => {
  await m.reply('¡Hola!')
}

handler.help       = ['comando <argumento>']
handler.tags       = ['tools']
handler.command    = ['comando', 'alias']
handler.groupOnly  = false
handler.adminOnly  = false
handler.botAdminOnly = false
handler.ownerOnly  = false
handler.noRegister = false   // true = no requiere registro de usuario

export default handler
```

Los plugins se registran por propiedades sobre la función, no como objeto. El handler recibe el mensaje serializado `m` y un contexto con todo lo necesario.

**Hooks disponibles:**

| Hook | Cuándo se ejecuta |
|------|-------------------|
| `handler` (default) | Cuando el mensaje coincide con un comando |
| `handler.before` | Antes del comando, en *cada* mensaje del grupo/chat |
| `handler.all` | En cada mensaje recibido, sin importar prefijo ni comando |

---

## Configuración avanzada

### Anti-spam
```js
antiSpam: {
  enabled: true,
  maxCmds: 5,       // Máximo de comandos permitidos
  ventanaMs: 8000,  // Ventana de tiempo (ms)
  muteMs: 15000,    // Tiempo de silencio al superar el límite
}
```

### Prefijos válidos
```
. # / !
```

### Modos de bot
| Modo | Descripción |
|------|-------------|
| `public` | Cualquier usuario puede usar el bot |
| `private` | Solo el owner puede usar el bot |

### Sub-bots (Jadibot)
ZenBot soporta hasta **40 sub-bots** simultáneos. Cada sub-bot puede configurarse de forma independiente por grupo, incluyendo imágenes, nombres y permisos.

---

## Base de datos

ZenBot usa **MongoDB como base de datos principal**, pero **no es obligatorio configurarla**.

Al iniciar, el bot intenta conectarse usando la variable `MONGODB_URI`:

- ✅ **Si `MONGODB_URI` está definida y la conexión es exitosa** → se usa MongoDB normalmente.
- ⚠️ **Si `MONGODB_URI` no está definida, o la conexión falla** (credenciales inválidas, sin internet, cluster caído, etc.) → el bot **cae automáticamente a un modo de respaldo basado en archivos JSON locales**, sin necesidad de configurar nada más.

En modo JSON, los datos (usuarios, grupos, economía, RPG, etc.) se guardan como archivos `.json` dentro de `lib/database/data/`. Funcionalmente es equivalente a Mongo para el uso normal del bot — útil para pruebas locales, instancias pequeñas, o entornos donde no querés/podés levantar un cluster de MongoDB (como Termux).

> 🔁 El cambio de modo es **transparente**: no hace falta tocar ningún plugin ni configuración adicional. El propio bot detecta qué modo usar al arrancar y lo indica por consola:
> ```
> [DB] Sin MONGODB_URI — usando almacenamiento JSON local. (lib/database/data/)
> ```
> o, si Mongo falló:
> ```
> [DB FALLBACK] No se pudo conectar a MongoDB. Usando JSON como respaldo.
> ```

> ⚠️ **Importante:** el modo JSON es ideal para uso personal o grupos chicos/medianos. Para producción con muchos usuarios simultáneos, se recomienda usar MongoDB por motivos de rendimiento y concurrencia.

---

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `MONGODB_URI` | URI de conexión a MongoDB. Si se omite, el bot usa JSON local automáticamente | ❌ No (opcional) |
| `NODE_ENV` | `production` o `development` | ✅ Sí |

---

## Tecnologías utilizadas

- **[@whiskeysockets/baileys](https://github.com/itsliaaa/baileys)** (fork) — Conexión WebSocket con WhatsApp. Se usa un fork específico que soporta botones interactivos nativos (`nativeFlowMessage`). Los usuarios que prefieran no usarlos pueden desactivarlos con `.botones off` y recibirán selección numerada en texto plano en su lugar.
- **[MongoDB + Mongoose](https://mongoosejs.com/)** — Base de datos persistente principal *(opcional, con fallback a JSON local)*
- **[node-cache](https://github.com/node-cache/node-cache)** — Caché en memoria multicapa
- **[fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)** — Procesamiento de audio y video
- **[jimp](https://github.com/jimp-dev/jimp)** — Procesamiento de imágenes
- **[chalk](https://github.com/chalk/chalk)** — Logs con color en consola
---

## Contacto

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-Axelix09-181717?style=for-the-badge&logo=github)](https://github.com/Axelix09)
[![Instagram](https://img.shields.io/badge/Instagram-@axeldev09-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/axeldev09)
[![WhatsApp Channel](https://img.shields.io/badge/Canal-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029Vb6OR9O2v1IvoXO5oT2c)

---

*Si usás este proyecto, dejá los créditos. Se agradece 🗣️*

</div>

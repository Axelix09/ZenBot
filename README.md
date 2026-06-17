<div align="center">

```
███████╗███████╗███╗   ██╗    ██████╗  ██████╗ ████████╗
╚══███╔╝██╔════╝████╗  ██║    ██╔══██╗██╔═══██╗╚══██╔══╝
  ███╔╝ █████╗  ██╔██╗ ██║    ██████╔╝██║   ██║   ██║   
 ███╔╝  ██╔══╝  ██║╚██╗██║    ██╔══██╗██║   ██║   ██║   
███████╗███████╗██║ ╚████║    ██████╔╝╚██████╔╝   ██║   
╚══════╝╚══════╝╚═╝  ╚═══╝    ╚═════╝  ╚═════╝    ╚═╝   
```

**Bot de WhatsApp multifuncional — construido desde cero por [AxelDev09](https://github.com/AxelDev09)**

[![Version](https://img.shields.io/badge/versión-7.0.0-blueviolet?style=for-the-badge&logo=whatsapp&logoColor=white)](.)
[![Node](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](.)
[![ESM](https://img.shields.io/badge/módulos-ESM-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](.)
[![MongoDB](https://img.shields.io/badge/base%20de%20datos-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](.)
[![License](https://img.shields.io/badge/licencia-GPLv3-22c55e?style=for-the-badge)](.)

</div>

---

## ¿Qué es ZenBot?

**ZenBot** es un bot de WhatsApp de alto rendimiento construido sobre [Baileys](https://github.com/WhiskeySockets/Baileys), con una arquitectura modular de plugins, economía propia, sistema RPG, descargas multimedia y mucho más. Diseñado para grupos grandes, con soporte para múltiples sub-bots simultáneos.

> **Más de 245 archivos. Más de 16 categorías de plugins. Un solo bot que los gobierna a todos.**

---

## Características principales

| Módulo | Descripción |
|--------|-------------|
| ⚔️ **RPG & Granja** | Sistema completo con parcelas, cultivos, cocina, tienda y granero |
| 💰 **Economía** | ZenCoins, banco, duelos, robos, ruleta, slots, pesca, minería y más |
| 🤖 **Sub-Bots (Jadibot)** | Hasta 40 bots secundarios con control independiente por grupo |
| 📥 **Descargas** | YouTube, TikTok, Instagram, Spotify, Facebook, MediaFire, MEGA, GitHub, Pinterest, Threads... |
| 🔍 **Búsquedas** | Imágenes, GIFs, música, wallpapers, anime, memes, TikTok, Pinterest |
| 🎮 **Minijuegos** | Trivia, Ahorcado, PPT, Matemática, Acertijos, Tic-Tac-Toe, Ship y más |
| 🎌 **Anime** | Búsqueda, descarga, reacciones, manhwa, frases animadas |
| 🔄 **Convertidores** | Stickers, PDF, audio, video, imágenes, emojis, cripto, calculadora |
| 👥 **Gestión de grupos** | Ban, warn, tag, promoções, link, foto, descripción, modo admin, NSFW |
| 🔧 **Herramientas** | Stalk de redes sociales, QR, HD, GitHub info, npm info, IA, viewonce |
| 🔞 **NSFW** | Contenido +18 activable por grupo, con verificación de edad |
| 👋 **Bienvenidas** | Sistema automático de bienvenida y despedida por grupo |

---

## Arquitectura

```
zenbot/
├── zen.js                  ← Punto de entrada, conexión WebSocket
├── handler.js              ← Motor principal de comandos y eventos
├── config.js               ← Configuración global
├── lib/
│   ├── database/
│   │   ├── db.js           ← Conexión MongoDB
│   │   └── models/         ← Esquemas de usuarios y grupos
│   ├── games/              ← Lógica de juegos (trivia, acertijos, palabras)
│   ├── games/rpg/          ← Sistema RPG completo + gacha
│   ├── scrapers/           ← Scrapers internos
│   ├── serializer.js       ← Serialización de mensajes Baileys
│   ├── caches.js           ← Sistema de caché multicapa
│   ├── jadibot.js          ← Motor de sub-bots
│   ├── rpgManager.js       ← Gestión de niveles y resets diarios
│   └── queue.js            ← Cola de tareas
└── plugins/
    ├── P-ANIME/            ← Comandos de anime
    ├── P-BUSQUEDAS/        ← Búsquedas web y multimedia
    ├── P-CONVERTIDORES/    ← Conversión de formatos
    ├── P-CREADOR/          ← Control del bot (owner)
    ├── P-DESCARGAS/        ← Descargas de plataformas
    ├── P-ECONOMIA/         ← Sistema económico completo
    ├── P-GRUPOS/           ← Administración de grupos
    ├── P-INFO/             ← Menú, uptime, info
    ├── P-JADIBOT/          ← Control de sub-bots
    ├── P-JUEGOS/           ← Minijuegos y diversión
    ├── P-NSFW/             ← Contenido para adultos
    ├── P-REGISTRO/         ← Sistema de registro de usuarios
    ├── P-RPG/              ← Comandos de granja y RPG
    └── P-TOOLS/            ← Herramientas y stalkers
```

---

## Instalación

### Requisitos previos

- **Node.js** v18 o superior (recomendado: v20+)
- **MongoDB** (local o Atlas)
- **ffmpeg** instalado en el sistema
- Cuenta de WhatsApp activa

### Pasos

**1. Clonar el repositorio**
```bash
git clone https://github.com/AxelDev09/zenbot.git
cd zenbot
```

**2. Instalar dependencias**
```bash
npm install
```

**3. Configurar variables de entorno**

Crear un archivo `.env` en la raíz del proyecto:
```env
MONGO_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/zenbot
NODE_ENV=production
```

**4. Editar la configuración**

Abrir `config.js` y personalizar:
```js
ownerNumber: ['549XXXXXXXXXX'],   // Tu número con código de país (sin +)
botName: 'ZΞN-BOT',
MODE: 'public',                   // 'public' o 'private'
```

**5. Iniciar el bot**
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
export default {
  command: ['comando', 'alias'],
  tags: ['tools'],
  description: 'Descripción del comando',
  groupOnly: false,
  adminOnly: false,
  ownerOnly: false,
  register: false,
  nsfw: false,

  execute: async (m, { conn, args, text, isOwner, userDb, config }) => {
    await m.reply('¡Hola!')
  }
}
```

**Hooks disponibles:**
- `before` — se ejecuta antes del comando principal
- `execute` — lógica principal
- `after` — se ejecuta al finalizar
- `all` — se ejecuta en cada mensaje (sin importar el prefijo)

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

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `MONGO_URI` | URI de conexión a MongoDB | ✅ Sí |
| `NODE_ENV` | `production` o `development` | ✅ Sí |

---

## Tecnologías utilizadas

- **[@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)** — Conexión WebSocket con WhatsApp
- **[MongoDB + Mongoose](https://mongoosejs.com/)** — Base de datos persistente
- **[node-cache](https://github.com/node-cache/node-cache)** — Caché en memoria multicapa
- **[fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)** — Procesamiento de audio y video
- **[jimp](https://github.com/jimp-dev/jimp)** — Procesamiento de imágenes
- **[chalk](https://github.com/chalk/chalk)** — Logs con color en consola
- **[@axel-dev09/zen-dl](https://www.npmjs.com/package/@axel-dev09/zen-dl)** — Módulo propio de scrapers y descargas

---

## Contacto

<div align="center">

Desarrollado con 🔥 por **AxelDev09**

[![GitHub](https://img.shields.io/badge/GitHub-Axelix09-181717?style=for-the-badge&logo=github)](https://github.com/Axelix09)
[![Instagram](https://img.shields.io/badge/Instagram-@axeldev09-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/axeldev09)
[![WhatsApp Channel](https://img.shields.io/badge/Canal-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029Vb6OR9O2v1IvoXO5oT2c)

---

*Si usás este proyecto, dejá los créditos. Se agradece 🗣️*

</div>

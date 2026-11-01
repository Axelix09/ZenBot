export function getMenuQuoted(sender = '0@s.whatsapp.net', pushName = 'Usuario') {
  const menuStamps = [
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        productMessage: {
          product: {
            title: `⚡ ZenBot | Axelix09`,
            description: `Bienvenido, ${pushName} 👋`,
            currencyCode: 'USD',
            priceAmount1000: '999999999',
            retailerId: 'ZenBot-Axelix',
            productImageCount: 1
          },
          businessOwnerJid: '0@s.whatsapp.net'
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        documentMessage: {
          title: `ZenBot | Axelix09`,
          fileName: `ZenBot - Menú Oficial`,
          mimetype: 'application/pdf',
          pageCount: 777,
          fileLength: '999999999999'
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        locationMessage: {
          degreesLatitude: 35.6762,
          degreesLongitude: 139.6503,
          name: `ZenBot • Official Menu`,
          address: `Developed by Axelix09`
        }
      }
    }
  ];

  return menuStamps[Math.floor(Math.random() * menuStamps.length)];
}

export function getRandomReplyQuoted(sender = '0@s.whatsapp.net', pushName = 'Usuario') {
  const replyStamps = [
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        audioMessage: {
          mimetype: 'audio/mp4',
          ptt: true,
          seconds: 999999
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        documentMessage: {
          title: `ZenBot | Axelix09`,
          fileName: `ZenBot - Core V11`,
          mimetype: 'application/octet-stream',
          fileLength: '10485760'
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        locationMessage: {
          degreesLatitude: -34.6037,
          degreesLongitude: -58.3816,
          name: `ZenBot • System Online`,
          address: `Developed by Axelix09`
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        productMessage: {
          product: {
            title: `ZenBot | Axelix09`,
            description: `Hola, ${pushName} 👋`,
            currencyCode: 'USD',
            priceAmount1000: '999999999',
            retailerId: 'ZenBot-Axelix',
            productImageCount: 1
          },
          businessOwnerJid: '0@s.whatsapp.net'
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        contactMessage: {
          displayName: `ZenBot | Axelix09`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;ZenBot;;;\nFN:ZenBot | Axelix09\nORG:ZenBot Core\nTEL;type=CELL;type=VOICE;waid=${sender.split('@')[0]}:+${sender.split('@')[0]}\nEND:VCARD`
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        extendedTextMessage: {
          text: `⚡ ZenBot | Axelix09`
        }
      }
    }
  ];

  return replyStamps[Math.floor(Math.random() * replyStamps.length)];
}
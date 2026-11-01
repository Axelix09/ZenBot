export const OBSTACULOS = {
  animales: {
    nombre: 'Animales Salvajes',
    emoji: '🐾',
    items: [
      { 
        id: 'leon', 
        nombre: 'León', 
        emoji: '🦁', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un león hambriento ruge en el camino.', pista: 'Parece que está protegiendo algo...' },
          { descripcion: 'Una leona con sus crías bloquea el paso.', pista: 'Las madres son impredecibles.' },
          { descripcion: 'El rey de la selva te observa fijamente.', pista: 'No aparta la mirada de ti.' },
          { descripcion: 'Un león albino aparece frente a ti.', pista: 'Es considerado sagrado por algunos.' },
          { descripcion: 'Dos leones machos se están peleando.', pista: 'Puedes pasar desapercibido.' },
          { descripcion: 'El león está durmiendo profundamente.', pista: 'Pero los leones fingen dormir.' }
        ]
      },
      { 
        id: 'cocodrilo', 
        nombre: 'Cocodrilo', 
        emoji: '🐊', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un cocodrilo gigante toma el sol en la orilla.', pista: 'Los cocodrilos son más rápidos de lo que parecen.' },
          { descripcion: 'Varios cocodrilos acechan en el agua.', pista: 'El agua está tranquila... demasiado tranquila.' },
          { descripcion: 'Un cocodrilo anciano no se mueve.', pista: 'Podría estar muerto o podría estar esperando.' },
          { descripcion: 'Cocodrilos bebés están cerca de su madre.', pista: 'Nunca te acerques a crías.' },
          { descripcion: 'El cocodrilo está comiendo una presa.', pista: 'Está distraído, pero no confíes.' },
          { descripcion: 'El cocodrilo te mira fijamente.', pista: 'Está evaluando si eres una amenaza.' }
        ]
      },
      { 
        id: 'serpiente', 
        nombre: 'Serpiente', 
        emoji: '🐍', 
        dificultad: 'baja',
        escenas: [
          { descripcion: 'Una serpiente venenosa se enrosca en el camino.', pista: 'Las serpientes atacan cuando se sienten amenazadas.' },
          { descripcion: 'Dos serpientes se están apareando.', pista: 'Están distraídas, pero agresivas.' },
          { descripcion: 'Una serpiente muda su piel.', pista: 'Es un momento vulnerable para ellas.' },
          { descripcion: 'Una serpiente de cascabel te advierte.', pista: 'Su cascabel suena con fuerza.' },
          { descripcion: 'Una serpiente pitón te observa.', pista: 'No es venenosa pero es constrictora.' },
          { descripcion: 'Muchas serpientes cruzan el sendero.', pista: 'Es temporada de apareamiento.' }
        ]
      },
      { 
        id: 'aguila', 
        nombre: 'Águila', 
        emoji: '🦅', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un águila real sobrevuela el área.', pista: 'Está cazando, no te confundas con una presa.' },
          { descripcion: 'El nido de un águila está en el camino.', pista: 'Las águilas protegen ferozmente su nido.' },
          { descripcion: 'Dos águilas pelean por el territorio.', pista: 'El cielo está lleno de plumas.' },
          { descripcion: 'Un águila calva te observa.', pista: 'Es símbolo de libertad... y peligro.' },
          { descripcion: 'El águila tiene una presa en sus garras.', pista: 'Está distraída con su comida.' }
        ]
      },
      { 
        id: 'tiburon', 
        nombre: 'Tiburón', 
        emoji: '🦈', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un tiburón blanco patrulla las aguas.', pista: 'Los tiburones pueden oler la sangre desde lejos.' },
          { descripcion: 'Varios tiburones rodean el área.', pista: 'Están en modo de caza.' },
          { descripcion: 'Un tiburón martillo se acerca lentamente.', pista: 'Son curiosos pero peligrosos.' },
          { descripcion: 'El tiburón está dando vueltas.', pista: 'Te está evaluando antes de atacar.' },
          { descripcion: 'Un tiburón ballena pasa cerca.', pista: 'Son inofensivos... pero gigantes.' }
        ]
      },
      { 
        id: 'oso', 
        nombre: 'Oso', 
        emoji: '🐻', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un oso grizzly se interpone en tu camino.', pista: 'Los osos son más rápidos que los humanos.' },
          { descripcion: 'Una osa con sus crías está cerca.', pista: 'Las madres osas son extremadamente protectoras.' },
          { descripcion: 'El oso está comiendo bayas.', pista: 'Está distraído, pero no confíes.' },
          { descripcion: 'El oso se para en dos patas.', pista: 'Te está evaluando.' },
          { descripcion: 'Dos osos están peleando.', pista: 'El caos puede ser tu aliado.' },
          { descripcion: 'Un oso panda aparece de la nada.', pista: 'Parece inofensivo... pero no lo es.' }
        ]
      },
      { 
        id: 'jaguar', 
        nombre: 'Jaguar', 
        emoji: '🐆', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un jaguar acecha entre la vegetación.', pista: 'Son sigilosos y mortales.' },
          { descripcion: 'El jaguar está descansando en una rama.', pista: 'Te está observando desde arriba.' },
          { descripcion: 'Un jaguar negro aparece en la oscuridad.', pista: 'Son más difíciles de ver.' },
          { descripcion: 'El jaguar tiene una presa en el árbol.', pista: 'Está distraído comiendo.' }
        ]
      },
      { 
        id: 'manada_lobos', 
        nombre: 'Manada de Lobos', 
        emoji: '🐺', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Una manada de lobos te rodea.', pista: 'Los lobos cazan en equipo.' },
          { descripcion: 'Los lobos están aullando.', pista: 'Están comunicándose entre ellos.' },
          { descripcion: 'Un lobo solitario se acerca.', pista: 'Podría ser un exiliado... o un cazador.' },
          { descripcion: 'Los lobos están jugando entre ellos.', pista: 'Parecen inofensivos, pero no bajes la guardia.' }
        ]
      }
    ]
  },
  naturales: {
    nombre: 'Fenómenos Naturales',
    emoji: '🌋',
    items: [
      { 
        id: 'lava', 
        nombre: 'Río de Lava', 
        emoji: '🌋', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un río de lava ardiente cruza el camino.', pista: 'El calor es insoportable.' },
          { descripcion: 'La lava brota del suelo.', pista: 'El suelo tiembla antes de la erupción.' },
          { descripcion: 'Un lago de lava se extiende frente a ti.', pista: 'No hay puente ni manera de rodearlo.' },
          { descripcion: 'La lava fluye lentamente.', pista: 'Parece que puedes saltar sobre las rocas.' }
        ]
      },
      { 
        id: 'terremoto', 
        nombre: 'Terremoto', 
        emoji: '🌍', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'El suelo tiembla violentamente bajo tus pies.', pista: 'Busca un lugar estable.' },
          { descripcion: 'Un agujero se abre en el suelo.', pista: 'El terreno es inestable.' },
          { descripcion: 'Los edificios tiemblan a tu alrededor.', pista: 'La estructura se está derrumbando.' },
          { descripcion: 'El terremoto cesa pero el suelo está agrietado.', pista: 'El peligro aún no ha pasado.' }
        ]
      },
      { 
        id: 'inundacion', 
        nombre: 'Inundación', 
        emoji: '🌊', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Una inundación repentina arrasa el sendero.', pista: 'El agua sube rápidamente.' },
          { descripcion: 'El río se desborda.', pista: 'La corriente es peligrosa.' },
          { descripcion: 'El nivel del agua llega hasta la cintura.', pista: 'El agua está turbia, no ves el fondo.' },
          { descripcion: 'La inundación está retrocediendo.', pista: 'Es el momento de cruzar.' }
        ]
      },
      { 
        id: 'ventisca', 
        nombre: 'Ventisca', 
        emoji: '❄️', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Una ventisca ciega reduce la visibilidad.', pista: 'No ves más allá de tu mano.' },
          { descripcion: 'La nieve acumula un metro de altura.', pista: 'El frío es extremo.' },
          { descripcion: 'El viento helado corta la piel.', pista: 'El viento te empuja hacia atrás.' },
          { descripcion: 'La ventisca amaina por momentos.', pista: 'Aprovecha esos segundos para avanzar.' }
        ]
      },
      { 
        id: 'tormenta', 
        nombre: 'Tormenta Eléctrica', 
        emoji: '⛈️', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Rayo tras rayo caen a tu alrededor.', pista: 'El metal atrae los rayos.' },
          { descripcion: 'El cielo se oscurece por completo.', pista: 'Hay un olor a ozono en el aire.' },
          { descripcion: 'Un rayo cae cerca y te electrocuta.', pista: 'El impacto te deja aturdido.' },
          { descripcion: 'Los relámpagos iluminan el camino.', pista: 'Puedes ver el peligro en los destellos.' }
        ]
      },
      { 
        id: 'avalancha', 
        nombre: 'Avalancha', 
        emoji: '🏔️', 
        dificultad: 'muy_alta',
        escenas: [
          { descripcion: 'Una avalancha de nieve desciende por la montaña.', pista: 'La nieve truena al caer.' },
          { descripcion: 'La nieve te sepulta.', pista: 'El frío te rodea por completo.' },
          { descripcion: 'La avalancha pasa justo a tu lado.', pista: 'Escapaste por poco.' },
          { descripcion: 'El ruido de la avalancha es ensordecedor.', pista: 'La montaña se está desmoronando.' }
        ]
      },
      { 
        id: 'tsunami', 
        nombre: 'Tsunami', 
        emoji: '🌊', 
        dificultad: 'muy_alta',
        escenas: [
          { descripcion: 'Un muro de agua gigante se aproxima.', pista: 'El mar se ha retirado, es la señal.' },
          { descripcion: 'El agua arrasa todo a su paso.', pista: 'Busca un lugar elevado.' },
          { descripcion: 'La ola te alcanza y te arrastra.', pista: 'El agua te da vueltas.' },
          { descripcion: 'El tsunami se está debilitando.', pista: 'La peor parte ya pasó.' }
        ]
      },
      { 
        id: 'huracan', 
        nombre: 'Huracán', 
        emoji: '🌀', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Los vientos de un huracán intentan arrastrarte.', pista: 'El viento te empuja hacia atrás.' },
          { descripcion: 'El ojo del huracán te da tregua.', pista: 'La calma antes de la tormenta.' },
          { descripcion: 'Objetos vuelan por el aire.', pista: 'El peligro no es solo el viento.' },
          { descripcion: 'El huracán está cambiando de dirección.', pista: 'Podrías escapar por el lado menos peligroso.' }
        ]
      }
    ]
  },
  estructurales: {
    nombre: 'Obstáculos Estructurales',
    emoji: '🏗️',
    items: [
      { 
        id: 'muro', 
        nombre: 'Muro de Piedra', 
        emoji: '🧱', 
        dificultad: 'baja',
        escenas: [
          { descripcion: 'Un muro de piedra bloquea el avance.', pista: 'Podrías escalarlo.' },
          { descripcion: 'El muro tiene una puerta secreta.', pista: 'La puerta está entreabierta.' },
          { descripcion: 'El muro se está desmoronando.', pista: 'Podrías derribarlo fácilmente.' },
          { descripcion: 'Hay una grieta en el muro.', pista: 'Puedes pasar por ahí.' }
        ]
      },
      { 
        id: 'foso', 
        nombre: 'Foso', 
        emoji: '🕳️', 
        dificultad: 'baja',
        escenas: [
          { descripcion: 'Un foso profundo con estacas en el fondo.', pista: 'Podrías saltarlo con impulso.' },
          { descripcion: 'El foso es demasiado ancho.', pista: 'Hay una tabla que podrías usar de puente.' },
          { descripcion: 'El foso tiene agua en el fondo.', pista: 'El agua está a solo un metro.' },
          { descripcion: 'El foso está seco pero es profundo.', pista: 'No se ve el fondo.' }
        ]
      },
      { 
        id: 'puente_colgante', 
        nombre: 'Puente Colgante', 
        emoji: '🌉', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un puente colgante cruje con el viento.', pista: 'Las cuerdas están desgastadas.' },
          { descripcion: 'El puente está demasiado alto.', pista: 'El abismo es profundo.' },
          { descripcion: 'El puente está cubierto de hielo.', pista: 'Resbaladizo y peligroso.' },
          { descripcion: 'El puente se balancea violentamente.', pista: 'El viento lo hace peligroso.' }
        ]
      },
      { 
        id: 'tunel_oscuro', 
        nombre: 'Túnel Oscuro', 
        emoji: '🕯️', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un túnel oscuro sin fin.', pista: 'Puedes escuchar ecos.' },
          { descripcion: 'El túnel se estrecha cada vez más.', pista: 'Podrías quedar atrapado.' },
          { descripcion: 'El túnel tiene ramificaciones.', pista: 'Fácil perderse.' },
          { descripcion: 'El túnel está iluminado por hongos.', pista: 'Una luz tenue guía el camino.' }
        ]
      },
      { 
        id: 'red_cuerdas', 
        nombre: 'Red de Cuerdas', 
        emoji: '🪢', 
        dificultad: 'baja',
        escenas: [
          { descripcion: 'Una red de cuerdas dificulta el paso.', pista: 'Podrías cortarla.' },
          { descripcion: 'La red está suelta.', pista: 'Podrías deslizarte por debajo.' },
          { descripcion: 'La red tiene nudos difíciles.', pista: 'Los nudos te toman tiempo.' },
          { descripcion: 'La red está tejida con cuerdas viejas.', pista: 'Parece que se puede romper.' }
        ]
      },
      { 
        id: 'plataforma_inestable', 
        nombre: 'Plataforma Inestable', 
        emoji: '🏛️', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Una plataforma que parece a punto de colapsar.', pista: 'Las grietas son profundas.' },
          { descripcion: 'La plataforma se mueve al pisarla.', pista: 'Podrías caer al vacío.' },
          { descripcion: 'La plataforma está cubierta de musgo.', pista: 'Es resbaladiza.' },
          { descripcion: 'La plataforma tiene un agujero en medio.', pista: 'Puedes saltar sobre él.' }
        ]
      },
      { 
        id: 'escaleras_infinitas', 
        nombre: 'Escaleras Infinitas', 
        emoji: '🪜', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Escaleras que parecen no tener fin.', pista: 'El cansancio es tu enemigo.' },
          { descripcion: 'Las escaleras se desvanecen al subir.', pista: '¿Estás avanzando o retrocediendo?' },
          { descripcion: 'Las escaleras están rotas.', pista: 'Algunos escalones faltan.' },
          { descripcion: 'Una trampa está en el último escalón.', pista: 'El final es el momento más peligroso.' }
        ]
      },
      { 
        id: 'laberinto', 
        nombre: 'Laberinto', 
        emoji: '🧩', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un laberinto de paredes cambiantes.', pista: 'Las paredes se mueven sin aviso.' },
          { descripcion: 'El laberinto te da vueltas.', pista: 'Cada camino parece igual.' },
          { descripcion: 'El laberinto está lleno de trampas.', pista: 'Pisos que se abren, flechas.' },
          { descripcion: 'El centro del laberinto está cerca.', pista: 'Puedes oler la salida.' }
        ]
      }
    ]
  },
  tecnologicos: {
    nombre: 'Tecnología y Ciencia',
    emoji: '🤖',
    items: [
      { 
        id: 'laseres', 
        nombre: 'Láseres', 
        emoji: '🔴', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un campo de láseres mortales.', pista: 'Los láseres son rojos y visibles.' },
          { descripcion: 'Los láseres se mueven en patrones.', pista: 'Hay un patrón que puedes seguir.' },
          { descripcion: 'Los láseres están cerca del suelo.', pista: 'Podrías pasar por debajo.' },
          { descripcion: 'Los láseres se apagan por segundos.', pista: 'El momento justo es crítico.' }
        ]
      },
      { 
        id: 'drones', 
        nombre: 'Drones', 
        emoji: '🚁', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Drones de vigilancia te persiguen.', pista: 'Tienen cámaras infrarrojas.' },
          { descripcion: 'Los drones te bloquean el paso.', pista: 'Están programados para detenerte.' },
          { descripcion: 'Los drones están cargando.', pista: 'Ahora es tu oportunidad.' },
          { descripcion: 'Los drones te rodean en círculo.', pista: 'Están evaluando tu peligrosidad.' }
        ]
      },
      { 
        id: 'campo_fuerza', 
        nombre: 'Campo de Fuerza', 
        emoji: '🛡️', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un campo de fuerza invisible te bloquea.', pista: 'No puedes verlo pero puedes sentirlo.' },
          { descripcion: 'El campo de fuerza parpadea.', pista: 'Podrías pasar en el momento exacto.' },
          { descripcion: 'El campo de fuerza te empuja hacia atrás.', pista: 'La presión es intensa.' },
          { descripcion: 'El campo de fuerza está rodeado de paneles.', pista: 'Parece que hay un panel de control.' }
        ]
      },
      { 
        id: 'robots', 
        nombre: 'Robots de Seguridad', 
        emoji: '🤖', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Robots de seguridad patrullan la zona.', pista: 'Siguen un patrón de movimiento.' },
          { descripcion: 'Un robot te sigue y te habla.', pista: 'Intenta comunicarse contigo.' },
          { descripcion: 'Los robots están cargando.', pista: 'Ahora es seguro pasar.' },
          { descripcion: 'Un robot está desactivado.', pista: 'Podría ser una trampa.' }
        ]
      },
      { 
        id: 'torretas', 
        nombre: 'Torretas Automáticas', 
        emoji: '🔫', 
        dificultad: 'muy_alta',
        escenas: [
          { descripcion: 'Torretas automáticas apuntan hacia ti.', pista: 'Los sensores te detectan.' },
          { descripcion: 'Las torretas están en modo de espera.', pista: 'El sistema está en mantenimiento.' },
          { descripcion: 'Las torretas disparan al azar.', pista: 'Su puntería es errática.' },
          { descripcion: 'Las torretas están fuera de alcance.', pista: 'Pero te tienen en su mira.' }
        ]
      },
      { 
        id: 'seguridad', 
        nombre: 'Sistema de Seguridad', 
        emoji: '🔒', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un sistema de seguridad avanzado.', pista: 'Tiene múltiples capas.' },
          { descripcion: 'El sistema te pide una contraseña.', pista: 'Podrías intentar adivinarla.' },
          { descripcion: 'El sistema te ha detectado.', pista: 'Las alarmas se activan.' },
          { descripcion: 'El sistema está en modo de prueba.', pista: 'No está completamente activo.' }
        ]
      },
      { 
        id: 'glitch', 
        nombre: 'Glitch Temporal', 
        emoji: '💫', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'La realidad se distorsiona a tu alrededor.', pista: 'Todo se repite dos veces.' },
          { descripcion: 'El tiempo se ralentiza.', pista: 'Puedes ver cada detalle.' },
          { descripcion: 'El tiempo se acelera.', pista: 'Todo pasa demasiado rápido.' },
          { descripcion: 'Te ves a ti mismo repitiendo la acción.', pista: '¿Estás atrapado en un bucle?' }
        ]
      },
      { 
        id: 'ia', 
        nombre: 'IA Hostil', 
        emoji: '🧠', 
        dificultad: 'muy_alta',
        escenas: [
          { descripcion: 'Una inteligencia artificial intenta detenerte.', pista: 'Ha calculado todos tus movimientos.' },
          { descripcion: 'La IA te habla a través de altavoces.', pista: 'Intenta confundirte con palabras.' },
          { descripcion: 'La IA crea ilusiones holográficas.', pista: 'No sabes qué es real.' },
          { descripcion: 'La IA está aprendiendo de ti.', pista: 'Cada intento es más difícil que el anterior.' }
        ]
      }
    ]
  },
  magicos: {
    nombre: 'Magia y Sobrenatural',
    emoji: '👻',
    items: [
      { 
        id: 'fantasma', 
        nombre: 'Fantasma', 
        emoji: '👻', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un fantasma vengativo busca tu alma.', pista: 'Le temes a la luz brillante.' },
          { descripcion: 'El fantasma te pide ayuda.', pista: 'Necesita completar una misión.' },
          { descripcion: 'El fantasma te muestra su muerte.', pista: 'Está reviviendo su trauma.' },
          { descripcion: 'El fantasma te posee.', pista: 'Sientes frío y pierdes el control.' },
          { descripcion: 'Los fantasmas te rodean.', pista: 'Están todos mirándote.' }
        ]
      },
      { 
        id: 'maldicion', 
        nombre: 'Maldición', 
        emoji: '🧿', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Una maldición ancestral te persigue.', pista: 'Sientes una energía oscura detrás de ti.' },
          { descripcion: 'La maldición se activa al tocarla.', pista: 'Está en el suelo, no la pisotees.' },
          { descripcion: 'La maldición te debilita.', pista: 'Te sientes más pesado cada paso.' },
          { descripcion: 'La maldición es un espejismo.', pista: 'Te muestra tus peores miedos.' }
        ]
      },
      { 
        id: 'ilusion', 
        nombre: 'Ilusión', 
        emoji: '✨', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Ilusiones te hacen dudar de la realidad.', pista: 'Todo parece demasiado perfecto.' },
          { descripcion: 'La ilusión cambia constantemente.', pista: 'No confíes en tus ojos.' },
          { descripcion: 'La ilusión te muestra el camino incorrecto.', pista: 'Sigue el sonido, no la vista.' },
          { descripcion: 'La ilusión te atrapa en un bucle.', pista: 'Cada vez que avanzas, regresas al mismo lugar.' }
        ]
      },
      { 
        id: 'portal', 
        nombre: 'Portal Dimensional', 
        emoji: '🌀', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un portal dimensional se abre frente a ti.', pista: 'Puedes ver otra dimensión al otro lado.' },
          { descripcion: 'El portal te succiona.', pista: 'La gravedad se invierte.' },
          { descripcion: 'El portal te lleva al pasado.', pista: 'Estás viendo cómo comenzó todo.' },
          { descripcion: 'El portal está cerrado.', pista: 'Pero hay una llave en el suelo.' }
        ]
      },
      { 
        id: 'golem', 
        nombre: 'Golem', 
        emoji: '🗿', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un golem de piedra bloquea el camino.', pista: 'Se mueve cuando no lo miras.' },
          { descripcion: 'El golem te persigue lentamente.', pista: 'Es lento pero imparable.' },
          { descripcion: 'El golem está hecho de arcilla.', pista: 'El agua podría disolverlo.' },
          { descripcion: 'El golem tiene una inscripción en la frente.', pista: 'Podría ser su punto débil.' }
        ]
      },
      { 
        id: 'dragon', 
        nombre: 'Dragón', 
        emoji: '🐉', 
        dificultad: 'muy_alta',
        escenas: [
          { descripcion: 'Un dragón legendario te observa.', pista: 'Puedes ver su aliento humeante.' },
          { descripcion: 'El dragón duerme sobre un tesoro.', pista: 'Su sueño es profundo, pero no confíes.' },
          { descripcion: 'El dragón escupe fuego.', pista: 'El calor es abrasador.' },
          { descripcion: 'El dragón te habla.', pista: 'Es antiguo y sabio.' },
          { descripcion: 'El dragón te ofrece un trato.', pista: 'Pide algo a cambio de tu vida.' }
        ]
      },
      { 
        id: 'hechizo', 
        nombre: 'Hechizo', 
        emoji: '🔮', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un hechizo te atrapa en un bucle temporal.', pista: 'Vives el mismo momento una y otra vez.' },
          { descripcion: 'El hechizo te hace levitar.', pista: 'Pierdes el control de tu cuerpo.' },
          { descripcion: 'El hechizo te transforma.', pista: 'Te conviertes en otro ser.' },
          { descripcion: 'El hechizo se rompe con un objeto.', pista: 'Necesitas encontrar el contador.' }
        ]
      },
      { 
        id: 'espiritu', 
        nombre: 'Espíritu', 
        emoji: '👽', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un espíritu ancestral te pone a prueba.', pista: 'Evalúa tu pureza de corazón.' },
          { descripcion: 'El espíritu te muestra el futuro.', pista: 'Ves lo que podría pasar si fallas.' },
          { descripcion: 'El espíritu te pide una ofrenda.', pista: 'Tienes algo que podría interesarte.' },
          { descripcion: 'El espíritu te guía.', pista: 'Parece querer ayudarte.' }
        ]
      }
    ]
  },
  culinarios: {
    nombre: 'Desastres Culinarios',
    emoji: '🍳',
    items: [
      { 
        id: 'aceite_hirviendo', 
        nombre: 'Aceite Hirviendo', 
        emoji: '🍳', 
        dificultad: 'baja',
        escenas: [
          { descripcion: 'Un charco de aceite hirviendo.', pista: 'Puedes oler la comida frita.' },
          { descripcion: 'El aceite salpica violentamente.', pista: 'Las salpicaduras queman.' },
          { descripcion: 'El aceite está humeando.', pista: 'Está a punto de prenderse fuego.' },
          { descripcion: 'El aceite se está enfriando.', pista: 'Ahora es más seguro cruzar.' }
        ]
      },
      { 
        id: 'salsa_picante', 
        nombre: 'Salsa Picante', 
        emoji: '🌶️', 
        dificultad: 'baja',
        escenas: [
          { descripcion: 'Una cascada de salsa picante.', pista: 'El olor te hace lagrimear.' },
          { descripcion: 'La salsa es tan picante que quema.', pista: 'No toques el suelo.' },
          { descripcion: 'La salsa está en un lago.', pista: 'Parece salsa de tomate.' },
          { descripcion: 'La salsa está en el techo.', pista: 'Gotea constantemente.' }
        ]
      },
      { 
        id: 'queso_pegajoso', 
        nombre: 'Queso Pegajoso', 
        emoji: '🧀', 
        dificultad: 'baja',
        escenas: [
          { descripcion: 'Queso pegajoso te atrapa los pies.', pista: 'Cada paso es más difícil.' },
          { descripcion: 'El queso se está derritiendo.', pista: 'Está caliente y pegajoso.' },
          { descripcion: 'El queso forma un puente.', pista: 'Parece sólido... por ahora.' },
          { descripcion: 'El queso está en todas partes.', pista: 'No hay manera de esquivarlo.' }
        ]
      },
      { 
        id: 'fuego_cocina', 
        nombre: 'Fuego de Cocina', 
        emoji: '🔥', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Una explosión de fuego de cocina.', pista: 'El gas está en el aire.' },
          { descripcion: 'El fuego se extiende rápidamente.', pista: 'La grasa alimenta las llamas.' },
          { descripcion: 'El fuego está controlado.', pista: 'Alguien lo está vigilando.' },
          { descripcion: 'El fuego te rodea.', pista: 'No hay salida visible.' }
        ]
      }
    ]
  },
  videojuegos: {
    nombre: 'Mundo de Videojuegos',
    emoji: '🕹️',
    items: [
      { 
        id: 'goomba', 
        nombre: 'Goomba', 
        emoji: '🍄', 
        dificultad: 'baja',
        escenas: [
          { descripcion: 'Un goomba avanza hacia ti.', pista: 'Puedes saltar sobre él.' },
          { descripcion: 'Muchos goombas bloquean el paso.', pista: 'Están todos en fila.' },
          { descripcion: 'Un goomba gigante aparece.', pista: 'Es más grande de lo normal.' },
          { descripcion: 'Los goombas están dormidos.', pista: 'Puedes pasar sin despertarlos.' }
        ]
      },
      { 
        id: 'koopa', 
        nombre: 'Koopa', 
        emoji: '🐢', 
        dificultad: 'baja',
        escenas: [
          { descripcion: 'Un koopa lanza caparazones.', pista: 'Los caparazones rebotan.' },
          { descripcion: 'El koopa está en su caparazón.', pista: 'Podrías usarlo como plataforma.' },
          { descripcion: 'Los koopas vuelan.', pista: 'Tienen alas y son más rápidos.' },
          { descripcion: 'El koopa te desafía a una carrera.', pista: 'Es más rápido de lo que parece.' }
        ]
      },
      { 
        id: 'bloqueo', 
        nombre: 'Bloqueo de Pared', 
        emoji: '🧱', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Una pared invisible te bloquea.', pista: 'Puedes verla con polvo mágico.' },
          { descripcion: 'La pared se mueve hacia ti.', pista: 'Te está empujando al abismo.' },
          { descripcion: 'La pared tiene un patrón.', pista: 'Tienes que seguir el ritmo.' },
          { descripcion: 'La pared es un espejismo.', pista: 'Puedes atravesarla si no dudas.' }
        ]
      },
      { 
        id: 'powerup_falso', 
        nombre: 'Power-up Falso', 
        emoji: '⭐', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un power-up que resulta ser una trampa.', pista: 'Brilla demasiado para ser real.' },
          { descripcion: 'El power-up te convierte en un enemigo.', pista: 'Ahora todos te atacan.' },
          { descripcion: 'El power-up desaparece al tocarlo.', pista: 'Era solo una ilusión.' },
          { descripcion: 'El power-up te da poder temporal.', pista: 'Pero dura solo 10 segundos.' }
        ]
      },
      { 
        id: 'glitch_videojuego', 
        nombre: 'Glitch', 
        emoji: '💻', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un glitch distorsiona el mundo.', pista: 'Todo está pixelado.' },
          { descripcion: 'El glitch te teletransporta.', pista: 'Apareces en otro lugar.' },
          { descripcion: 'El glitch duplica todo.', pista: 'Hay dos de cada cosa.' },
          { descripcion: 'El glitch borra el camino.', pista: 'El suelo desaparece bajo tus pies.' }
        ]
      },
      { 
        id: 'boss', 
        nombre: 'Boss', 
        emoji: '👾', 
        dificultad: 'muy_alta',
        escenas: [
          { descripcion: 'Un jefe final te espera.', pista: 'Tiene múltiples formas de ataque.' },
          { descripcion: 'El jefe tiene un punto débil.', pista: 'Brilla cuando está vulnerable.' },
          { descripcion: 'El jefe te reta a combate.', pista: 'No puedes esquivarlo.' },
          { descripcion: 'El jefe está distraído.', pista: 'Está luchando contra otro.' }
        ]
      }
    ]
  },
  anime: {
    nombre: 'Anime y Manga',
    emoji: '🎌',
    items: [
      { 
        id: 'jutsu', 
        nombre: 'Jutsu', 
        emoji: '⚡', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un jutsu te atrapa en una ilusión.', pista: 'Puedes liberarte con chakra.' },
          { descripcion: 'El jutsu te transforma en un animal.', pista: 'Ahora ves el mundo desde otra perspectiva.' },
          { descripcion: 'El jutsu crea clones de ti.', pista: 'No sabes cuál es el real.' },
          { descripcion: 'El jutsu te teletransporta.', pista: 'Apareces en el lugar correcto.' }
        ]
      },
      { 
        id: 'kamehameha', 
        nombre: 'Kamehameha', 
        emoji: '🔥', 
        dificultad: 'muy_alta',
        escenas: [
          { descripcion: 'Un kamehameha se dirige hacia ti.', pista: 'Puedes sentirlo cargando.' },
          { descripcion: 'El kamehameha destruye todo a su paso.', pista: 'No hay defensa, solo esquivar.' },
          { descripcion: 'El kamehameha es una distracción.', pista: 'El verdadero ataque viene de otro lado.' },
          { descripcion: 'El kamehameha te golpea.', pista: 'Sientes el poder de Goku.' }
        ]
      },
      { 
        id: 'bankai', 
        nombre: 'Bankai', 
        emoji: '⚔️', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un bankai libera un poder inmenso.', pista: 'La presión espiritual es abrumadora.' },
          { descripcion: 'El bankai te congela.', pista: 'El hielo te envuelve.' },
          { descripcion: 'El bankai te aplasta.', pista: 'Sientes el peso de mil espadas.' },
          { descripcion: 'El bankai te da poder.', pista: 'Por un momento, tú también lo tienes.' }
        ]
      },
      { 
        id: 'sharingan', 
        nombre: 'Sharingan', 
        emoji: '👁️', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un sharingan te atrapa en un genjutsu.', pista: 'Ves lo que ellos quieren que veas.' },
          { descripcion: 'El sharingan copia tus movimientos.', pista: 'Ahora te enfrentas a ti mismo.' },
          { descripcion: 'El sharingan te hipnotiza.', pista: 'Sientes que pierdes el control.' },
          { descripcion: 'El sharingan te muestra la verdad.', pista: 'Revela lo que está oculto.' }
        ]
      },
      { 
        id: 'rasengan', 
        nombre: 'Rasengan', 
        emoji: '🌀', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Un rasengan gira a toda velocidad hacia ti.', pista: 'Puedes escuchar su zumbido.' },
          { descripcion: 'El rasengan te absorbe.', pista: 'El viento te arrastra.' },
          { descripcion: 'El rasengan explota a tu lado.', pista: 'La onda expansiva te empuja.' },
          { descripcion: 'El rasengan es demasiado grande.', pista: 'Está fuera de control.' }
        ]
      },
      { 
        id: 'gomu_gomu', 
        nombre: 'Gomu Gomu', 
        emoji: '🦾', 
        dificultad: 'media',
        escenas: [
          { descripcion: 'Un gomu gomu te atrapa en su estiramiento.', pista: 'Te envuelve como una serpiente.' },
          { descripcion: 'El gomu gomu te lanza lejos.', pista: 'Vuelas por el aire.' },
          { descripcion: 'El gomu gomu te aplasta.', pista: 'La presión es enorme.' },
          { descripcion: 'El gomu gomu te salva.', pista: 'Te agarra antes de caer.' }
        ]
      },
      { 
        id: 'zanpakuto', 
        nombre: 'Zanpakuto', 
        emoji: '⚔️', 
        dificultad: 'alta',
        escenas: [
          { descripcion: 'Una zanpakuto se despierta para detenerte.', pista: 'Puedes oír su voz en tu mente.' },
          { descripcion: 'La zanpakuto te corta.', pista: 'Sientes el filo del acero espiritual.' },
          { descripcion: 'La zanpakuto te posee.', pista: 'Su voluntad se convierte en la tuya.' },
          { descripcion: 'La zanpakuto te perdona.', pista: 'Reconoce tu fuerza interior.' }
        ]
      },
      { 
        id: 'titan', 
        nombre: 'Titán', 
        emoji: '🧟', 
        dificultad: 'muy_alta',
        escenas: [
          { descripcion: 'Un titán te persigue sin descanso.', pista: 'Puedes oír sus pasos.' },
          { descripcion: 'El titán te atrapa.', pista: 'Sientes su mano gigante rodearte.' },
          { descripcion: 'El titán te eleva.', pista: 'Ves el mundo desde arriba.' },
          { descripcion: 'El titán te deja pasar.', pista: 'No pareces ser una amenaza.' }
        ]
      }
    ]
  }
};

export const CATEGORIAS = Object.keys(OBSTACULOS);

export function getRandomObstaculo() {
  const categoriaKeys = Object.keys(OBSTACULOS);
  const categoriaKey = categoriaKeys[Math.floor(Math.random() * categoriaKeys.length)];
  const categoria = OBSTACULOS[categoriaKey];
  const item = categoria.items[Math.floor(Math.random() * categoria.items.length)];
  const escena = item.escenas[Math.floor(Math.random() * item.escenas.length)];
  
  return {
    categoria: categoriaKey,
    categoriaNombre: categoria.nombre,
    categoriaEmoji: categoria.emoji,
    ...item,
    escena: escena
  };
}

export function getRandomVariante(tipo) {
  const EXITO = [
    '¡Logras esquivarlo con una voltereta! ✨',
    'Tu instinto te salva en el último segundo. 🎯',
    'Pasas como una sombra, sin ser detectado. 🌙',
    'La suerte está de tu lado hoy. 🍀',
    'Tu entrenamiento da frutos. 💪',
    'Un movimiento rápido y estás al otro lado. ⚡',
    'La experiencia previa te ayuda a superarlo. 🧠',
    'Casi fallas, pero logras recuperarte. 😅',
    'Usas tu ingenio para encontrar una solución. 🧩',
    'La adrenalina te da fuerza extra. 🔥',
    'El obstáculo se rinde ante tu determinación. 🏆',
    'Tu velocidad es superior a cualquier obstáculo. 💨',
    'El viento sopla a tu favor. 🌬️',
    'La suerte del principiante te acompaña. 🍀',
    'Has entrenado para esto toda tu vida. 💪',
    'Tu mente fría te permite analizar la situación. 🧊',
    'El obstáculo te subestima y pagas. 😤',
    'Una distracción justo en el momento correcto. 👀'
  ];
  
  const FALLO = [
    'El obstáculo era demasiado para ti. 💀',
    'Un error de cálculo te cuesta la carrera. 😵',
    'La mala suerte te juega una mala pasada. 🍀',
    'El obstáculo te supera en habilidad. 😤',
    'Te distraes un segundo y es suficiente para fallar. 😵‍💫',
    'El destino tenía otros planes para ti. 🌌',
    'La falta de experiencia te pasa factura. 📉',
    'Intentas algo arriesgado y no funciona. 🎲',
    'El miedo te paraliza justo en el momento crítico. 😨',
    'El obstáculo te ha superado esta vez. 💔',
    'La confianza te jugó una mala pasada. 🤕',
    'Un movimiento en falso y todo se derrumba. 💀',
    'La presión era demasiado para ti. 😰',
    'El obstáculo te ha derrotado esta vez. 😞',
    'No era tu día para correr. 📉',
    'El obstáculo era impredecible. 🎭',
    'Tu estrategia no funcionó como esperabas. 🗺️',
    'El cansancio te jugó en contra. 😴'
  ];
  
  const arr = tipo === 'exito' ? EXITO : FALLO;
  return arr[Math.floor(Math.random() * arr.length)];
}
# Cómo crear modelos y texturas con IA para el juego

Esta guía explica cómo usar ChatGPT, Gemini y otras herramientas para hacer texturas y modelos 3D de Star Wars. Cuando los tengas, súbelos al repositorio y yo los integro en el juego. Lo que no sustituyas sigue usando los modelos que genera el propio juego.

> **La forma más fácil:** copia el texto completo de [`prompt-maestro.txt`](prompt-maestro.txt) y pégalo en ChatGPT o Gemini. Con eso la IA sabe qué hay que hacer, genera las imágenes y te va diciendo, paso a paso, qué hacer en cada herramienta (Meshy, Mixamo, Sketchfab, GitHub). Esta guía es la referencia detallada.

## 1. Qué hace cada herramienta

| Herramienta | Para qué sirve | Coste |
|---|---|---|
| **ChatGPT** o **Gemini** | Imágenes 2D: texturas de suelo sin costuras e imágenes de referencia de personajes. No crean modelos 3D de calidad de videojuego. | Gratis con límites |
| **Meshy** (meshy.ai), **Tripo** (tripo3d.ai) o **Hunyuan3D** (3d.hunyuan.tencent.com) | Convierten una imagen en un modelo 3D con texturas (`.glb`). | Créditos gratis cada mes |
| **Mixamo** (mixamo.com) | Pone esqueleto a un personaje y da animaciones (andar, disparar, morir...). | Gratis con cuenta de Adobe |
| **Sketchfab** (sketchfab.com) | Miles de modelos de Star Wars hechos por fans. Muchos se descargan gratis con el filtro *Downloadable*. Para vehículos y naves suele ser lo más rápido y lo de más calidad. | Gratis con cuenta |

## 2. Por dónde empezar

1. **Texturas de terreno** (sección 4). Es lo que más pantalla ocupa y ChatGPT o Gemini las hacen bien a la primera.
2. **Trabajadores y soldados** de las civilizaciones que más juegues (sección 5).
3. **Héroes**.
4. **Vehículos y naves**, mejor descargados de Sketchfab (sección 6).

No hace falta hacerlo todo: cada archivo que añadas sustituye a su modelo y el resto se queda como está.

## 3. Cómo entregarme los archivos

- **Dónde:** en la carpeta `assets/` del repositorio. En GitHub, entra en la subcarpeta que corresponda (`assets/terrain`, `assets/models/empire`...) y pulsa **Add file → Upload files**. También puedes adjuntarlos en el chat.
- **Nombres:** exactamente los de las listas de abajo, en minúsculas y sin espacios.
- **Formatos:** texturas en `.jpg` o `.png`. Los personajes con esqueleto, en `.fbx` tal como salen de Mixamo (sin convertirlos), para que compartan las animaciones. El resto de modelos, en `.glb`. Un `.gltf` con archivos aparte no sirve; si te lo dan así, pide la versión `.glb`.
- **Compresión:** sin compresión Draco. Si la herramienta ofrece *Draco*, desactívalo.
- **Tamaño de los archivos:** todo se mete dentro de `Jugar.html`, así que conviene que pesen poco. Texturas en JPG de 1024×1024 o 2048×2048, de menos de 1 MB cada una. Modelos de menos de 5 MB.
- **Polígonos:** en Meshy o Tripo, elige *Low poly* o pon un límite de polígonos.
  - Soldados y trabajadores: de 5.000 a 8.000 triángulos.
  - Héroes: hasta 12.000 triángulos.
  - Vehículos y naves: hasta 20.000 triángulos.
  - Edificios: hasta 25.000 triángulos.
- **Texturas del modelo:** incluidas dentro del `.glb`, de 1024×1024 (2048 como máximo para héroes).
- **Escala y orientación:** da igual el tamaño, lo ajusto yo. El modelo tiene que estar de pie y mirando al frente.
- **Color del jugador:** pinta de **magenta puro (#FF00FF)** las zonas que deben llevar el color de cada jugador, como franjas, hombreras o estandartes. El juego cambia ese magenta por el color del jugador.

## 4. Texturas de terreno (ChatGPT o Gemini)

Carpeta: `assets/terrain/`

**Prompt** (cambia lo que va entre corchetes, una textura por mensaje):

> Genera una textura fotorrealista **sin costuras (seamless, tileable)** de **[DESCRIPCIÓN]**, vista exactamente desde arriba (cenital, sin perspectiva). Imagen cuadrada de 2048×2048 píxeles. Iluminación plana y uniforme, sin sombras proyectadas, sin objetos grandes, sin texto ni marcas. Representa un trozo de suelo de 2×2 metros. Calidad de textura de videojuego AAA, como Star Wars Battlefront. Los bordes izquierdo/derecho y superior/inferior deben encajar perfectamente al repetirla en mosaico.

No hace falta mapa de normales: lo genero yo a partir de la imagen.

| Archivo | Descripción para el prompt | Planetas |
|---|---|---|
| `arena.jpg` | arena de desierto dorada con ondulaciones finas de viento y algunas piedrecitas | Tatooine, Jakku |
| `arenisca.jpg` | roca arenisca anaranjada agrietada, en capas | acantilados de Tatooine y Jakku |
| `nieve.jpg` | nieve compacta con leves marcas de viento y cristales de hielo | Hoth |
| `hielo.jpg` | hielo azulado translúcido con grietas | Hoth |
| `cesped.jpg` | césped verde natural con tréboles y alguna calva de tierra | Naboo |
| `suelo_bosque.jpg` | suelo de bosque con hojas secas, agujas de pino, musgo y raíces | Endor |
| `suelo_selva.jpg` | suelo de selva húmeda con musgo, hojas grandes y tierra oscura | Kashyyyk, Yavin 4 |
| `barro.jpg` | barro oscuro de pantano con charcos, raíces y algas | Dagobah |
| `tierra_roja.jpg` | tierra rojiza polvorienta con guijarros | Geonosis |
| `roca_roja.jpg` | roca roja erosionada con grietas | acantilados de Geonosis |
| `roca_volcanica.jpg` | roca volcánica negra y porosa con grietas | Mustafar |
| `placas_metal.jpg` | suelo industrial de placas metálicas con juntas, remaches y suciedad | Coruscant |
| `sal.jpg` | costra de sal blanca con fisuras que dejan ver tierra roja | Crait |
| `arena_playa.jpg` | arena clara de playa tropical con conchas pequeñas | Scarif |
| `pradera.jpg` | hierba seca dorada de pradera con tierra | Lothal |
| `suelo_hongos.jpg` | suelo alienígena con musgo de colores vivos y esporas | Felucia |
| `camino.jpg` | tierra compactada de camino con huellas | todos |
| `roca_gris.jpg` | roca granítica gris con grietas y líquenes | acantilados en general |
| `grava.jpg` | grava gris y marrón | todos |

## 5. Personajes

Los personajes llevan cuatro pasos. Puedes saltarte los pasos 1 y 2 si encuentras el personaje ya hecho en Sketchfab.

### Paso 1: imagen de referencia (ChatGPT o Gemini)

**Prompt:**

> Crea una imagen de referencia para convertirla en un modelo 3D de videojuego: **[DESCRIPCIÓN DEL PERSONAJE]**. Cuerpo entero de pies a cabeza, vista frontal exacta, en pose A (brazos rectos separados del cuerpo unos 45°, piernas ligeramente separadas), mirando a la cámara. **Manos vacías, sin armas.** Fondo blanco liso, iluminación uniforme y neutra, sin sombras ni efectos de luz. Proporciones realistas, estilo de videojuego AAA como Star Wars Battlefront, materiales detallados y desgastados. Las zonas marcadas como color de equipo deben ser de color magenta puro (#FF00FF).

Las armas no hacen falta: las hago yo y se las pongo en la mano. Los personajes con las manos vacías se animan mucho mejor.

### Paso 2: imagen a 3D (Meshy, Tripo o Hunyuan3D)

1. Sube la imagen con la opción *Image to 3D*.
2. Activa la textura. Si te deja elegir, pon *Low poly* o un límite de unos 6.000 triángulos.
3. Descarga el modelo en **`.fbx`**, que es lo que acepta Mixamo.

### Paso 3: esqueleto (Mixamo)

1. Sube el `.fbx` a Mixamo.
2. Coloca los marcadores que pide: barbilla, muñecas, codos, rodillas e ingle.
3. Descarga el personaje con **Format: FBX** y **Skin: With Skin**, en la pose T.
   Si en Mixamo se ve gris (ha perdido la textura), guarda la textura de Meshy con el mismo nombre al lado, por ejemplo `trooper.png` junto a `trooper.fbx`. El juego la aplica sola.
4. Si el personaje no es humanoide (un droideka, por ejemplo), sáltate este paso y entrégame el `.glb` del paso 2.

### Paso 4: animaciones (solo una vez para todos)

Todos los personajes de Mixamo comparten el mismo esqueleto, así que un solo juego de animaciones sirve para todos. Busca estas en Mixamo y descarga cada una con **Format: FBX** y **Skin: Without Skin**. Si la animación tiene la casilla **In Place**, márcala para que el personaje no se desplace solo:

| Archivo | Qué buscar en Mixamo |
|---|---|
| `idle.fbx` | Rifle Idle |
| `walk.fbx` | Rifle Walk (o Walking) |
| `run.fbx` | Rifle Run |
| `shoot.fbx` | Firing Rifle |
| `pistol.fbx` | Pistol Idle o Shooting |
| `melee.fbx` | Sword Slash o Standing Melee Attack |
| `work.fbx` | Hammering, Mining o Digging |
| `death.fbx` | Dying o Death |

Carpeta de las animaciones: `assets/models/anims/`

### Lista de personajes

Carpeta: `assets/models/<civilización>/` (por ejemplo, `assets/models/empire/trooper.fbx`).

Si falta el modelo pesado (`heavy_trooper`), el juego usa el normal (`trooper`) con otra arma. Cada civilización tiene también `grenadier` (granadero, con mochila de detonadores) y `aa_trooper` (antiaéreo, con mochila de misiles); las descripciones de cada uno están en `prompt-maestro.txt`.

**Imperio Galáctico** (`empire`)
- `worker`: técnico imperial con mono gris oscuro, gorra imperial, cinturón de herramientas y chaleco con una franja de color de equipo en el hombro.
- `trooper`: soldado de asalto imperial (stormtrooper) con la armadura blanca clásica, hombrera de color de equipo.
- `heavy_trooper`: soldado de asalto con la armadura más gruesa, mochila de munición y hombreras de color de equipo.
- `jedi_knight`: inquisidor imperial con traje negro acolchado, casco negro y franja de color de equipo.
- `jedi_master`: lord sith con túnica negra y capucha.
- `dark_trooper`: Dark Trooper fase III, gran robot negro de combate de dos metros y medio.

**Alianza Rebelde** (`rebels`)
- `worker`: técnico rebelde con mono beige, chaleco con bolsillos y gafas en la frente.
- `trooper`: soldado rebelde de Endor con casco con visera, chaleco táctico de camuflaje, pantalón verde oliva y brazalete de color de equipo.
- `heavy_trooper`: soldado rebelde de Hoth con abrigo acolchado blanco, gafas de nieve y mochila.
- `jedi_knight`: caballero jedi rebelde con túnica negra sencilla.
- `jedi_master`: maestro jedi con túnica beige y capucha.

**República Galáctica** (`republic`)
- `worker`: operario de la República con mono gris claro y casco de obra.
- `trooper`: soldado clon fase II con armadura blanca y marcas de color de equipo en casco y hombros.
- `heavy_trooper`: soldado clon pesado con mochila de munición y marcas de color de equipo.
- `jedi_knight`: caballero jedi con túnica marrón clásica.
- `jedi_master`: maestro jedi con túnica marrón y capucha.
- `arc_trooper`: soldado clon ARC con kama (faldón), hombrera y telémetro, marcas de color de equipo.

**Confederación** (`cis`)
- `worker`: droide obrero de mantenimiento delgado y metálico.
- `trooper`: droide de combate B1 color hueso, delgado, con la cabeza alargada característica.
- `heavy_trooper`: superdroide de combate B2 azul acero, pecho voluminoso.
- `jedi_knight`: acólito sith con ropa negra ceñida.
- `jedi_master`: lord sith con capa oscura.
- `magnaguard`: MagnaGuardia IG-100 con capa y cara de ojos rojos.

**Federación de Comercio** (`tradefed`)
- `worker`: droide de trabajo pesado marrón.
- `trooper`: droide de combate B1 marrón arena.
- `heavy_trooper`: droide comandante OOM con marcas de color de equipo.
- `jedi_knight`: guerrero zabrak con ropa negra.
- `jedi_master`: lord sith con capa negra.
- `droideka`: droideka (droide destructor) desplegado, con su escudo. **No humanoide:** entregar `.glb` sin esqueleto.

**Naboo Real** (`naboo`)
- `worker`: granjero de Naboo con ropa de lino marrón y sombrero.
- `trooper`: guardia de seguridad real de Naboo con gorra, chaleco acolchado azul marino, pantalón marrón y botas.
- `heavy_trooper`: guardia real de élite con armadura ligera y capa corta de color de equipo.
- `jedi_knight`: padawan jedi con trenza y túnica clara.
- `jedi_master`: maestro jedi con túnica marrón.

**Gungans** (`gungans`)
- `worker`: gungan obrero con ropa de cuero sencilla, piel anaranjada y largas orejas colgantes.
- `trooper`: soldado gungan con armadura de cuero, casco y escudo, piel anaranjada.
- `jedi_knight` y `jedi_master`: gungan jedi con túnica.

**Wookiees** (`wookiees`)
- `worker`: wookiee artesano con delantal de cuero y pelo marrón claro.
- `trooper`: guerrero wookiee con bandolera, hombreras de metal y pelo marrón.
- `berserker`: wookiee berserker enorme con pintura de guerra y armadura de madera.
- `jedi_knight` y `jedi_master`: wookiee jedi con túnica.

**Héroes** (carpeta `assets/models/heroes/`)

| Archivo | Héroe |
|---|---|
| `vader` | Darth Vader |
| `palpatine` | Emperador Palpatine |
| `boba_fett` | Boba Fett |
| `luke` | Luke Skywalker |
| `han` | Han Solo |
| `leia` | Princesa Leia |
| `yoda` | Maestro Yoda |
| `obiwan` | Obi-Wan Kenobi |
| `mace` | Mace Windu |
| `rex` | Capitán Rex |
| `dooku` | Conde Dooku |
| `ventress` | Asajj Ventress |
| `grievous` | General Grievous |
| `maul` | Darth Maul |
| `oom9` | Comandante OOM-9 |
| `aurra` | Aurra Sing |
| `quigon` | Qui-Gon Jinn |
| `padme` | Reina Padmé Amidala |
| `panaka` | Capitán Panaka |
| `boss_nass` | Jefe Nass |
| `jarjar` | Jar Jar Binks |
| `tarpals` | Capitán Tarpals |
| `chewbacca` | Chewbacca |
| `tarfful` | Tarfful |
| `gungi` | Gungi |

## 6. Vehículos y naves (mejor desde Sketchfab)

En Sketchfab, busca el nombre, activa el filtro **Downloadable** y descarga en formato **glTF** o **GLB**. Los vehículos no necesitan esqueleto: el movimiento lo pongo yo.

Carpeta: `assets/models/<civilización>/<archivo>.glb`

| Archivo | Imperio | Rebeldes | República | Confederación | Federación | Naboo | Gungans | Wookiees |
|---|---|---|---|---|---|---|---|---|
| `scout` | speeder bike 74-Z | speeder bike | BARC speeder | STAP | STAP | Flash speeder | kaadu | speeder de madera |
| `mounted_trooper` | — | tauntaun | BARC speeder | STAP | STAP | Flash speeder | kaadu | varactyl |
| `strike_mech` | AT-ST | tanque repulsor | AT-RT | dwarf spider droid | droide de ruedas | tanque Gian | kaadu armado | AT-ST de madera |
| `mech_destroyer` | tanque repulsor TX-225 | tanque de iones | TX-130 Saber | tanque de orugas | homing spider droid | tanque repulsor | falumpaset | ariete de madera |
| `assault_mech` | AT-AT | tanque pesado | AT-TE | hailfire droid | AAT | tanque real | falumpaset de guerra | tanque de madera |
| `artillery` | SPMA-T | cañón de iones | SPHA-T | homing spider droid | PAC (cañón MTT) | artillería real | catapulta de bombas | catapulta |
| `fighter` | TIE fighter | X-wing | ARC-170 | Vulture droid | Vulture droid | Naboo N-1 starfighter | — | catamarán wookiee |
| `adv_fighter` | TIE interceptor | A-wing | V-wing | Tri-fighter | — | N-1 | — | catamarán |
| `bomber` | TIE bomber | Y-wing | Y-wing (Clone Wars) | Hyena bomber | Hyena bomber | Naboo bomber | — | ornitóptero |
| `heavy_bomber` | — | B-wing | Y-wing | Hyena | Hyena | Naboo bomber | — | ornitóptero |
| `trader` | carguero imperial | carguero GR-75 | carguero | carguero droide | carguero | carguero de Naboo | carguero gungan | carguero de madera |

Faltan en la tabla `pummel` (ariete: Juggernaut, MTT o ariete de madera) y `aa_mobile` (plataforma de misiles antiaérea); están en `prompt-maestro.txt`.

Las únicas: `airspeeder` (rebeldes, aerodeslizador T-47 de Hoth), `royal_crusader` (Naboo, Flash speeder con piloto) y `fambaa` (gungans, fambaa con generador de escudo).

## 7. Qué hace el juego con los archivos

El juego ya está preparado para recibirlos:

- **Carga automática.** Al empezar la partida carga lo que haya en `assets/`. Si un archivo existe, sustituye al modelo generado; si no, se usa el de siempre.
- **Ajustes automáticos.** El tamaño, la orientación y el color de equipo (el magenta) se ajustan solos.
- **Armas y animaciones.** A los personajes con esqueleto les pone un arma en la mano derecha (rifle, pistola o sable según la unidad) y les asigna las animaciones: reposo, andar, disparar, cuerpo a cuerpo, trabajar y morir.
- **Unidades derivadas.** Si falta el modelo de una unidad pesada o de élite, usa el de la normal.
- **Edificios.** Admiten modelo propio con el mismo sistema, por ejemplo `assets/models/empire/command_center.glb`. Se escalan para caber en su parcela. Los muros y compuertas no: se arman por tramos.
- **Animaciones a medida.** Las animaciones compartidas se adaptan a la altura de cada personaje, así que Yoda no flota y Chewbacca no se hunde.
- **Doble clic.** Al regenerar `Jugar.html` (`npm run build:single`), los archivos van dentro y siguen funcionando con doble clic. Si los subes a GitHub, yo lo regenero.

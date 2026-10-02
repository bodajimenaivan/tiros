# Star Wars: Guerras Galácticas — RTS estilo Age of Empires

Juego de estrategia en tiempo real en 3D, inspirado en *Age of Empires II* y *Star Wars: Galactic Battlegrounds*, que se ejecuta en el navegador. Proyecto de uso privado y local.

Todo el contenido visual (modelos, terreno, efectos) y sonoro (música, efectos, voces) se genera por código. No hace falta descargar ningún recurso externo.

## Requisitos

- Node.js 18 o superior (recomendado 20+)
- Un navegador moderno con WebGL2 (Chrome, Edge o Firefox) y una tarjeta gráfica dedicada para la calidad "Alta/Ultra"

## Cómo jugar en local

```bash
npm install
npm run dev
```

Abre la dirección que muestra la consola (por defecto `http://localhost:5173`).

Versión optimizada (más rápida):

```bash
npm run build
npx vite preview
```

Otros comandos útiles:

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | Comprueba los tipos de TypeScript |
| `npm run sim -- empire rebels tatooine 40 hard` | Partida IA contra IA sin gráficos (para comprobar el equilibrio) |
| `npx tsx tests/tournament.ts` | Torneo de todas las civilizaciones entre sí (IA difícil) |

## Modos de juego

- **Acción instantánea**: partida rápida, 1 contra 1, contra la IA, en un planeta aleatorio.
- **Escaramuza**: hasta 8 jugadores. Puedes elegir equipos, colores, civilizaciones, dificultad de cada IA, planeta, tamaño del mapa, recursos iniciales, era inicial, límite de población, revelado del mapa, tregua inicial y condición de victoria: estándar (conquista, monumento u holocrones), solo conquista, o puntuación con tiempo límite.
- **Conquista Galáctica**: campaña por turnos sobre un mapa de la galaxia con 15 planetas unidos por hiperrutas. Mueves flotas, reclutas tropas y fortificas mundos. Cada batalla se resuelve automáticamente o se juega como una partida RTS en el planeta.
- **Enciclopedia**: datos de todas las unidades, edificios, tecnologías, civilizaciones y planetas.

## Civilizaciones

| Civilización | Estilo | Unidad única |
|---|---|---|
| Imperio Galáctico | Mechs de asalto, torretas, Darth Vader y Palpatine | Soldado Oscuro |
| Alianza Rebelde | Aviación, tropas rápidas, Luke, Han y Leia | Aerodeslizador T-47 |
| República Galáctica | Clones y Jedi, Yoda, Obi-Wan, Mace y Rex | Soldado ARC |
| Confederación (CIS) | Droides en masa, Dooku, Grievous y Ventress | MagnaGuardia IG-100 |
| Federación de Comercio | Droidekas y mechs, OOM-9 y Darth Maul | Droideka |
| Naboo Real | Economía de Nova, cazas, Padmé y Qui-Gon | Cruzado Real |
| Gungans | Infantería, escudos móviles, Boss Nass y Jar Jar | Fambaa Escudo |
| Wookiees | Infantería de choque, Chewbacca y Tarfful | Berserker Wookiee |

Cada civilización tiene sus propias bonificaciones, una bonificación de equipo, tecnologías únicas, héroes, unidades desactivadas y arquitectura propia.

## Economía

- **Alimento**: bayas, caza de animales nativos y granjas de humedad (se pueden replantar).
- **Carbono**: árboles y restos de chatarra.
- **Nova**: cristales. Es también la moneda del mercado.
- **Mineral**: vetas de mineral. Se usa en torretas, muros y fortalezas.
- Los trabajadores llevan los recursos al centro de mando o a los centros de procesamiento.
- En el **Puerto Espacial** puedes comprar y vender recursos y enviar tributos a tus aliados.
- Los **Núcleos de Energía** dan energía a los edificios militares; sin energía producen a la mitad de velocidad.

## Eras

1. **Era Fronteriza**: economía básica, soldados.
2. **Era de Expansión**: mechs, investigación, mercado, torretas y muros.
3. **Era de las Guerras**: Fuerza (templo), armas pesadas, aviación, escudos, fortaleza y héroes.
4. **Era Galáctica**: mejoras finales y Monumento.

Para avanzar de era hacen falta recursos y dos edificios distintos de la era actual.

## Controles

| Acción | Control |
|---|---|
| Seleccionar | Clic izquierdo o arrastrar un recuadro |
| Seleccionar todas las unidades iguales en pantalla | Doble clic (o Ctrl + clic) |
| Mover, atacar, recolectar, reparar o entrar en guarnición | Clic derecho |
| Encadenar órdenes | Mantener Mayúsculas al dar la orden |
| Mover la cámara | Flechas del teclado, ratón en los bordes, arrastrar con el botón central o clic en el minimapa |
| Zoom | Rueda del ratón |
| Rotar la cámara | Ctrl + rueda, o las teclas Inicio y Fin |
| Comandos del panel | Teclas de la cuadrícula (Q W E R T / A S D F G / Z X C V B) |
| Grupos de control | Ctrl + 0-9 para asignar, 0-9 para seleccionar (pulsar dos veces centra la cámara) |
| Trabajador ocioso / militar ocioso | `.` / `,` |
| Ir al centro de mando | H |
| Ir a la última alerta | Barra espaciadora |
| Borrar la unidad o el edificio seleccionado | Supr |
| Pausa | P, F3 o Pausa |
| Velocidad de juego | `+` / `-` |
| Menú | Esc o F10 |

## Música

La música se genera por código: hay temas para el menú, la galaxia, cada tipo de planeta, la victoria y la derrota, y la intensidad sube durante los combates.

Si quieres usar tus propios archivos de música, cópialos en `public/music/` con estos nombres (`.mp3` u `.ogg`):

`menu`, `galaxy`, `heroic`, `dark`, `mystic`, `war`, `victory`, `defeat`

Por ejemplo, `public/music/heroic.mp3`. Si existe un archivo, se usa en lugar del tema generado.

## Opciones gráficas

En **Opciones** puedes cambiar la calidad (Baja, Media, Alta o Ultra), las sombras, el bloom, la resolución interna, el volumen de la música y de los efectos, las voces, la velocidad de juego, el desplazamiento de la cámara por los bordes y si las barras de vida se ven siempre. Si el juego va lento, baja la calidad o la resolución interna.

## Estructura del código

```
src/
  data/      Datos del juego: unidades, edificios, tecnologías, civilizaciones y planetas
  sim/       Simulación determinista: mapa, búsqueda de caminos, combate, economía y victoria
  ai/        IA de los jugadores (cuatro dificultades)
  render/    Motor 3D con Three.js: terreno, modelos, efectos, hierba y postprocesado
  ui/        HUD, menús, minimapa, enciclopedia y controles
  audio/     Sintetizador de efectos, voces y música
  galactic/  Modo Conquista Galáctica
tests/       Simulaciones sin gráficos, torneos y herramientas de depuración
```

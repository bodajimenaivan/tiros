# Recursos propios

Pon aquí tus texturas y modelos. El juego los usa en lugar de los generados por código.
También se incluyen dentro de `Jugar.html` al regenerarlo con `npm run build:single`.

| Carpeta | Contenido |
|---|---|
| `terrain/` | Texturas de suelo sin costuras (`arena.jpg`, `cesped.jpg`...) |
| `models/<civilización>/` | Unidades y edificios: `trooper.glb`, `worker.fbx`, `strike_mech.glb`, `command_center.glb`... |
| `models/heroes/` | Héroes: `vader.glb`, `luke.fbx`... |
| `models/anims/` | Animaciones de Mixamo compartidas: `idle.fbx`, `walk.fbx`, `shoot.fbx`... |

Carpetas de civilización: `empire`, `rebels`, `republic`, `cis`, `tradefed`, `naboo`, `gungans` y `wookiees`.

Para crearlos con IA, pega el texto de `docs/prompt-maestro.txt` en ChatGPT o Gemini: te guía paso a paso.
La referencia detallada (nombres de archivo y prompts) está en `docs/modelos-con-ia.md`.

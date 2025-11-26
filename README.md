# 🐍 SNEAKER - Modern Snake Game

Un remake moderno y frenético del clásico Snake con estética synthwave/neon, mecánicas rogue-lite y efectos visuales impresionantes.

## 🎮 Características

### Movimiento Suave
- **Control 360°**: A diferencia del Snake clásico, esta serpiente se mueve suavemente en todas las direcciones
- **Sistema de Cola Dinámica**: Cada segmento sigue el camino exacto de la cabeza, permitiendo curvas naturales
- **Dash**: Acelera y vuelve temporalmente invulnerable usando la barra de energía

### Power-Ups
- 👻 **Ghost Protocol**: Atraviesa tu propia cola y muros
- ⏱️ **Time Warp**: Ralentiza todo el juego excepto tú (efecto Matrix)
- 🧲 **Magneto**: Atrae la comida automáticamente
- 🔫 **Turret Tail**: Tu cola dispara proyectiles automáticos a enemigos cercanos
- 💥 **Cut Tail**: Sacrifica el 30% de tu tamaño para crear una explosión que limpia enemigos
- 🛡️ **Shield**: Invulnerabilidad temporal (Nuevo!)

### Enemigos
- 🔺 **Cazadores (Hunters)**: Triángulos rojos que te persiguen.
- 🔶 **Torretas (Turrets)**: Estructuras estáticas que disparan láseres.
- ☣️ **Virus**: Si lo comes, tus controles se invierten.

### Progresión y Personalización
- **Sistema de Niveles**: Cada 500 puntos subes de nivel y el juego se vuelve más rápido.
- **Tienda**: Compra mejoras permanentes y niveles de power-ups.
- **Skins**: Múltiples apariencias con efectos únicos (Fuego, Robot, etc.).
- **Misiones**: Logros que desbloquean contenido exclusivo.
- **Inventario**: Visualiza y equipa tus skins desbloqueadas.

## 🚀 Cómo Jugar

1. Haz clic en "JUGAR" en el menú principal para comenzar.
2. Usa las flechas o **A/D** para maniobrar la serpiente.
3. Come la comida amarilla para crecer y ganar puntos.
4. Recolecta power-ups morados para obtener habilidades temporales.
5. Evita enemigos rojos y proyectiles.
6. Sobrevive el mayor tiempo posible y alcanza el nivel más alto.

### Controles
- **Flechas Izquierda/Derecha** o **A/D**: Rotar la serpiente
- **Barra Espaciadora**: Activar Dash (acelerar + invulnerabilidad temporal)
- **ESC**: Pausa / Volver al menú

### Sistema de Niveles
- Cada comida vale **10 puntos**
- Cada **100 puntos** (10 comidas) subes un nivel
- Con cada nivel la serpiente se mueve más rápido
- A mayor nivel, más enemigos aparecen

### 🔥 HARD MODE (Nivel 10+)
Al alcanzar el **Nivel 10**, entras en HARD MODE:
- **Bonificación única**: +100 monedas al entrar
- **El nivel se queda en 10** (no sube más)
- **Puntos x1.5**: Cada comida da 15 puntos en lugar de 10
- **Monedas x2**: Cada comida da 2 monedas en lugar de 1
- **Más enemigos**: Aparecen el doble de rápido y a veces en pares
- **Mayor desafío**: Perfecta para jugadores expertos

### 💰 Bonificaciones por Nivel
- **+50 monedas** cada vez que alcanzas un nivel nuevo (récord personal)
- Ejemplo: Si tu máximo era Nivel 5 y llegas a Nivel 6, recibes 50 monedas extra

## 💻 Instalación y Ejecución

**Nota Importante**: Debido a la arquitectura moderna (ES6 Modules), el juego requiere un servidor local.

1.  **Instalar servidor** (si tienes Node.js):
    ```bash
    npm install -g http-server
    ```
2.  **Ejecutar servidor** en la carpeta del proyecto:
    ```bash
    npx http-server .
    ```
3.  **Abrir en navegador**: `http://localhost:8080`

## 🛠️ Implementación Técnica

El proyecto utiliza una arquitectura modular organizada:

```
snaker/
├── index.html          # UI y Canvas
├── styles.css          # Estilos Neon
└── js/
    ├── main.js         # Entry Point
    ├── config.js       # Configuración Global
    ├── Game.js         # Lógica Principal
    ├── entities/       # Clases: Snake, Food, Enemies
    └── systems/        # Sistemas: Shop, Skins, Progression
```

### Tecnologías
- **HTML5 Canvas**: Renderizado de alto rendimiento.
- **ES6 Modules**: Código organizado y mantenible.
- **LocalStorage**: Persistencia de datos (monedas, skins, misiones).
- **Vanilla JS**: Sin frameworks externos.

## 🎁 Secretos

- Hay un código secreto que desbloquea una skin especial... 👀

## 📜 Licencia
Proyecto de código abierto para fines educativos.

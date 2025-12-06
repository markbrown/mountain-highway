# Claude Code Guidelines for Mountain Highway Project

## Technology Stack

- **HTML5 Canvas** for rendering
- **Vanilla JavaScript** for game logic
- **Web Audio API** for sound effects (planned)

## File Structure

```
mountain-highway/
├── index.html                      (main game page)
├── test-game-static.html           (static debug visualization)
├── test-validation.html            (validation test suite)
├── style.css                       (game styles)
├── js/
│   ├── config.js                   (all constants and configuration)
│   ├── renderer.js                 (canvas drawing, Viewport, Renderer)
│   ├── course.js                   (Course, Span, Bridge, Direction constants)
│   ├── level.js                    (Level class combining course + islands)
│   ├── validation.js               (CourseValidator, ValidationError)
│   ├── debug.js                    (DebugRenderer for overlays)
│   ├── ui.js                       (UIManager for overlays and buttons)
│   ├── game.js                     (main game loop and state machine)
│   ├── physics.js                  (car movement, collisions) - planned
│   └── audio.js                    (sound effects) - planned
├── assets/
│   └── sounds/                     - planned
├── README.md                       (for repository viewers - Mark will manage)
├── GAME_DESIGN.md                  (game concept, mechanics, design decisions)
└── CLAUDE.md                       (workflow and development guidelines)
```

## Git Workflow - VERY IMPORTANT

**Mark handles all git staging and pushing. Claude only commits when asked.**

1. **Mark** uses `git add` to stage files - **NEVER use `git add` yourself**
2. **Claude** creates commits with short log messages when explicitly requested
3. **Mark** uses `git push` to GitHub - **NEVER push changes yourself**

**Git operations Claude can do:**
- Read-only operations: `git status`, `git diff`, `git log`, `git show`, etc.
- `git commit` - ONLY when explicitly asked after Mark has staged files

**Git operations Claude must NEVER do:**
- `git add` (Mark does this)
- `git push` (Mark does this)
- Any destructive operations without explicit request

## Development Approach

- Methodical, dialog-based development process
- Ask questions and suggest alternatives when needed
- Start simple, iterate based on feedback
- Focus on getting the core mechanics right before polish

## Code Style

- Clean, readable code
- Clear comments explaining intent
- Minimalist design philosophy matching the game aesthetic

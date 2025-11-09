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

## Key Technical Insights

### Data Representation Matters

When implementing bidirectional features (like negative spans), consider **separating sign from magnitude**:

**Problem**: Storing signed values (e.g., `span.length = -4`) leads to:
- Repeated sign checks via position comparisons: `endPos >= startPos`
- Complex conditional logic throughout the codebase
- Sign derived implicitly rather than stored explicitly

**Solution**: Separate representation:
```javascript
class Span {
    this.length = Math.abs(length);    // Always positive
    this.sign = Math.sign(length) || 1; // +1 or -1
    get isPositive() { return this.sign > 0; }
    get signedLength() { return this.length * this.sign; }
}
```

**Benefits**:
- Sign computed once in constructor
- Clear intent: `span.isPositive` vs `span.endPos >= span.startPos`
- Less conditional logic - sign is explicit, not derived
- Easier to maintain and extend

### Isometric Rendering Order

When rendering in isometric view with bidirectional movement:

**Islands**: Back-to-front by `row + col` distance
**Bridges and Car**: Three-pass system based on animation state:
1. **All completed bridges** (under car - car drives on top)
2. **Positive animating bridges** (behind car)
3. **Car**
4. **Negative animating bridges** (in front of car)

**Key insight**: Rendering order depends on both direction AND animation state. Completed bridges always go under the car regardless of direction.

### Incremental Complexity

Adding negative spans revealed cascading complexity across 6+ systems. When Mark asked "is there a better way?", we:
1. Acknowledged the complexity was real
2. Analyzed alternative data representations
3. Evaluated trade-offs (Option 1 vs 2 vs 3)
4. Refactored systematically once design was agreed upon

**Lesson**: Major feature additions benefit from pausing to evaluate if the data model should be refactored before the complexity becomes entrenched.

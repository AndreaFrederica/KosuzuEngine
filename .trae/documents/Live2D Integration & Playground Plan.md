# KosuzuEngine Live2D Integration & Playground Plan

This plan integrates Live2D into the engine with a unified actor system and adds a sophisticated Playground with grouped parameter inspection.

## 1. Dependencies
*   **Libraries**:
    *   `pixi.js` (**v7.x**): Compatible with `pixi-live2d-display`.
    *   `pixi-live2d-display`: Latest version.
    *   `monaco-editor`: For the script editor.
*   **Assets**:
    *   Deploy `live2dcubismcore.min.js` to `public/lib/`.

## 2. Core Engine Updates

### 2.1 Unified Character System (`BaseActor.ts`)
*   **Dual Mode**: `CharacterActor` gains `mode: 'normal' | 'live2d'`.
*   **Unified API**:
    *   `pose()`: Maps to Motion/Expression.
    *   **New API**: `setParam(id, value)` for direct Cubism parameter control.
    *   `show() / hide()`: Toggles visibility in the shared Live2D layer.

### 2.2 Shared Rendering Layer (`StageView.vue`)
*   **Implementation**: Add `<Live2DLayer>` (Single PixiJS Application) to `StageView`.
*   **Layering**: Managed via Z-index to sit interleaved with background/UI.

## 3. Playground Implementation (`/playground`)

### 3.1 Architecture
*   **Context**: Runs a private `Runtime` instance.
*   **Layout**: Split-pane (Preview Left, Tools Right).

### 3.2 Mode 1: Model Viewer (Deep Inspection)
This mode exposes the raw Cubism internals for debugging and script generation.

*   **Motion/Expression List**:
    *   Click to trigger; displays code: `await actor.pose('motion_name')`.
*   **Parameter Inspector (Smart Grouping)**:
    *   **Auto-Discovery**: Iterates all Cubism parameters.
    *   **Grouped Display**: Automatically categorizes parameters into sections (e.g., **Head**, **Eyes**, **Mouth**, **Body**, **Hair**) based on ID naming conventions (e.g., `ParamAngle` -> Head, `ParamEye` -> Eyes).
    *   **Controls**: Sliders for real-time adjustment.
    *   **Script Gen**: "Copy Code" button for each parameter state.

### 3.3 Mode 2: Script Editor (Monaco)
*   **Editor**: TypeScript syntax.
*   **Execution**: Transpiles and runs against the local `Runtime`, allowing testing of complex sequences combining motions and parameter tweaks.

## 4. Implementation Schedule
1.  **Setup**: Install `pixi.js`, `pixi-live2d-display`, `monaco-editor`.
2.  **Engine**: Implement `Live2DManager` & `Live2DLayer`.
3.  **Actor**: Update `CharacterActor` with Live2D logic.
4.  **Playground**: Build UI with **Grouped Parameter Inspector** and Script Runner.

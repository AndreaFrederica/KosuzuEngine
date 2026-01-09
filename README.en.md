<p align="center">
  <img src="logo.png" alt="KosuzuEngine Logo" width="20%" />
</p>

<h1 align="center">KosuzuEngine</h1>

<div align="center">

⚠️ **This project is in early development stage. API and architecture may undergo significant changes.**

</div>

KosuzuEngine is a visual novel engine prototype built with Quasar + Vue3, focused on providing a high-quality framework for visual novel game development. Using modern frontend technology stacks combined with visual novel-specific performance requirements, this engine implements a complete stage layer system, dialogue advancement mechanism, history viewing, time travel (rewind) system, and save/load functionality.

## Links

- [Live Demo](https://kosuzuenginedemo.sirrus.cc/)
- [Project Wiki](https://wiki.sirrus.cc/KosuzuEngine/)
- [中文版本](README.md)

## Tech Stack

- **Frontend Framework**: Vue 3 + TypeScript
- **UI Component Library**: Quasar Framework
- **State Management**: Pinia
- **Build Tool**: Vite
- **Internationalization**: vue-i18n
- **HTTP Client**: Axios
- **Deployment Platform**: Cloudflare Workers

## Core Architecture

The engine follows a modular design with the following core modules:

- **Engine Core**: Manages game runtime context, state persistence, action execution, and playback
- **Render System**: Provides stage rendering, character layer management, dialogue box system, and UI components
- **Audio System**: Supports BGM, SE, and character voice independent management and control
- **I18n System**: Complete localization support including text translation and voice file management
- **Game Logic**: Script scene management, character system, resource loading and management

### Engine Core Modules

| Module           | Responsibility                                                                     |
| ---------------- | ---------------------------------------------------------------------------------- |
| EngineContext.ts | Game context state management, coordinating data flow between systems              |
| Runtime.ts       | Runtime engine, handling action execution, snapshot generation, and state rollback |
| Persistence.ts   | Data persistence, managing save/load serialization and storage                     |
| ActorAction.ts   | Character action definition, supporting complex action sequences                   |
| BaseActor.ts     | Character base class, defining basic attributes and behavior interfaces            |
| bindings.ts      | Action binding system, mapping script commands to engine operations                |

### Render Component Modules

| Component              | Function                                                                       |
| ---------------------- | ------------------------------------------------------------------------------ |
| StageView.vue          | Main stage view, managing layer rendering and character display                |
| DialogBox.vue          | Dialogue box component, supporting typewriter effects and interactive controls |
| HistoryPanel.vue       | History panel for viewing completed dialogues                                  |
| SaveLoadPanel.vue      | Save/Load interface for managing game progress                                 |
| ChoicePanel.vue        | Choice panel for multi-branch story options                                    |
| LayerManager.ts        | Layer manager controlling rendering order                                      |
| AudioManager.ts        | Audio master controller coordinating BGM, SE, and voice playback               |
| BGMControl.vue         | Background music control panel                                                 |
| AudioChannelsPanel.vue | Audio channel monitoring panel                                                 |

## Feature Overview

- **Stage Coordinate System**: Origin at bottom-left, x right, y up; characters aligned by center point
- **Layer System**: Characters can override UI via transform.layer (overlay.layer defaults to 100)
- **Dialogue Advancement**: say/advance commands, supports hiding text bar, click stage to restore
- **History & Rewind**: Records dialogue history; rewind supports last 10 frame snapshots with quick action reconstruction
- **Save/Load**: Context snapshots to local storage; displays script name and dialogue preview
- **Debug & Context Viewing**: Available via tool button at bottom-right

## Directory Structure

```
KosuzuEngine/
├── public/                 # Static assets
│   ├── assets/            # Asset directory
│   │   ├── audio/bgm/     # Background music
│   │   ├── audio/se/      # Sound effects
│   │   ├── bg/            # Background images
│   │   ├── characters/    # Character sprites
│   │   ├── live2d/        # Live2D models
│   │   └── ui/            # UI materials
│   └── icons/             # Icons
├── src/
│   ├── engine/            # Engine core
│   │   ├── core/         # Core system (context, runtime, persistence)
│   │   ├── render/       # Render components (dialogue, stage, save, etc.)
│   │   ├── i18n/         # Internationalization & voice
│   │   └── debug/        # Debug tools
│   ├── game/              # Game logic
│   │   ├── scenes/       # Script scenes
│   │   └── ui/           # Game UI
│   ├── pages/             # Page components
│   ├── layouts/           # Layout components
│   ├── components/        # Common components
│   ├── stores/            # Pinia state management
│   ├── router/            # Router configuration
│   └── i18n/              # Global internationalization
└── Config files
```

## Development & Running

```bash
npm install
npm run dev
# Open browser and visit http://localhost:9000/
```

## Interaction Guide

- **Text Bar Hide/Restore**: Click "Hide" to hide the text bar, click anywhere on stage to restore
- **History & Rewind**: Open "History" panel, click "Rewind" to return to previous dialogue; stage state rolls back consistently
- **Save/Load**:
  - Save: Click "Save", enter name or use default "scriptname_timestamp"
  - Load: Click "Load", select from list or enter name to load
  - List items display script name and truncated dialogue preview (truncated with ... if too long)

## Routing & Layout

- Default route points to Demo page
- Sidebar collapsed by default; toggle via menu button in top-left corner

## Notes

- Rewind snapshot limit is 10 frames; earlier states reconstructed quickly via action log
- Save data stored in browser localStorage, key format `save:<slot>`

## License

KosuzuEngine is licensed under the MPL-2.0 license. For details, please refer to [LICENSE](./LICENSE).

- You may embed the engine in your project, but you are required to open-source any modified engine code and retain the KosuzuEngine attribution
- Any game content you develop using KosuzuEngine belongs to you; KosuzuEngine does not claim any rights over your game content
- Any game content you develop using KosuzuEngine must not violate local laws and regulations
- Any game content located in the games directory is considered as developed using KosuzuEngine
- Any use of the KosuzuEngine through dynamic loading or similar methods is considered as developing game content using KosuzuEngine
- We recommend prominently indicating "This game is developed using KosuzuEngine" in your game
- If you have any questions about the license, please contact the author

## Contributing

We welcome any form of contribution! Whether it's code, documentation, testing, or feedback, your participation will help us improve KosuzuEngine.

- Submit [GitHub Issues](https://github.com/AndreaFrederica/KosuzuEngine/issues) to report bugs or request features
- Submit [Pull Requests](https://github.com/AndreaFrederica/KosuzuEngine/pulls) to contribute code
- Participate in discussions, currently available through joining the ANH (Andrea Novel Helper) QQ group (977737943)
- Write and improve documentation
- Test new features and provide feedback
- Share your experiences and projects
- Help other users solve problems
- Translate documentation
- Promote KosuzuEngine
- Donate to support project development
- Write tutorials and example projects
- Design icons and interfaces

## Possible Future Features

- Visual script editor
- More built-in UI components
- Plugin system
- Support for other scripting languages

# LinguaPlay UI Layout Contract

The application UI must always follow this hierarchy.

APP ROOT
│
├── VIDEO SURFACE
│     ├ video element
│     ├ subtitle overlay
│     ├ focus modal
│
├── CONTROL BAR
│     ├ load content
│     ├ load subtitles
│     ├ view mode
│     ├ playback speed
│     ├ developer mode toggle
│
└── WORKSPACE
      ├ TRANSCRIPT PANEL
      └ STUDY PANEL

## VIDEO SURFACE

Responsibilities:
• display primary content
• video / audio / text in future
• subtitle overlay rendering
• focus modal display

Constraints:
• must always remain at the top of the application
• must never be pushed off-screen by other UI elements

## CONTROL BAR

Responsibilities:
• application controls
• content loading
• mode switching

Constraints:
• always directly below VIDEO SURFACE
• must never move inside settings drawers
• must always remain visible

## WORKSPACE

Workspace contains two panels.

### Transcript Panel

Responsibilities:
• subtitle transcript
• clickable rows
• navigation through dialogue

### Study Panel

Responsibilities:
• word analysis
• translation display
• pronunciation tools
• example sentences

Constraints:
• must always remain visible in INTENSIVE MODE
• must scroll independently
• must not push transcript off-screen

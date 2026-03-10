# Live2D Models

Place your Live2D model files here.

## Supported Format

Live2D Cubism 4.x (.moc3 + .json)

## Quick Start - Download Sample Model

Download the Shizuku model from GitHub releases:

```bash
# Option 1: Using curl (may not work due to network issues)
curl -L -o src/models/shizuku.zip "https://github.com/guansss/pixi-live2d/releases/download/v0.6.0/shizuku.zip"
unzip src/models/shizuku.zip -d src/models/
mv src/models/shizuku/* src/models/
rm -rf src/models/shizuku src/models/shizuku.zip

# Option 2: Manual download
# 1. Go to https://github.com/guansss/pixi-live2d/releases
# 2. Download shizuku.zip
# 3. Extract to src/models/ and rename folder to model files
```

## Directory Structure

After adding the model:

```
src/models/
├── model.json          # Model definition file (required)
├── shizuku.model.json  # or other model files
├── shizuku.1024/
│   ├── shizuku.moc3    # Model data
│   ├── shizuku.2048    # Texture
│   └── shizuku_01.png  # Textures
└── expressions/        # Expression files (optional)
    ├── happy.exp3.json
    └── sad.exp3.json
```

## Testing

After adding the model, run:
```bash
npm run tauri dev
```

If no model is found, the app will show "Click to chat" placeholder instead.

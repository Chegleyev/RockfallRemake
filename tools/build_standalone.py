#!/usr/bin/env python3
"""
Rockfall Standalone HTML Packager
Bundles HTML, CSS, WebGL Shaders, Procedural Sprites, Synthesizer Audio,
all 28 Levels, and Physics Engine into a single self-contained offline HTML file.
"""

import os
import re
import json

def build():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root_dir)

    print("Bundling Rockfall into a single standalone HTML...")

    # 1. Read index.html
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    # 2. Read style.css
    with open("style.css", "r", encoding="utf-8") as f:
        css = f.read()

    # 3. Read JSON data assets
    with open("assets/levels.json", "r", encoding="utf-8") as f:
        levels_data = json.load(f)
    with open("assets/sprites.json", "r", encoding="utf-8") as f:
        sprites_data = json.load(f)

    # 4. JS Files in dependency order
    js_files = [
        "src/engine/types.js",
        "src/audio/sound.js",
        "src/renderer/shaders.js",
        "src/renderer/classic_sprites.js",
        "src/renderer/modern_sprites.js",
        "src/engine/physics.js",
        "src/engine/game.js",
        "src/renderer/webgl.js",
        "src/renderer/canvas2d.js",
        "src/engine/storage.js",
        "src/ui/hud.js",
        "src/main.js",
    ]

    combined_js = []
    # Add embedded data constants
    combined_js.append(f"const LEVELS_DATA = {json.dumps(levels_data, separators=(',', ':'))};")
    combined_js.append(f"const SPRITES_DATA = {json.dumps(sprites_data, separators=(',', ':'))};")

    for filepath in js_files:
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()

        if filepath == "src/main.js":
            # Replace fetch block with direct reference to embedded constants
            code = re.sub(
                r"const \[levelsRes, spritesRes\] = await Promise\.all\(\[.*?\]\);\s*const levelsData = await levelsRes\.json\(\);\s*const spritesData = await spritesRes\.json\(\);",
                "const levelsData = LEVELS_DATA;\n  const spritesData = SPRITES_DATA;",
                code,
                flags=re.DOTALL
            )
            # Ensure robust bootstrapping whether DOMContentLoaded has fired or not
            code = re.sub(
                r"window\.addEventListener\('DOMContentLoaded'[\s\S]*$",
                """if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    bootstrap().catch((err) => console.error('[Rockfall] Error starting game:', err));
  });
} else {
  bootstrap().catch((err) => console.error('[Rockfall] Error starting game:', err));
}
""",
                code
            )

        # Remove ES module import statements
        code = re.sub(r"^\s*import\s+.*?;\s*$", "", code, flags=re.MULTILINE)
        # Remove export keywords
        code = re.sub(r"\bexport\s+(default\s+)?", "", code)

        combined_js.append(f"// =================== {filepath} ===================\n" + code.strip())

    bundled_js_content = "\n\n".join(combined_js)

    # 5. Inject CSS into HTML
    style_tag = f"<style>\n{css}\n</style>"
    html = re.sub(r'<link\s+rel="stylesheet"\s+href="style\.css">', style_tag, html)

    # 6. Inject bundled JS into HTML replacing the script tag
    script_tag = f"<script>\n{bundled_js_content}\n</script>"
    html = re.sub(r'<script\s+type="module"\s+src="src/main\.js(?:\?.*?)?"></script>', script_tag, html)

    # 7. Write output files
    output_path = "rockfall_standalone.html"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    os.makedirs("dist", exist_ok=True)
    dist_path = os.path.join("dist", "rockfall.html")
    with open(dist_path, "w", encoding="utf-8") as f:
        f.write(html)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Successfully created standalone HTML distribution:")
    print(f"  -> {output_path} ({size_kb:.1f} KB)")
    print(f"  -> {dist_path} ({size_kb:.1f} KB)")
    print("Zero external runtime dependencies. Works offline and directly via file:// protocol!")

if __name__ == "__main__":
    build()

#!/usr/bin/env python3
"""
Rockfall (ZX Spectrum, 1985/1989 Ian Collier) SCL Extractor
Extracts RAM snapshot, all 28 original levels, and all 32 16x16 sprites.
"""

import os
import json

def unpack():
    scl_path = "ROCKFLDK.SCL"
    with open(scl_path, "rb") as f:
        data = f.read()

    # In SCL format, 1 file: ROCKFALL.B (157 sectors = 40192 bytes)
    file_data = data[23:40215]

    # Reconstruct 64KB Spectrum RAM
    ram = bytearray(65536)

    # Bootloader loads segments:
    # Sectors 12..138 (127 sectors) -> 0x61A8
    ram[0x61A8 : 0x61A8 + 127*256] = file_data[12*256 : 139*256]
    # Sectors 139..148 (10 sectors) -> 0xE0A8
    ram[0xE0A8 : 0xE0A8 + 10*256] = file_data[139*256 : 149*256]
    # Sectors 149..156 (8 sectors) -> 0x4802
    ram[0x4802 : 0x4802 + 8*256] = file_data[149*256 : 157*256]

    # Bootloader relocates packed buffer before depacking:
    # LD HL, 0x620C; LD DE, 0x61A8; LD BC, 0x9DF4; LDIR
    ram[0x61A8 : 0x61A8 + 0x9DF4] = ram[0x620C : 0x620C + 0x9DF4]

    # Execute original Z80 RLE depacker (located at 0x5B8C)
    hl = 0xD86F
    de = 0xFFFF
    stop_hl = 0x61A7

    while hl != stop_hl:
        b = ram[hl]
        if b != 0xE2:
            ram[de] = ram[hl]
            de = (de - 1) & 0xFFFF
            hl = (hl - 1) & 0xFFFF
        else:
            hl = (hl - 1) & 0xFFFF
            a = ram[hl]
            if a != 0x00:
                hl = (hl + 1) & 0xFFFF
                ram[de] = ram[hl]
                de = (de - 1) & 0xFFFF
                hl = (hl - 1) & 0xFFFF
            else:
                hl = (hl - 1) & 0xFFFF
                count_b = ram[hl]
                bit7 = (count_b & 0x80) != 0
                count = 256 if (count_b & 0x7F) == 0 else (count_b & 0x7F)
                val = 0x00
                if not bit7:
                    hl = (hl - 1) & 0xFFFF
                    val = ram[hl]
                for _ in range(count):
                    ram[de] = val
                    de = (de - 1) & 0xFFFF
                hl = (hl - 1) & 0xFFFF

    # Copy BASIC and system variables from 0x4802 to 0x5B00
    ram[0x5B00 : 0x5B00 + 0x06A9] = ram[0x4802 : 0x4802 + 0x06A9]

    with open("rockfall_unpacked_ram.bin", "wb") as f:
        f.write(ram)
    print("Unpacked RAM written to rockfall_unpacked_ram.bin (65536 bytes)")

    # 1. Extract Sprites (0x6A00) and Attributes (0x6DE0)
    sprites = []
    color_names = ["Black", "Blue", "Red", "Magenta", "Green", "Cyan", "Yellow", "White"]
    
    for t in range(32):
        addr = 0x6A00 + t * 32
        tl = [ram[addr + i] for i in range(8)]
        tr = [ram[addr + 8 + i] for i in range(8)]
        bl = [ram[addr + 16 + i] for i in range(8)]
        br = [ram[addr + 24 + i] for i in range(8)]

        bitmap = []
        for y in range(8):
            row = []
            for bit in range(7, -1, -1):
                row.append((tl[y] >> bit) & 1)
            for bit in range(7, -1, -1):
                row.append((tr[y] >> bit) & 1)
            bitmap.append(row)
        for y in range(8):
            row = []
            for bit in range(7, -1, -1):
                row.append((bl[y] >> bit) & 1)
            for bit in range(7, -1, -1):
                row.append((br[y] >> bit) & 1)
            bitmap.append(row)

        # Attribute at 0x6DE0 + t
        attr = ram[0x6DE0 + t]
        flash = (attr >> 7) & 1
        bright = (attr >> 6) & 1
        paper = (attr >> 3) & 7
        ink = attr & 7

        sprites.append({
            "tile_id": t,
            "bitmap": bitmap,
            "ink": color_names[ink],
            "paper": color_names[paper],
            "bright": bool(bright),
            "flash": bool(flash)
        })

    os.makedirs("assets", exist_ok=True)
    with open("assets/sprites.json", "w") as f:
        json.dump(sprites, f, indent=2)
    print("Extracted 32 sprites to assets/sprites.json")

    # 2. Extract All 28 Levels (0x7600..0xE200, 1024 bytes each, 64x32 tiles)
    def convert_tile_z80(val, e_reg):
        a = val & 0x0F
        carry = (a < 7)
        a = (a - 7 + 1) & 0xFF
        if not carry:
            a = (a * 4) & 0xFF
            if a < 0x10:
                a = ((a ^ e_reg) & 0xFC) ^ e_reg
            elif a < 0x14:
                pass
            elif a == 0x14:
                a = (a - 2) & 0xFF
            else:
                a = (a - 4) & 0xFF
                a = ((a ^ e_reg) & 0xFC) ^ e_reg
        return (a + 0x06) & 0xFF

    levels = []
    # Exact Z80 code at 0xEC55..0xEC60:
    # LD HL, 0xED7E; ADD HL, BC; LD A, (HL); LD (0x5B85), A
    # The authentic table of required jewels for all 28 levels is located at 0xED7E in RAM:
    target_jewels = [ram[0xED7E + i] for i in range(28)]

    for l in range(28):
        base = 0x7600 + l * 0x400
        map_tiles = []
        de = 0
        for i in range(1024):
            b = ram[base + i]
            t1 = convert_tile_z80((b >> 4) & 0x0F, de & 0xFF)
            map_tiles.append(t1)
            de += 1
            t2 = convert_tile_z80(b & 0x0F, de & 0xFF)
            map_tiles.append(t2)
            de += 1

        # Format into 32 rows of 64 columns
        grid = []
        for r in range(32):
            grid.append(map_tiles[r * 64 : (r + 1) * 64])

        levels.append({
            "level": l,
            "name": f"Level {l + 1}",
            "width": 64,
            "height": 32,
            "jewels_required": target_jewels[l] if l < len(target_jewels) else 20,
            "grid": grid
        })

    with open("assets/levels.json", "w") as f:
        json.dump(levels, f, indent=2)
    print("Extracted 28 levels to assets/levels.json")

if __name__ == "__main__":
    unpack()

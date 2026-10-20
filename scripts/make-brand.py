"""Build extension icons from the user's artwork, store/brand/icon-artwork.jpg (2026-10-20).

Large sizes keep the whole rounded tile; 16 and 32 px crop closer to the crystal so it stays legible.
The promo tile is rendered from store/brand/promo-tile.html by `npm run screenshots`.
Run: python3 scripts/make-brand.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'store/brand/icon-artwork.jpg'
OUT = ROOT / 'public/icon'

# Rounded tile measured in the 1408x768 artwork.
TILE = (428, 101, 980, 665)
RADIUS = 105


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.size[0] - 1, img.size[1] - 1), radius, fill=255)
    img = img.convert('RGBA')
    img.putalpha(mask)
    return img


def squared(img: Image.Image) -> Image.Image:
    side = max(img.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.size[0]) // 2, (side - img.size[1]) // 2), img)
    return canvas


def main() -> None:
    art = Image.open(SOURCE).convert('RGB')
    tile = squared(rounded(art.crop(TILE), RADIUS))
    # Inner crop: drop the frame, keep the crystal and its glow.
    x0, y0, x1, y1 = TILE
    inset = 0.14
    w, h = x1 - x0, y1 - y0
    inner_box = (round(x0 + w * inset), round(y0 + h * inset), round(x1 - w * inset), round(y1 - h * inset))
    inner = squared(rounded(art.crop(inner_box), round(RADIUS * (1 - 2 * inset) * 0.8)))

    OUT.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 96, 128):
        source = inner if size <= 32 else tile
        source.resize((size, size), Image.LANCZOS).save(OUT / f'{size}.png', optimize=True)
    tile.resize((512, 512), Image.LANCZOS).save(ROOT / 'store/brand/icon-512.png', optimize=True)
    print('icons written to', OUT)



if __name__ == '__main__':
    main()

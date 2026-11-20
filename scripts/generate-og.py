#!/usr/bin/env python3
"""Generate flat branded Open Graph PNGs and icon PNGs. Pillow is installed in CI."""

import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OG = ROOT / "public" / "og"
OG.mkdir(parents=True, exist_ok=True)

STONE = (36, 30, 24)
BRONZE = (165, 107, 69)
CREAM = (244, 239, 230)
INK = (28, 22, 18)
MUTED = (210, 196, 180)

SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF_ITAL = "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(draw, text, face, max_width):
    lines, current = [], ""
    for word in text.split():
        trial = word if not current else f"{current} {word}"
        if draw.textlength(trial, font=face) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def card(title, kicker, dest):
    image = Image.new("RGB", (1200, 630), STONE)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 18, 630), fill=BRONZE)
    draw.rectangle((0, 0, 1200, 8), fill=CREAM)
    draw.rectangle((72, 64, 156, 148), outline=CREAM, width=3)
    word = font(SERIF, 36)
    draw.text((86, 86), "IA", font=word, fill=CREAM)

    name = font(SERIF, 42)
    italic = font(SERIF_ITAL, 42)
    draw.text((180, 72), "Intelligentia", font=name, fill=CREAM)
    draw.text((180, 118), "Antiqua", font=italic, fill=(226, 195, 154))

    kicker_font = font(SANS_BOLD, 24)
    draw.text((72, 210), kicker.upper(), font=kicker_font, fill=BRONZE)

    title_font = font(SERIF, 54)
    y = 268
    for line in wrap(draw, title, title_font, 1040)[:4]:
        draw.text((72, y), line, font=title_font, fill=CREAM)
        y += 66

    small = font(SANS, 26)
    draw.text((72, 560), "intelligentiaantiqua.com", font=small, fill=MUTED)
    note = "Not professional advice"
    note_w = draw.textlength(note, font=small)
    draw.text((1128 - note_w, 560), note, font=small, fill=MUTED)
    image.save(dest, optimize=True)
    print(dest.name, dest.stat().st_size)


def mark(size, dest):
    image = Image.new("RGB", (size, size), STONE)
    draw = ImageDraw.Draw(image)
    pad = max(2, size // 16)
    draw.rectangle((pad, pad, size - pad, size - pad), outline=CREAM, width=max(2, size // 24))
    face = font(SERIF, int(size * 0.38))
    text = "IA"
    box = draw.textbbox((0, 0), text, font=face)
    width = box[2] - box[0]
    height = box[3] - box[1]
    draw.text(((size - width) / 2, (size - height) / 2 - size * 0.06), text, font=face, fill=CREAM)
    image.save(dest, optimize=True)
    print(dest.name, dest.stat().st_size)


PILLARS = {
    "ai-basics": "AI basics",
    "using-assistants": "Using assistants",
    "privacy-and-data": "Privacy and data",
    "scams-and-deepfakes": "Scams and deepfakes",
    "work-and-money": "Work and money",
    "safety-debates": "Safety debates",
}


def articles():
    folder = ROOT / "src/content/articles"
    found = []
    for path in sorted(folder.glob("*.md*")):
        text = path.read_text(encoding="utf-8")
        if re.search(r"(?m)^draft:\s*true\s*$", text):
            continue
        title = re.search(r'(?m)^title:\s*"(.*)"\s*$', text)
        slug = re.search(r"(?m)^slug:\s*([A-Za-z0-9-]+)\s*$", text)
        pillar = re.search(r"(?m)^pillar:\s*([A-Za-z0-9-]+)\s*$", text)
        if not title or not slug:
            continue
        clean = title.group(1).replace("\u2011", "-")
        label = PILLARS.get(pillar.group(1) if pillar else "", "Guide")
        found.append((clean, slug.group(1), label))
    return found


def main():
    card("AI, without the pitch.", "Plain English. Source attached.", OG / "default.png")
    for title, slug, pillar in articles():
        card(title, pillar, OG / f"{slug}.png")
    public = ROOT / "public"
    mark(512, public / "logo.png")
    mark(180, public / "apple-touch-icon.png")
    mark(32, public / "favicon-32.png")


if __name__ == "__main__":
    main()

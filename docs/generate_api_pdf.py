from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent
MD_PATH = ROOT / "backend-api.md"
PDF_PATH = ROOT / "backend-api.pdf"


def register_korean_font() -> str:
    candidates = [
        Path("C:/Windows/Fonts/malgun.ttf"),
        Path("C:/Windows/Fonts/NanumGothic.ttf"),
    ]
    for p in candidates:
        if p.exists():
            pdfmetrics.registerFont(TTFont("DocFont", str(p)))
            return "DocFont"
    return "Helvetica"


def draw_markdown_to_pdf(markdown_text: str, out_path: Path) -> None:
    font_name = register_korean_font()
    c = canvas.Canvas(str(out_path), pagesize=A4)

    page_w, page_h = A4
    left = 18 * mm
    right = page_w - 18 * mm
    y = page_h - 18 * mm

    def new_page():
        nonlocal y
        c.showPage()
        c.setFont(font_name, 10)
        y = page_h - 18 * mm

    def write_line(text: str, size: int = 10, indent: float = 0, leading: float = 6.0):
        nonlocal y
        if y < 18 * mm:
            new_page()
        c.setFont(font_name, size)
        c.drawString(left + indent, y, text)
        y -= (size + leading)

    def wrap_and_write(text: str, size: int = 10, indent: float = 0):
        nonlocal y
        c.setFont(font_name, size)
        max_width = right - (left + indent)
        words = text.split(" ")
        line = ""
        for w in words:
            candidate = (line + " " + w).strip()
            if c.stringWidth(candidate, font_name, size) <= max_width:
                line = candidate
            else:
                write_line(line, size=size, indent=indent, leading=5.5)
                line = w
        if line:
            write_line(line, size=size, indent=indent, leading=5.5)

    for raw in markdown_text.splitlines():
        line = raw.rstrip()
        if not line:
            y -= 5
            continue

        if line.startswith("# "):
            write_line(line[2:], size=18, leading=8)
            y -= 3
            continue
        if line.startswith("## "):
            write_line(line[3:], size=14, leading=7)
            y -= 2
            continue
        if line.startswith("### "):
            write_line(line[4:], size=12, leading=6)
            continue

        if line.startswith("- "):
            wrap_and_write(f"• {line[2:]}", size=10, indent=4)
            continue

        wrap_and_write(line, size=10, indent=0)

    c.save()


if __name__ == "__main__":
    md = MD_PATH.read_text(encoding="utf-8")
    draw_markdown_to_pdf(md, PDF_PATH)
    print(f"Generated: {PDF_PATH}")


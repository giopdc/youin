import argparse
from html.parser import HTMLParser
from urllib.request import urlopen
from urllib.parse import urlsplit

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = {}

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "meta" and values.get("property"):
            self.tags[values["property"]] = (values.get("content") or "").strip()

def main():
    parser = argparse.ArgumentParser(description="Comprueba la vista previa pública de una fiesta.")
    parser.add_argument("url")
    url = parser.parse_args().url
    if urlsplit(url).scheme not in ("http", "https"):
        parser.error("Introduce una URL http o https")
    metadata = Metadata()
    try:
        with urlopen(url, timeout=15) as page:
            metadata.feed(page.read().decode(page.headers.get_content_charset() or "utf-8", errors="replace"))
    except OSError as error:
        parser.exit(2, f"No se pudo abrir la ficha: {error}\n")
    missing = [key for key in ("og:title", "og:description", "og:url") if not metadata.tags.get(key)]
    for key in ("og:title", "og:description", "og:url", "og:image"):
        print(key, metadata.tags.get(key, "(ausente)"))
    if missing:
        parser.exit(1, "Falta completar: " + ", ".join(missing) + "\n")

if __name__ == "__main__":
    main()

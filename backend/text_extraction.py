import io

from docx import Document
from pypdf import PdfReader

SUPPORTED_EXTENSIONS = {"txt", "pdf", "docx"}


def extract_text(filename: str, content: bytes) -> str:
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "txt":
        return content.decode("utf-8", errors="ignore")

    if ext == "pdf":
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if ext == "docx":
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    raise ValueError(
        f"Unsupported file type '.{ext}'. Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
    )

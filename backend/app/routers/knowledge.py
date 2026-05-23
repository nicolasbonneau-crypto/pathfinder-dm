from __future__ import annotations
import uuid
import shutil
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.knowledge import Book
from app.schemas.knowledge import BookOut, ChatRequest, ChatResponse
from app.services import rag_service
from app.config import settings

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/books", response_model=list[BookOut])
def list_books(db: Session = Depends(get_db)):
    return db.query(Book).order_by(Book.indexed_at.desc()).all()


@router.post("/books", response_model=BookOut, status_code=201)
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    book_id = str(uuid.uuid4())
    dest = Path(settings.upload_dir) / f"{book_id}.pdf"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    title = Path(file.filename).stem.replace("_", " ").replace("-", " ").title()
    book = Book(id=book_id, filename=file.filename, title=title, page_count=0)
    db.add(book)
    db.commit()
    db.refresh(book)

    background_tasks.add_task(_index_book, book_id, dest, db)
    return book


def _index_book(book_id: str, pdf_path: Path, db: Session) -> None:
    try:
        page_count = rag_service.index_pdf(pdf_path, book_id)
        book = db.query(Book).filter(Book.id == book_id).first()
        if book:
            book.page_count = page_count
            db.commit()
    except Exception as e:
        db.query(Book).filter(Book.id == book_id).delete()
        db.commit()
        pdf_path.unlink(missing_ok=True)
        raise


@router.delete("/books/{book_id}", status_code=204)
def delete_book(book_id: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    rag_service.delete_book_chunks(book_id)
    pdf_path = Path(settings.upload_dir) / f"{book_id}.pdf"
    pdf_path.unlink(missing_ok=True)
    db.delete(book)
    db.commit()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    books_exist = db.query(Book).count() > 0
    if not books_exist:
        raise HTTPException(status_code=422, detail="No books indexed. Upload a PDF first.")

    answer, sources, has_context = rag_service.query_rag(request.message, request.history)
    return ChatResponse(answer=answer, sources=sources, has_context=has_context)

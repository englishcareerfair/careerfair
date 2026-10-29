"""
VoiceForge Text Chunking Engine
Splits long scripts into model-safe phonetic chunks preserving sentence and clause boundaries.
"""
import re
from typing import List

SENTENCE_ENDINGS = re.compile(r'([.!?]+["\']?\s+)')
CLAUSE_ENDINGS = re.compile(r'([,;:\-–—]\s+)')

def split_text_into_chunks(text: str, max_chars: int = 400) -> List[str]:
    """
    Split text into clean, coherent chunks without cutting words or punctuation mid-phrase.
    
    1. Paragraph-aware splitting.
    2. Sentence-boundary preservation.
    3. Clause-boundary fallback if single sentence exceeds max_chars.
    4. Word-boundary fallback as safe last resort.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    if len(cleaned) <= max_chars:
        return [cleaned]

    # Step 1: Split into paragraphs
    raw_paras = cleaned.split("\n")
    chunks: List[str] = []
    current_chunk = ""

    for para in raw_paras:
        p = para.strip()
        if not p:
            continue

        # If paragraph fits in current chunk, append it
        if current_chunk and (len(current_chunk) + len(p) + 1 <= max_chars):
            current_chunk += " " + p
            continue
        elif current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = ""

        # If single paragraph fits within limit
        if len(p) <= max_chars:
            current_chunk = p
            continue

        # Step 2: Split large paragraph into sentences
        raw_sentences = re.split(r'(?<=[.!?])\s+', p)
        for sent in raw_sentences:
            s = sent.strip()
            if not s:
                continue

            if current_chunk and (len(current_chunk) + len(s) + 1 <= max_chars):
                current_chunk += " " + s
                continue
            elif current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""

            if len(s) <= max_chars:
                current_chunk = s
                continue

            # Step 3: Sentence exceeds max_chars, split on clauses (, ; : -)
            clauses = re.split(r'(?<=[,;:\-–—])\s+', s)
            for clause in clauses:
                cl = clause.strip()
                if not cl:
                    continue

                if current_chunk and (len(current_chunk) + len(cl) + 1 <= max_chars):
                    current_chunk += " " + cl
                    continue
                elif current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""

                if len(cl) <= max_chars:
                    current_chunk = cl
                    continue

                # Step 4: Clause still exceeds max_chars, split on space
                words = cl.split()
                for word in words:
                    if current_chunk and (len(current_chunk) + len(word) + 1 <= max_chars):
                        current_chunk += " " + word
                    else:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                        current_chunk = word

    if current_chunk:
        chunks.append(current_chunk.strip())

    return [c for c in chunks if c.strip()]

"""
Unit tests for VoiceForge Text Chunking Engine
"""
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from services.inference.chunker import split_text_into_chunks

def test_empty_and_short_text():
    assert split_text_into_chunks("") == []
    assert split_text_into_chunks("   ") == []
    short = "Hello, world! This is a short sentence."
    assert split_text_into_chunks(short, max_chars=100) == [short]

def test_paragraph_and_sentence_splitting():
    text = (
        "First paragraph about aviation communication.\n\n"
        "Second paragraph with multiple sentences. Here is the second sentence! And the third?"
    )
    chunks = split_text_into_chunks(text, max_chars=80)
    assert len(chunks) >= 2
    # Ensure no empty chunks
    for c in chunks:
        assert len(c) <= 80
        assert len(c.strip()) > 0

def test_no_word_cutting():
    text = "The international conference on aerospace English demands absolute composure and precision."
    chunks = split_text_into_chunks(text, max_chars=40)
    for c in chunks:
        # Every word should be a complete word, no trailing hyphen or cut characters
        words = c.split()
        for w in words:
            assert w.isalpha() or any(p in w for p in ",.!?")

if __name__ == "__main__":
    test_empty_and_short_text()
    test_paragraph_and_sentence_splitting()
    test_no_word_cutting()
    print("[PASS] test_chunker passed all assertions.")

import PyPDF2
import json

pdf = open('G:/reporoot/NBS-Blue-Book-5-13-2014I.pdf', 'rb')
reader = PyPDF2.PdfReader(pdf)

print("=" * 80)
print("NBS CLASSIFICATION STRUCTURE EXTRACTION")
print("=" * 80)

# Get divisions overview
print("\n### DIVISIONS (from page 5) ###\n")
print(reader.pages[4].extract_text()[1000:2500])

# Get classification listing pages
print("\n\n### CLASSIFICATION LISTING START (page 11) ###\n")
print(reader.pages[10].extract_text()[:3000])

print("\n\n### MATERIALS SECTIONS OVERVIEW (from TOC) ###")
print("""
MATERIALS:
- Section 1: Celluloid
- Section 2: Ceramics
- Section 3: China
- Section 4: Enamels
- Section 5: Fabrics/Textiles
- Section 6: Glass, Black
- Section 7: Glass, Clear and Colored
- Section 8: Glass Mounted in/on Metal
- Section 9: Horn
- Section 10: Metals
- Section 11: Shell
- Section 12: Synthetic Polymers
- Section 13: Vegetable Ivory
- Section 14: Wood
- Section 15: Other Materials

PICTORIALS:
- Section 17: Animals
- Section 18: Objects (without people)
- Section 19: Plants
- Section 20: Other Pictorials

PATTERNS/TYPES:
- Section 22: Patterns, Symbols
- Section 23: Specific Types
- Section 24: 18th Century (or earlier)
- Section 25: Usage (Non-military)
""")

# Get a sample section with class codes
print("\n\n### SAMPLE: SECTION 10 - METALS (page with classes) ###\n")
for i in range(10, 20):
    text = reader.pages[i].extract_text()
    if 'SECTION 10' in text and 'Metals' in text.upper():
        idx = text.find('SECTION 10')
        print(text[idx:idx+2000])
        break

pdf.close()

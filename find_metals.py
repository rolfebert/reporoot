import PyPDF2

pdf = open('G:/reporoot/NBS-Blue-Book-5-13-2014I.pdf', 'rb')
reader = PyPDF2.PdfReader(pdf)

print("Searching for Section 10 - Metals...\n")

for i in range(43, 48):
    text = reader.pages[i].extract_text()
    if 'Section 10' in text and 'Metals' in text:
        print(f"=== FOUND ON PAGE {i+1} ===\n")
        idx = text.find('Section 10')
        print(text[idx:idx+3000])
        break

pdf.close()

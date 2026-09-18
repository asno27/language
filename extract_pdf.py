import os
import glob
import PyPDF2

base_dir = r"C:\Users\user\Documents\카카오톡 받은 파일\영어 공부 어플 제작"
pdf_files = glob.glob(os.path.join(base_dir, "*.pdf"))

for pdf_path in pdf_files:
    if "무료" not in pdf_path: # Skip the one I made
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for i in range(len(reader.pages)):
                text += reader.pages[i].extract_text() + "\n---PAGE---\n"
            
            with open("worksheet_text.txt", "w", encoding="utf-8") as out:
                out.write(text)
            print("Extracted to worksheet_text.txt")

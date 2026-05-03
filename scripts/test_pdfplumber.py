import pdfplumber
import pandas as pd

def extract_tables(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        all_data = []
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Clean up newlines in cells
                    cleaned_row = [str(cell).replace('\n', ' ').strip() if cell else '' for cell in row]
                    all_data.append(cleaned_row)
                    
    df = pd.DataFrame(all_data)
    df.to_csv('pdf_test_output.csv', index=False, encoding='utf-8-sig')
    print("Saved to pdf_test_output.csv")

if __name__ == "__main__":
    extract_tables("cs_2024_khgd.pdf")

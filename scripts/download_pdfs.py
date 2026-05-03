import os
import csv
import re
import gdown
import unicodedata

def sanitize_filename(name):
    # Remove accents
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    # Keep only alphanumeric and spaces/dashes
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'[-\s]+', '_', name).strip('_')
    return name.lower()

def download_pdfs():
    os.makedirs('data/raw_pdfs', exist_ok=True)
    
    with open('hcmut_links_2024.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            major = row['major']
            link = row['link']
            
            # Extract ID from link: https://drive.google.com/file/d/1OjLKM0Ys8oKiiiaw5SZoHC1ZBq4ewZJ-/view
            m = re.search(r'/d/([^/]+)', link)
            if not m:
                print(f"Could not extract ID from {link}")
                continue
            
            file_id = m.group(1)
            clean_name = sanitize_filename(major)
            output_path = f"data/raw_pdfs/{clean_name}.pdf"
            
            if os.path.exists(output_path):
                print(f"Skipping {output_path}")
                continue
                
            print(f"Downloading -> {output_path}")
            try:
                gdown.download(id=file_id, output=output_path, quiet=True)
            except Exception as e:
                print(f"Failed to download {output_path}: {e}")

if __name__ == "__main__":
    download_pdfs()

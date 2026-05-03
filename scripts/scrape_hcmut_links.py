from playwright.sync_api import sync_playwright
import csv
import re

def scrape_links():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("Navigating to HCMUT...")
        page.goto("https://hcmut.edu.vn/bai-viet/chuong-trinh-dao-tao-tu-khoa-2019", timeout=60000)
        
        print("Waiting for tables to load...")
        # The content might be loaded dynamically, let's wait a bit
        page.wait_for_timeout(5000)
        
        # Click all accordions to expand them if they exist
        accordions = page.locator(".accordion-button")
        for i in range(accordions.count()):
            try:
                accordions.nth(i).click()
            except:
                pass
                
        page.wait_for_timeout(2000)

        results = []

        # Find all tables
        tables = page.locator("table")
        print(f"Found {tables.count()} tables.")
        
        for i in range(tables.count()):
            table = tables.nth(i)
            rows = table.locator("tr")
            for j in range(rows.count()):
                row = rows.nth(j)
                cells = row.locator("td")
                if cells.count() < 2:
                    continue
                
                # Usually: Ngành | Chương trình đào tạo | Kế hoạch giảng dạy
                # The text might be in the first column or second.
                row_text = row.inner_text().strip()
                if not row_text or "Kế hoạch giảng dạy" in row_text:
                    continue
                    
                links = row.locator("a")
                for k in range(links.count()):
                    link = links.nth(k)
                    href = link.get_attribute("href")
                    text = link.inner_text()
                    
                    if href and "drive.google.com" in href and "2024" in text:
                        # Find the first column's text to get the major name
                        major_name = cells.nth(0).inner_text().strip()
                        if not major_name:
                             major_name = cells.nth(1).inner_text().strip() # Sometimes first column is merged Khoa
                        
                        # We specifically want "Kế hoạch giảng dạy" (usually the last column)
                        # So we check if the link is in the 3rd or 4th column
                        # Let's just grab all 2024 links and their column index
                        parent_td = link.evaluate_handle("node => node.closest('td')")
                        if parent_td:
                            td_idx = parent_td.evaluate("node => Array.from(node.parentNode.children).indexOf(node)")
                            if td_idx >= 2: # Usually column 3 or 4
                                results.append({
                                    "major": major_name.replace('\n', ' '),
                                    "type": "KHGD",
                                    "link": href
                                })

        print(f"Extracted {len(results)} links for KHGD 2024.")
        
        with open("hcmut_links_2024.csv", "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["major", "type", "link"])
            writer.writeheader()
            writer.writerows(results)
            
        print("Saved to hcmut_links_2024.csv")
        browser.close()

if __name__ == "__main__":
    scrape_links()

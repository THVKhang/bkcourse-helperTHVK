"""Check ALL CSV files - rows, semesters, first few subject IDs"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import pandas as pd, os, glob

csvs = sorted(glob.glob('data/parsed_csvs/*.csv'))
print(f"Total CSV files: {len(csvs)}\n")

for f in csvs:
    bn = os.path.basename(f).replace('.csv','')
    df = pd.read_csv(f)
    sems = sorted(df['semester_no'].unique().tolist())
    n_sems = len(sems)
    print(f"  {bn}")
    print(f"    rows={len(df)}, semesters={n_sems} -> {sems}")
    print()

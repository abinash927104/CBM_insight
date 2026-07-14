import pandas as pd
import numpy as np
import sys
import os

AGEING_OUTLIER_THRESHOLD = 25

def process_file(file_path):
    print(f"Processing: {file_path}")
    
    # First pass: detect the actual header row
    df_raw = pd.read_excel(file_path, header=None)

    header_idx = 0
    max_matches = 0
    keywords = ['location', 'date', 'plant', 'status', 'cause', 'notification', 'order', 'section', 'type', 'description']

    for i in range(min(15, len(df_raw))):
        row_vals = [str(x).lower() for x in df_raw.iloc[i].values if pd.notna(x)]
        matches = sum(1 for kw in keywords for val in row_vals if kw in val)
        if matches > max_matches:
            max_matches = matches
            header_idx = i
            
    # Second pass: read with the correct header
    dataset = pd.read_excel(file_path, header=header_idx)

    # Drop completely empty rows
    dataset = dataset.dropna(how='all')

    # Clean up column names (strip whitespace)
    dataset.columns = [str(c).strip() for c in dataset.columns]
    all_cols = list(dataset.columns)

    # Helper: find first column whose name contains any of the keywords
    def find_col(possible_names, exclude_cols=None):
        for col in all_cols:
            col_lower = str(col).lower()
            if exclude_cols and col in exclude_cols:
                continue
            for name in possible_names:
                if name.lower() in col_lower:
                    return col
        return None

    # 1. Location -> Location_Clean
    loc_col = find_col(["location"])
    if not loc_col:
        loc_col = find_col(["area", "dept", "department", "zone", "section"])
    if loc_col:
        dataset["Location_Clean"] = dataset[loc_col].astype(str).str.strip()
        dataset.loc[dataset["Location_Clean"].isin(["nan", "None", ""]), "Location_Clean"] = "Unknown"
    else:
        dataset["Location_Clean"] = "Unknown"

    # 2. Smelter
    smelt_col = find_col(["smelter"])
    if not smelt_col:
        smelt_col = find_col(["planning plant"])
    if not smelt_col:
        for col in all_cols:
            col_lower = str(col).lower()
            if "plant" in col_lower and "section" not in col_lower and "maintenance" not in col_lower:
                smelt_col = col
                break
    if smelt_col:
        dataset["Smelter"] = dataset[smelt_col].astype(str).str.strip()
        dataset.loc[dataset["Smelter"].isin(["nan", "None", ""]), "Smelter"] = "Unknown"
    else:
        dataset["Smelter"] = "Unknown"

    # 3. Status -> StatusLabel
    stat_col = find_col(["status"])
    if not stat_col:
        stat_col = find_col(["notifictn type", "notification type", "type"])
    if stat_col:
        dataset["StatusLabel"] = dataset[stat_col].astype(str).str.strip()
        dataset.loc[dataset["StatusLabel"].isin(["nan", "None", ""]), "StatusLabel"] = "Other"
    else:
        dataset["StatusLabel"] = "Other"

    # 4. Cause -> Cause_Clean
    cause_col = find_col(["cause", "reason", "defect", "fault"])
    if cause_col:
        dataset["Cause_Clean"] = dataset[cause_col].astype(str).str.strip()
        dataset.loc[dataset["Cause_Clean"].isin(["nan", "None", ""]), "Cause_Clean"] = "Unknown"
    else:
        dataset["Cause_Clean"] = "Unknown"

    # 5. Technology / Description
    tech_col = find_col(["technology"])
    desc_col = find_col(["description", "equipment", "asset", "text"])

    if tech_col:
        dataset["Technology"] = dataset[tech_col].astype(str).str.strip()
        dataset.loc[dataset["Technology"].isin(["nan", "None", ""]), "Technology"] = "Unknown"
    elif desc_col:
        def extract_tech(desc):
            desc_upper = str(desc).strip().upper()
            if desc_upper.startswith("VA"): return "Vibration (VA)"
            if desc_upper.startswith("THV"): return "Thermography (THV)"
            if "OIL" in desc_upper[:10]: return "Oil Analysis"
            if "GREASE" in desc_upper[:10]: return "Grease Analysis"
            if "THICKNESS" in desc_upper[:15]: return "Thickness"
            return "Other"
        dataset["Technology"] = dataset[desc_col].apply(extract_tech)
    else:
        dataset["Technology"] = "Unknown"
        
    # 6. Date -> Notif. Date
    date_col = None
    for col in all_cols:
        if "notif" in str(col).lower() and "date" in str(col).lower():
            date_col = col
            break
    if not date_col:
        date_col = find_col(["date", "created", "reported"])
        
    if date_col:
        parsed_dates = pd.to_datetime(dataset[date_col], errors='coerce')
        valid_mask = parsed_dates.notna()
        if valid_mask.sum() > 0:
            dataset["Notif. Date"] = parsed_dates
            median_date = dataset.loc[valid_mask, "Notif. Date"].median()
            dataset["Notif. Date"] = dataset["Notif. Date"].fillna(median_date)
        else:
            dataset["Notif. Date"] = pd.to_datetime("today").normalize()
    else:
        dataset["Notif. Date"] = pd.to_datetime("today").normalize()

    # 7. Ageing
    age_col = find_col(["ageing", "age", "days", "duration"])
    if age_col:
        dataset["Ageing"] = pd.to_numeric(dataset[age_col], errors='coerce').fillna(0)
        dataset["AgeingClean"] = dataset["Ageing"].clip(upper=AGEING_OUTLIER_THRESHOLD)
    else:
        dataset["Ageing"] = 0
        dataset["AgeingClean"] = 0
        
    # Month sort string for easy plotting in Power BI Web
    dataset["Month"] = dataset["Notif. Date"].dt.strftime("%b '%y")

    # Export to CSV
    output_file = "Clean_CBM_Data_For_PowerBI.csv"
    dataset.to_csv(output_file, index=False)
    print(f"Success! Cleaned data saved to {output_file}")

if __name__ == "__main__":
    # If a file is passed as an argument, process it. Otherwise, process the default file.
    default_file = "CN Data Jan'26 to May'26.xlsx"
    if len(sys.argv) > 1:
        process_file(sys.argv[1])
    elif os.path.exists(default_file):
        process_file(default_file)
    else:
        print(f"Error: {default_file} not found. Please provide an excel file as an argument.")

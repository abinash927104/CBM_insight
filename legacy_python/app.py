import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import os

# Set page configuration
st.set_page_config(
    page_title="CBM Insights Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for styling (Premium Enterprise Analytics Look)
st.markdown("""
<style>
    /* Global Background and Typography */
    .stApp {
        background-color: #F8F9FA;
        font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* Header and Title Styling */
    h1, h2, h3, h4, h5, h6 {
        color: #1a202c;
        font-weight: 600;
        letter-spacing: -0.02em;
    }
    
    /* Premium KPI Card */
    .kpi-card {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        padding: 24px;
        border-radius: 12px;
        border: 1px solid rgba(226, 232, 240, 0.8);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.04);
        text-align: left;
        border-top: 4px solid #09609D; /* Vedanta Blue default */
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        margin-bottom: 1rem;
    }
    .kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05), 0 2px 6px rgba(0, 0, 0, 0.04);
    }
    .kpi-title {
        color: #718096;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
        margin-bottom: 8px;
    }
    .kpi-value {
        color: #2D3748;
        font-size: 32px;
        font-weight: 800;
        line-height: 1.2;
    }
    .kpi-subtext {
        font-size: 11px;
        color: #A0AEC0;
        margin-top: 6px;
        font-weight: 500;
    }
    
    /* Tabs Styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 24px;
        background-color: transparent;
    }
    .stTabs [data-baseweb="tab"] {
        padding-top: 16px;
        padding-bottom: 16px;
        color: #718096;
        font-weight: 600;
        font-size: 15px;
    }
    .stTabs [aria-selected="true"] {
        color: #09609D !important;
        border-bottom-color: #09609D !important;
    }
    
    /* Plotly Chart Container overrides */
    .stPlotlyChart {
        background: white;
        border-radius: 12px;
        border: 1px solid rgba(226, 232, 240, 0.8);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        padding: 10px;
    }
</style>
""", unsafe_allow_html=True)

# Corporate Colors
COLOR_RED = "#B71C1C"
COLOR_GOLD = "#D4A017"
COLOR_BLUE = "#09609D"
COLOR_GREEN = "#77BA4A"
COLOR_GREY = "#718096"
COLOR_DARK = "#2D3748"

AGEING_OUTLIER_THRESHOLD = 25

def load_and_process_data(file):
    from io import BytesIO
    try:
        # Read the file into bytes once so we can read it multiple times
        if hasattr(file, 'read'):
            file_bytes = file.read()
        else:
            with open(file, 'rb') as f:
                file_bytes = f.read()

        # First pass: detect the actual header row
        df_raw = pd.read_excel(BytesIO(file_bytes), header=None)
        
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
        df = pd.read_excel(BytesIO(file_bytes), header=header_idx)
        
        # Drop completely empty rows
        df = df.dropna(how='all')
        
        # Clean up column names (strip whitespace)
        df.columns = [str(c).strip() for c in df.columns]
        all_cols = list(df.columns)
        
        # --- Helper: find first column whose name contains any of the keywords ---
        def find_col(possible_names, exclude_cols=None):
            for col in all_cols:
                col_lower = str(col).lower()
                if exclude_cols and col in exclude_cols:
                    continue
                for name in possible_names:
                    if name.lower() in col_lower:
                        return col
            return None
        
        # ============================================================
        # COLUMN MAPPING (based on actual data: Planning Plant, 
        # Notifictn Type, Notif. Date, Location, Main WorkCtr, 
        # Plant Section, Notification, Order, Required Start, 
        # MaintenancePlan, etc.)
        # ============================================================
        
        # 1. Location → Location_Clean
        loc_col = find_col(["location"])
        if not loc_col:
            loc_col = find_col(["area", "dept", "department", "zone", "section"])
        if loc_col:
            df["Location_Clean"] = df[loc_col].astype(str).str.strip()
            df.loc[df["Location_Clean"].isin(["nan", "None", ""]), "Location_Clean"] = "Unknown"
        else:
            df["Location_Clean"] = "Unknown"
        
        # 2. Smelter — look for "smelter" first, then "planning plant", then "plant" (but NOT "plant section")
        smelt_col = find_col(["smelter"])
        if not smelt_col:
            smelt_col = find_col(["planning plant"])
        if not smelt_col:
            # "plant" but exclude columns containing "section" or "maintenance"
            for col in all_cols:
                col_lower = str(col).lower()
                if "plant" in col_lower and "section" not in col_lower and "maintenance" not in col_lower:
                    smelt_col = col
                    break
        if smelt_col:
            df["Smelter"] = df[smelt_col].astype(str).str.strip()
            df.loc[df["Smelter"].isin(["nan", "None", ""]), "Smelter"] = "Unknown"
        else:
            df["Smelter"] = "Unknown"
        
        # 3. Status → StatusLabel — look for columns with "status" or "type"
        stat_col = find_col(["status"])
        if not stat_col:
            stat_col = find_col(["notifictn type", "notification type", "type"])
        if stat_col:
            df["StatusLabel"] = df[stat_col].astype(str).str.strip()
            df.loc[df["StatusLabel"].isin(["nan", "None", ""]), "StatusLabel"] = "Other"
        else:
            df["StatusLabel"] = "Other"
        
        # 4. Cause → Cause_Clean
        cause_col = find_col(["cause", "reason", "defect", "fault"])
        if cause_col:
            df["Cause_Clean"] = df[cause_col].astype(str).str.strip()
            df.loc[df["Cause_Clean"].isin(["nan", "None", ""]), "Cause_Clean"] = "Unknown"
        else:
            df["Cause_Clean"] = "Unknown"
        
        # 5. Technology / Description
        tech_col = find_col(["technology"])
        desc_col = find_col(["description", "equipment", "asset", "text"])
        
        if tech_col:
            df["Technology"] = df[tech_col].astype(str).str.strip()
            df.loc[df["Technology"].isin(["nan", "None", ""]), "Technology"] = "Unknown"
        elif desc_col:
            def extract_tech(desc):
                desc_upper = str(desc).strip().upper()
                if desc_upper.startswith("VA"): return "Vibration (VA)"
                if desc_upper.startswith("THV"): return "Thermography (THV)"
                if "OIL" in desc_upper[:10]: return "Oil Analysis"
                if "GREASE" in desc_upper[:10]: return "Grease Analysis"
                if "THICKNESS" in desc_upper[:15]: return "Thickness"
                return "Other"
            df["Technology"] = df[desc_col].apply(extract_tech)
        else:
            df["Technology"] = "Unknown"
            
        # 6. Date → Notif. Date & MonthSort
        #    Prefer "Notif. Date" or "Notif Date" exactly, then fallback
        date_col = None
        for col in all_cols:
            if "notif" in str(col).lower() and "date" in str(col).lower():
                date_col = col
                break
        if not date_col:
            date_col = find_col(["date", "created", "reported"])
            
        if date_col:
            parsed_dates = pd.to_datetime(df[date_col], errors='coerce')
            valid_mask = parsed_dates.notna()
            # Only proceed if at least some dates parsed
            if valid_mask.sum() > 0:
                df["Notif. Date"] = parsed_dates
                # Fill unparseable dates with the median valid date instead of dropping
                median_date = df.loc[valid_mask, "Notif. Date"].median()
                df["Notif. Date"] = df["Notif. Date"].fillna(median_date)
            else:
                df["Notif. Date"] = pd.to_datetime("today").normalize()
            df["MonthSort"] = df["Notif. Date"].dt.to_period('M').dt.to_timestamp()
        else:
            df["Notif. Date"] = pd.to_datetime("today").normalize()
            df["MonthSort"] = pd.to_datetime("today").normalize()
        
        # 7. Ageing
        age_col = find_col(["ageing", "age", "days", "duration"])
        if age_col:
            df["Ageing"] = pd.to_numeric(df[age_col], errors='coerce').fillna(0)
            df["AgeingClean"] = df["Ageing"].clip(upper=AGEING_OUTLIER_THRESHOLD)
        else:
            df["Ageing"] = 0
            df["AgeingClean"] = 0

        # Debug: show what was mapped (AFTER all processing)
        st.sidebar.success(f"✅ Loaded {len(df)} rows")
        mapped_info = []
        if loc_col: mapped_info.append(f"Location ← '{loc_col}'")
        if smelt_col: mapped_info.append(f"Smelter ← '{smelt_col}'")
        if date_col: mapped_info.append(f"Date ← '{date_col}'")
        if stat_col: mapped_info.append(f"Status ← '{stat_col}'")
        if cause_col: mapped_info.append(f"Cause ← '{cause_col}'")
        st.sidebar.caption("Column mapping:\n" + "\n".join(mapped_info))

        return df
    except Exception as e:
        st.error(f"❌ Error loading data: {e}")
        import traceback
        st.code(traceback.format_exc())
        return pd.DataFrame()

def calculate_kpis(df):
    return {}

def get_top_location(df):
    if df is None or df.empty or "Location_Clean" not in df.columns: return "N/A", 0
    vc = df["Location_Clean"].value_counts()
    return (vc.index[0], vc.iloc[0]) if not vc.empty else ("N/A", 0)

def get_top_cause(df, exclude_hotspot=True):
    if df is None or df.empty or "Cause_Clean" not in df.columns: return "N/A", 0
    if exclude_hotspot: df = df[df["Cause_Clean"] != "Hotspot"]
    vc = df["Cause_Clean"].value_counts()
    return (vc.index[0], vc.iloc[0]) if not vc.empty else ("N/A", 0)

# ---------------------------------------------------------
# DATA LOADING & PROCESSING
# ---------------------------------------------------------
def load_data(file):
    return load_and_process_data(file)


# ---------------------------------------------------------
# MAIN APP
# ---------------------------------------------------------
col_logo, col_title = st.columns([1, 6])
with col_logo:
    st.image("Vedanta-Aluminium-Logo-RGB-scaled.jpg", use_container_width=True)
with col_title:
    st.title("Vedanta CBM Observation Dashboard")
    st.markdown("<h4 style='color: #09609D; margin-top: -15px;'>Vedanta Aluminium Jharsugura</h4>", unsafe_allow_html=True)


# File Upload / Load
st.sidebar.header("📁 Data Source")
uploaded_file = st.sidebar.file_uploader("Upload CN Data (Excel)", type=["xlsx"])

df_raw = None
if uploaded_file is not None:
    df_raw = load_data(uploaded_file)
else:
    # Try loading default file
    default_path = "CN Data Jan'26 to May'26.xlsx"
    if os.path.exists(default_path):
        st.sidebar.info(f"Using default file: {default_path}")
        df_raw = load_data(default_path)
    else:
        st.warning("Please upload a CBM data Excel file to begin.")
        st.stop()

if df_raw is None or df_raw.empty:
    st.warning("No data available.")
    st.stop()

# ---------------------------------------------------------
# SIDEBAR FILTERS
# ---------------------------------------------------------
st.sidebar.header("🔍 Global Filters")

# Smelter Filter
smelters = sorted([s for s in df_raw["Smelter"].unique() if pd.notna(s)])
selected_smelters = st.sidebar.multiselect("Plant Filter (Smelter)", smelters, default=smelters)

# Month Filter
months = sorted(list(df_raw["MonthSort"].unique()))
month_labels = [m.strftime("%b '%y") for m in months]
selected_months_labels = st.sidebar.multiselect("Month Filter", month_labels, default=month_labels)
selected_months = [m for m, label in zip(months, month_labels) if label in selected_months_labels]

# Area Filter
areas = sorted([a for a in df_raw["Location_Clean"].unique() if pd.notna(a)])
selected_areas = st.sidebar.multiselect("Area Filter", areas, default=areas)

# Apply filters
df = df_raw.copy()
if selected_smelters:
    df = df[df["Smelter"].isin(selected_smelters)]
if selected_months:
    df = df[df["MonthSort"].isin(selected_months)]
if selected_areas:
    df = df[df["Location_Clean"].isin(selected_areas)]


# ---------------------------------------------------------
# DASHBOARD TABS
# ---------------------------------------------------------
tab1, tab2, tab3, tab4 = st.tabs([
    "📊 Executive Summary", 
    "📈 Observations & Causes", 
    "⚙️ Asset Health & Locations", 
    "🔍 Area Deep-Dives"
])

with tab1:
    # ---------------------------------------------------------
    # TOP ROW: KPIs
    # ---------------------------------------------------------
    st.markdown("### Executive Overview")
    col1, col2, col3, col4 = st.columns(4)

    total_obs = len(df)
    crt_obs = len(df[df["StatusLabel"] == "Critical (CRT)"])
    avg_age = df["AgeingClean"].mean()
    if pd.isna(avg_age): avg_age = 0

    with col1:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-title">Total Observations</div>
            <div class="kpi-value">{total_obs}</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col2:
        st.markdown(f"""
        <div class="kpi-card" style="border-top-color: {COLOR_RED};">
            <div class="kpi-title">Critical (CRT)</div>
            <div class="kpi-value">{crt_obs}</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col3:
        st.markdown(f"""
        <div class="kpi-card" style="border-top-color: {COLOR_GOLD};">
            <div class="kpi-title">Average Ageing</div>
            <div class="kpi-value">{avg_age:.1f} <span style="font-size:16px;">Days</span></div>
            <div class="kpi-subtext">Excl. outliers (≥25 days)</div>
        </div>
        """, unsafe_allow_html=True)

    with col4:
        hotspot_count = len(df[df["Cause_Clean"] == "Hotspot"]) if "Cause_Clean" in df.columns else 0
        st.markdown(f"""
        <div class="kpi-card" style="border-top-color: {COLOR_GREEN};">
            <div class="kpi-title">Hotspots</div>
            <div class="kpi-value">{hotspot_count}</div>
            <div class="kpi-subtext">Requires immediate attention</div>
        </div>
        """, unsafe_allow_html=True)

    # ---------------------------------------------------------
    # AUTOMATED INSIGHTS
    # ---------------------------------------------------------
    st.markdown("---")
    st.markdown("#### 💡 Automated Business Insights")
    
    insights = []
    
    # 1. Top Location Insight
    top_loc, top_loc_count = get_top_location(df)
    if top_loc_count > 0:
        insights.append(f"**{top_loc}** contributes {top_loc_count} observations ({(top_loc_count/total_obs)*100:.1f}% of total).")
    
    # 2. Top Cause Insight
    top_cause, top_cause_count = get_top_cause(df, exclude_hotspot=True)
    if top_cause_count > 0:
        insights.append(f"**{top_cause}** is the leading cause code (excluding hotspots), representing {(top_cause_count/total_obs)*100:.1f}% of observations.")
    
    # 3. Criticality Insight
    if total_obs > 0:
        insights.append(f"**{(crt_obs/total_obs)*100:.1f}%** of observations are currently open and critical (CRT).")
        
    # 4. Ageing Insight
    if avg_age > 10:
        insights.append(f"Average closure time is **{avg_age:.1f} days**, which indicates potential delays in maintenance execution.")
    else:
        insights.append(f"Average closure time is **{avg_age:.1f} days**, showing strong maintenance responsiveness.")
        
    for insight in insights:
        st.markdown(f"- {insight}")


    st.markdown("---")

    # ---------------------------------------------------------
    # MIDDLE ROW: CHARTS
    # ---------------------------------------------------------
    c1, c2 = st.columns([1, 1])

    # Chart 1: Health Status Donut Chart
    with c1:
        st.markdown("#### Health Status Distribution")
        if total_obs > 0:
            status_counts = df["StatusLabel"].value_counts().reset_index()
            status_counts.columns = ["Status", "Count"]
            
            color_map = {"Critical (CRT)": COLOR_RED, "Marginal (MRG)": COLOR_GREEN, "Other": COLOR_GREY}
            fig_pie = px.pie(
                status_counts, values="Count", names="Status", 
                hole=0.5, color="Status", color_discrete_map=color_map
            )
            fig_pie.update_traces(textposition='inside', textinfo='percent+label',
                                  marker=dict(line=dict(color='#FFFFFF', width=2)))
            fig_pie.update_layout(margin=dict(t=30, b=20, l=150, r=60), height=350, 
                                  showlegend=False, paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
            
            # Add center text
            fig_pie.add_annotation(x=0.5, y=0.5, text=f"{total_obs}<br>Total",
                                   font=dict(size=20, color=COLOR_DARK, family="Inter"),
                                   showarrow=False)
                                   
            fig_pie.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_pie, use_container_width=True, theme=None)
        else:
            st.info("No data for pie chart")

    # Chart 2: Area Wise Count (Horizontal Bar)
    with c2:
        st.markdown("#### Area Wise Observation Count")
        if total_obs > 0:
            area_counts = df["Location_Clean"].value_counts().reset_index().head(8)
            area_counts.columns = ["Area", "Count"]
            area_counts = area_counts.sort_values("Count", ascending=True)
            
            fig_bar = px.bar(
                area_counts, x="Count", y="Area", orientation='h',
                color_discrete_sequence=[COLOR_BLUE],
                text="Count"
            )
            fig_bar.update_traces(textposition='outside', marker_line_width=0, opacity=0.9, cliponaxis=False, textfont=dict(color=COLOR_DARK))
            fig_bar.update_layout(
                margin=dict(t=30, b=20, l=150, r=60), 
                height=350,
                xaxis_title="",
                yaxis_title="",
                xaxis=dict(showgrid=True, gridcolor='rgba(226, 232, 240, 0.6)'),
                paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
                font=dict(family="Inter")
            )
            fig_bar.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_bar, use_container_width=True, theme=None)
        else:
            st.info("No data for bar chart")

with tab2:
    st.markdown("### Observations & Causes")
    
    col_2a, col_2b = st.columns(2)
    
    with col_2a:
        st.markdown("#### Monthly Observation Trend")
        if total_obs > 0:
            monthly_counts = df.groupby(["MonthSort", "Smelter"]).size().reset_index(name="Count")
            monthly_counts["Month"] = monthly_counts["MonthSort"].dt.strftime("%b '%y")
            
            fig_trend = px.bar(
                monthly_counts, x="Month", y="Count", color="Smelter",
                color_discrete_map={"Smelter 1": COLOR_BLUE, "Smelter 2": COLOR_GREEN},
                barmode="group", text="Count"
            )
            fig_trend.update_traces(textposition='outside', cliponaxis=False, textfont=dict(color=COLOR_DARK))
            fig_trend.update_layout(
                margin=dict(t=30, b=20, l=150, r=60), height=350,
                xaxis_title="", yaxis_title="",
                paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)'
            )
            fig_trend.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_trend, use_container_width=True, theme=None)
            
    with col_2b:
        st.markdown("#### Cause Code Distribution (Excl. Hotspot)")
        df_no_hs = df[df["Cause_Clean"] != "Hotspot"]
        if not df_no_hs.empty:
            cause_counts = df_no_hs["Cause_Clean"].value_counts().head(8).reset_index()
            cause_counts.columns = ["Cause", "Count"]
            
            fig_cause = px.bar(
                cause_counts, x="Count", y="Cause", orientation='h',
                color_discrete_sequence=[COLOR_GOLD], text="Count"
            )
            fig_cause.update_traces(textposition='outside', cliponaxis=False, textfont=dict(color=COLOR_DARK))
            fig_cause.update_layout(
                margin=dict(t=30, b=20, l=150, r=60), height=350,
                yaxis=dict(autorange="reversed"), xaxis_title="", yaxis_title="",
                paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)'
            )
            fig_cause.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_cause, use_container_width=True, theme=None)

    c2_1, c2_2 = st.columns(2)
    with c2_1:
        st.markdown("#### Technology Mix")
        if total_obs > 0:
            tech_counts = df["Technology"].value_counts().reset_index()
            tech_counts.columns = ["Tech", "Count"]
            fig_tech = px.pie(
                tech_counts, values="Count", names="Tech", hole=0.4,
                color_discrete_sequence=px.colors.qualitative.Prism
            )
            fig_tech.update_traces(textposition='inside', textinfo='percent+label')
            fig_tech.update_layout(margin=dict(t=30, b=20, l=150, r=60), height=300, showlegend=False)
            fig_tech.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_tech, use_container_width=True, theme=None)
            
    with c2_2:
        st.markdown("#### CN Status (CRT vs MRG)")
        if total_obs > 0:
            status_smelter = df.groupby(["Smelter", "StatusLabel"]).size().reset_index(name="Count")
            fig_status = px.bar(
                status_smelter, x="Smelter", y="Count", color="StatusLabel",
                color_discrete_map={"Critical (CRT)": COLOR_RED, "Marginal (MRG)": COLOR_GREEN, "Other": COLOR_GREY},
                text="Count"
            )
            fig_status.update_traces(textposition='inside')
            fig_status.update_layout(
                margin=dict(t=30, b=20, l=150, r=60), height=300,
                xaxis_title="", yaxis_title="", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)'
            )
            fig_status.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_status, use_container_width=True, theme=None)
    
with tab3:
    st.markdown("### Asset Health & Locations")
    
    col_3a, col_3b = st.columns(2)
    
    with col_3a:
        st.markdown("#### Hotspot Analysis by Area")
        df_hs = df[df["Cause_Clean"] == "Hotspot"]
        if not df_hs.empty:
            hs_loc = df_hs["Location_Clean"].value_counts().reset_index().head(10)
            hs_loc.columns = ["Location", "Hotspots"]
            fig_hs = px.bar(
                hs_loc, x="Location", y="Hotspots",
                color_discrete_sequence=["#EF6C00"], text="Hotspots"
            )
            fig_hs.update_traces(textposition='outside', cliponaxis=False, textfont=dict(color=COLOR_DARK))
            fig_hs.update_layout(
                margin=dict(t=30, b=20, l=150, r=60), height=350,
                xaxis_title="", yaxis_title="", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)'
            )
            fig_hs.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_hs, use_container_width=True, theme=None)
        else:
            st.info("No hotspots detected in the current selection.")

    with col_3b:
        st.markdown("#### Closure Statistics (Avg Days)")
        if total_obs > 0:
            closure_stats = df.groupby("Location_Clean").agg(
                Count=("Notif. Date", "count"),
                Avg_Days=("AgeingClean", "mean"),
                Max_Days=("Ageing", "max")
            ).reset_index().sort_values("Avg_Days", ascending=False).head(10)
            closure_stats["Avg_Days"] = closure_stats["Avg_Days"].round(1)
            
            fig_closure = px.bar(
                closure_stats, x="Avg_Days", y="Location_Clean", orientation='h',
                color="Avg_Days", color_continuous_scale="Reds",
                text="Avg_Days"
            )
            fig_closure.update_traces(textposition='outside', cliponaxis=False, textfont=dict(color=COLOR_DARK))
            fig_closure.update_layout(
                margin=dict(t=30, b=20, l=150, r=60), height=350,
                yaxis=dict(autorange="reversed"), xaxis_title="Avg Closing Days", yaxis_title="",
                paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', coloraxis_showscale=False
            )
            fig_closure.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_closure, use_container_width=True, theme=None)

    st.markdown("#### Location Closure Data Table")
    if total_obs > 0:
        st.dataframe(closure_stats, use_container_width=True, hide_index=True)
    
with tab4:
    st.markdown("### Area Deep-Dives")
    st.markdown("Select an area below to view detailed metrics specific to that location.")
    
    deep_dive_areas = [a for a in areas if pd.notna(a)]
    if not deep_dive_areas:
        st.info("No areas available.")
    else:
        selected_deep_dive = st.selectbox("Select Area for Deep Dive", deep_dive_areas)
        
        df_area = df_raw[df_raw["Location_Clean"] == selected_deep_dive]
        if df_area.empty:
            st.warning("No data for this area.")
        else:
            area_obs = len(df_area)
            area_crt = len(df_area[df_area["StatusLabel"].str.contains("CRT", na=False)])
            area_avg = df_area["AgeingClean"].mean()
            if pd.isna(area_avg): area_avg = 0
            
            c4a, c4b, c4c = st.columns(3)
            with c4a:
                st.markdown(f"""
                <div class="kpi-card" style="border-top-color: {COLOR_BLUE};">
                    <div class="kpi-title">Total {selected_deep_dive} CNs</div>
                    <div class="kpi-value">{area_obs}</div>
                </div>
                """, unsafe_allow_html=True)
            with c4b:
                st.markdown(f"""
                <div class="kpi-card" style="border-top-color: {COLOR_RED};">
                    <div class="kpi-title">Critical (CRT)</div>
                    <div class="kpi-value">{area_crt}</div>
                </div>
                """, unsafe_allow_html=True)
            with c4c:
                st.markdown(f"""
                <div class="kpi-card" style="border-top-color: {COLOR_GOLD};">
                    <div class="kpi-title">Avg Closure</div>
                    <div class="kpi-value">{area_avg:.1f} <span style="font-size:16px;">Days</span></div>
                </div>
                """, unsafe_allow_html=True)

            c4_1, c4_2 = st.columns(2)
            with c4_1:
                st.markdown(f"#### {selected_deep_dive} Technology Mix")
                tech_area = df_area["Technology"].value_counts().reset_index()
                tech_area.columns = ["Tech", "Count"]
                fig_tech_area = px.pie(tech_area, values="Count", names="Tech", hole=0.4)
                fig_tech_area.update_layout(margin=dict(t=30, b=20, l=150, r=60), height=300)
                fig_tech.update_layout(font=dict(color=COLOR_DARK))
            fig_tech_area.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_tech_area, use_container_width=True, theme=None)
                
            with c4_2:
                st.markdown(f"#### {selected_deep_dive} Monthly Trend")
                area_monthly = df_area.groupby("MonthSort").size().reset_index(name="Count")
                area_monthly["Month"] = area_monthly["MonthSort"].dt.strftime("%b '%y")
                fig_area_trend = px.line(area_monthly, x="Month", y="Count", markers=True)
                fig_area_trend.update_layout(margin=dict(t=30, b=20, l=150, r=60), height=300, xaxis_title="", yaxis_title="")
                fig_area_trend.update_layout(font=dict(color=COLOR_DARK))
            st.plotly_chart(fig_area_trend, use_container_width=True, theme=None)
                
# ---------------------------------------------------------
# GLOBAL DATA TABLE EXPORT (Always accessible at bottom)
# ---------------------------------------------------------
st.markdown("---")
st.markdown("### 📋 Raw Observation Data")
if total_obs > 0:
    display_cols = []
    col_mapping = {
        "Location_Clean": "Area",
        "Description": "Equipment/ObservationName",
        "Technology": "Technology",
        "StatusLabel": "HealthStatus",
        "Ageing": "Age (Days)",
        "Notif. Date": "Notification Date",
        "Smelter": "Smelter"
    }
    
    for c in col_mapping.keys():
        if c in df.columns:
            display_cols.append(c)
            
    df_display = df[display_cols].copy()
    df_display.rename(columns=col_mapping, inplace=True)
    
    if "Notification Date" in df_display.columns:
        df_display["Notification Date"] = df_display["Notification Date"].dt.strftime("%Y-%m-%d")
        
    st.dataframe(df_display, use_container_width=True, hide_index=True)
    
    csv = df_display.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Download Data as CSV",
        data=csv,
        file_name='cbm_observations_filtered.csv',
        mime='text/csv',
    )
else:
    st.info("No data to display.")


import streamlit as st
import pandas as pd
import plotly.express as px
from data import (
    generate_sample_data,
    aggregate_utilization,
    forward_looking_window,
    historical_utilization,
    export_csv,
)
import os
from datetime import datetime, date

st.set_page_config(page_title="Nash Utilization Dashboard", layout="wide")
st.title("📊 Utilization Dashboard (Nash / Hoffmann)")

# Sidebar controls
st.sidebar.header("Controls")
data_source = st.sidebar.radio("Data source", ["Sample Data", "Upload CSV", "Production Master (auto-ingested)"])
df = None

# Determine default master data path (relative to this app.py)
DEFAULT_MASTER_PATH = os.path.join(os.path.dirname(__file__), "data", "master.csv")

if data_source == "Sample Data":
    df = generate_sample_data()
elif data_source == "Upload CSV":
    uploaded = st.sidebar.file_uploader("Upload capacity data (CSV with date, tenant, business_unit, total_available_hours, booked_hours)", type="csv")
    if uploaded:
        df = pd.read_csv(uploaded, parse_dates=["date"])
    else:
        st.info("Upload a CSV to begin.")
        st.stop()
elif data_source == "Production Master (auto-ingested)":
    master_path = os.getenv("PROD_DATA_PATH", DEFAULT_MASTER_PATH)
    if not os.path.exists(master_path):
        st.error(f"Master data file not found at {master_path}. Run the ingestion pipeline first or create the file.")
        st.stop()
    df = pd.read_csv(master_path, parse_dates=["date"])

# Filters
all_tenants = sorted(df["tenant"].unique())
all_bus = sorted(df["business_unit"].unique())

selected_tenants = st.sidebar.multiselect("Tenants", all_tenants, default=all_tenants)
selected_bus = st.sidebar.multiselect("Business Units", all_bus, default=all_bus)

if not selected_tenants or not selected_bus:
    st.warning("Select at least one tenant and business unit.")
    st.stop()

filtered = df[df["tenant"].isin(selected_tenants) & df["business_unit"].isin(selected_bus)].copy()
filtered["date"] = pd.to_datetime(filtered["date"])

# Metrics summary
st.subheader("Summary Metrics (All Selected Data)")
agg = aggregate_utilization(filtered)
col1, col2, col3 = st.columns(3)
col1.metric("Overall Utilization", f"{agg['utilization'].mean():.1%}")
col2.metric("Total Available Hours", f"{agg['total_available_hours'].sum():,.0f}")
col3.metric("Total Booked Hours", f"{agg['booked_hours'].sum():,.0f}")

# Historical utilization chart
st.subheader("Historical Utilization (Past 7 Days)")
today = pd.Timestamp(date.today())
hist = historical_utilization(filtered, lookback_days=7, as_of_date=today)
if not hist.empty:
    fig_hist = px.line(
        hist,
        x="date",
        y="utilization",
        color="business_unit",
        line_dash="tenant",
        markers=True,
        title="Utilization over time",
        labels={"utilization": "Utilization (%)"},
    )
    fig_hist.update_yaxes(tickformat=".0%")
    st.plotly_chart(fig_hist, use_container_width=True)
else:
    st.caption("No historical data in selected range.")

# Forward-looking windows
st.subheader("Forward-Looking Average Utilization")
for window in [3, 5, 10]:
    fwd = forward_looking_window(filtered, window_days=window, as_of_date=today)
    if not fwd.empty:
        st.write(f"**Next {window} days** (avg utilization)")
        fig = px.bar(
            fwd,
            x="business_unit",
            y="utilization",
            color="tenant",
            barmode="group",
            title=f"{window}-Day Forward Look",
            labels={"utilization": "Utilization (%)"},
        )
        fig.update_yaxes(tickformat=".0%", range=[0, 1])
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.caption(f"No forward data for {window}-day window.")

# CSV Export section
st.subheader("CSV Export")
export_path = st.text_input("Export CSV path", value="utilization_export.csv")
if st.button("Generate CSV Export"):
    try:
        out_path = export_csv(filtered, export_path)
        st.success(f"CSV written to: {out_path}")
        # Show preview
        preview = pd.read_csv(out_path, nrows=10)
        st.dataframe(preview)
    except Exception as e:
        st.error(f"Export failed: {e}")

st.caption("Prototype for Nash. Next: automate daily email export to Tinuiti.")
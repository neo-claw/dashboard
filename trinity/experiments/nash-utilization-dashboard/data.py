import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_sample_data(start_date=None, days=30):
    """Generate synthetic capacity data for demonstration."""
    if start_date is None:
        start_date = datetime.now().date()

    tenants = ["Nash", "OtherTenant"]
    business_units = ["Plumbing", "Electrical", "HVAC", "Appliance"]
    rows = []

    for i in range(days):
        day = start_date + timedelta(days=i - 10)  # include past and future
        for tenant in tenants:
            for bu in business_units:
                # Simulate capacity: total available hours per day (e.g., 8hrs * num techs)
                total_available = np.random.randint(80, 120)
                # Booked hours: some fraction of available
                booked_ratio = np.random.beta(8, 2)  # tends >0.5
                booked = int(total_available * booked_ratio)
                rows.append({
                    "date": day,
                    "tenant": tenant,
                    "business_unit": bu,
                    "total_available_hours": total_available,
                    "booked_hours": booked,
                })

    df = pd.DataFrame(rows)
    df["utilization"] = df["booked_hours"] / df["total_available_hours"]
    return df

def aggregate_utilization(df, group_by=["tenant", "business_unit"]):
    """Aggregate utilization metrics."""
    agg = df.groupby(group_by).agg({
        "total_available_hours": "sum",
        "booked_hours": "sum"
    }).reset_index()
    agg["utilization"] = agg["booked_hours"] / agg["total_available_hours"]
    return agg

def forward_looking_window(df, window_days=3, as_of_date=None):
    """Compute average % booked for next N days (including today)."""
    if as_of_date is None:
        as_of_date = datetime.now().date()
    future = df[df["date"] >= as_of_date].copy()
    future = future[future["date"] < as_of_date + timedelta(days=window_days)]
    return aggregate_utilization(future)

def historical_utilization(df, lookback_days=7, as_of_date=None):
    """Compute historical utilization over past N days."""
    if as_of_date is None:
        as_of_date = datetime.now().date()
    past = df[df["date"] >= as_of_date - timedelta(days=lookback_days)]
    past = past[past["date"] <= as_of_date]
    return aggregate_utilization(past)

def export_csv(df, path):
    """Export the utilization pivot to CSV."""
    # Create a flat table: rows = (tenant, business_unit), cols = date utilization and booked/available
    pivot = df.pivot_table(
        index=["tenant", "business_unit"],
        columns="date",
        values=["utilization", "booked_hours", "total_available_hours"]
    )
    pivot.to_csv(path)
    return path
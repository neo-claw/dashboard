import streamlit as st
import json
import pandas as pd
from pathlib import Path

st.set_page_config(layout="wide", page_title="Inbound Taxonomy Editor")

DATA_PATH = Path(__file__).parent / "data" / "outcomes.json"

def load_data():
    with DATA_PATH.open('r', encoding='utf-8') as f:
        data = json.load(f)
    return pd.DataFrame(data)

def save_data(df):
    # Convert to list of dicts preserving column order
    data = df.to_dict(orient='records')
    with DATA_PATH.open('w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    st.success("Saved successfully!")

def main():
    st.title("Netic Inbound Taxonomy Editor")
    st.markdown("Edit the outcome classification table. Changes are saved to `data/outcomes.json`.")

    if 'df' not in st.session_state:
        st.session_state.df = load_data()

    # Data editor with dynamic rows (add/delete)
    edited_df = st.data_editor(
        st.session_state.df,
        use_container_width=True,
        num_rows="dynamic",
        hide_index=True,
        column_config={
            "Outcome": st.column_config.SelectboxColumn(
                "Outcome",
                options=["Booked", "Unbooked", "Handled", "Not enough info", "Requested call back", "Requested human", "Spam call", "Excused", "Transfer", "Flags (no transfer)", "System event", ""],
                required=False
            ),
            "Reason": st.column_config.TextColumn("Reason"),
            "Subreason": st.column_config.TextColumn("Subreason"),
            "Definition": st.column_config.TextColumn("Definition"),
            "Technical": st.column_config.TextColumn("Technical"),
        }
    )

    # Save button
    if st.button("Save Changes", type="primary"):
        # Detect changes by comparing to session state? Simpler: just save edited_df
        save_data(edited_df)
        st.session_state.df = edited_df

    st.divider()
    st.caption("Note: The original markdown file is not overwritten. Use export.py to generate a new markdown table when needed.")

if __name__ == "__main__":
    main()

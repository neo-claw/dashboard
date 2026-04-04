import smtplib
import os
from email.message import EmailMessage
from email.utils import make_msgid
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

def send_csv_email(csv_path, recipient, subject=None, body=None):
    """Email a CSV file as an attachment."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    sender = os.getenv("SMTP_SENDER", smtp_user)

    if not all([smtp_host, smtp_user, smtp_pass]):
        raise RuntimeError("SMTP credentials not set in environment variables.")

    msg = EmailMessage()
    msg["Subject"] = subject or "Daily Utilization Report"
    msg["From"] = sender
    msg["To"] = recipient
    msg.set_content(body or "Attached is the daily utilization report.")

    # Read CSV and attach
    with open(csv_path, "rb") as f:
        csv_data = f.read()
    msg.add_attachment(
        csv_data,
        maintype="text",
        subtype="csv",
        filename=os.path.basename(csv_path),
    )

    with smtplib.SMTP(smtp_host, smtp_port) as s:
        s.starttls()
        s.login(smtp_user, smtp_pass)
        s.send_message(msg)

def run_daily_export():
    """Generate the report and email it. Intended for cron."""
    from data import generate_sample_data, export_csv
    # In real implementation, replace with actual data source
    df = generate_sample_data()
    out_path = "daily_utilization.csv"
    export_csv(df, out_path)
    send_csv_email(
        out_path,
        recipient=os.getenv("RECIPIENT_EMAIL", "team@tinuiti.com"),
        subject=f"Nash Utilization - {pd.Timestamp.now().date()}",
        body="Automated daily utilization report attached.",
    )
    print(f"Exported {out_path} and emailed.")
from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

# ---------------------- CORE DCF FUNCTION ----------------------

def calculate_dcf(company, inputs):

    data = yf.Ticker(company)

    # ---------------- DATA ----------------
    income = data.financials.transpose()
    income.index = pd.to_datetime(income.index)
    income['Year'] = income.index.year

    balance = data.balance_sheet.transpose()
    balance.index = pd.to_datetime(balance.index)
    balance['Year'] = balance.index.year

    # ---------------- INPUTS ----------------
    growth = inputs.get("growth", None)
    ebit_margin_input = inputs.get("ebit_margin", None)
    tax = inputs.get("tax", 0.18)
    wacc = inputs.get("wacc", 0.12)
    terminal_growth = inputs.get("terminal_growth", 0.03)

    # ---------------- HISTORICAL DATA ----------------
    years = sorted(income['Year'].unique())[-3:]

    revenue_hist = []
    ebit_hist = []

    for y in years:
        revenue_hist.append(float(income.query(f"Year=={y}")['Total Revenue'].iloc[0]))
        ebit_hist.append(float(income.query(f"Year=={y}")['EBIT'].iloc[0]))

    # ---------------- REVENUE GROWTH ----------------
    if growth:
        growth = growth
    else:
        growth = np.mean([
            (revenue_hist[i] / revenue_hist[i-1] - 1)
            for i in range(1, len(revenue_hist))
        ])

    # ---------------- EBIT MARGIN ----------------
    if ebit_margin_input:
        ebit_margin = ebit_margin_input
    else:
        ebit_margin = np.mean([
            ebit_hist[i] / revenue_hist[i]
            for i in range(len(revenue_hist))
        ])

    # ---------------- FORECAST ----------------
    forecast_years = 5
    revenue = revenue_hist[-1]

    fcff_list = []

    for i in range(1, forecast_years + 1):

        revenue = revenue * (1 + growth)

        ebit = revenue * ebit_margin
        nopat = ebit * (1 - tax)

        # Assumptions (clean)
        depreciation = revenue * 0.03
        capex = revenue * 0.05
        change_wc = revenue * 0.02

        fcff = nopat + depreciation - capex - change_wc
        fcff_list.append(fcff)

    # ---------------- DISCOUNTING ----------------
    pv = 0

    for i in range(len(fcff_list)):
        pv += fcff_list[i] / ((1 + wacc) ** (i + 1))

    # ---------------- TERMINAL VALUE ----------------
    terminal_value = (fcff_list[-1] * (1 + terminal_growth)) / (wacc - terminal_growth)
    terminal_pv = terminal_value / ((1 + wacc) ** forecast_years)

    enterprise_value = pv + terminal_pv

    # ---------------- EQUITY VALUE ----------------
    try:
        cash = float(balance.iloc[0].get('Cash Cash Equivalents And Short Term Investments', 0))
    except:
        cash = 0

    try:
        debt = float(balance.iloc[0].get('Total Debt', 0))
    except:
        debt = 0

    try:
        shares = float(balance.iloc[0].get('Share Issued', 1))
    except:
        shares = 1

    equity_value = enterprise_value + cash - debt
    value_per_share = equity_value / shares if shares != 0 else 0

    return {
        "enterprise_value": round(enterprise_value, 2),
        "equity_value": round(equity_value, 2),
        "value_per_share": round(value_per_share, 2)
    }


# ---------------------- API ROUTE ----------------------

@app.route("/dcf", methods=["POST"])
def dcf():

    data = request.json

    company = data.get("company", "RELIANCE.NS")

    inputs = {
        "growth": data.get("growth"),
        "ebit_margin": data.get("ebit_margin"),
        "tax": data.get("tax", 0.18),
        "wacc": data.get("wacc", 0.12),
        "terminal_growth": data.get("terminal_growth", 0.03)
    }

    result = calculate_dcf(company, inputs)

    return jsonify({
        "company": company,
        "result": result
    })


# ---------------------- RUN ----------------------

if __name__ == "__main__":
    app.run(debug=True)

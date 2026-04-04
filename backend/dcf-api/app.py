from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd
import yfinance as yf
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return float(default)


def _pick_row(df: pd.DataFrame, candidates: List[str]) -> pd.Series | None:
    if df is None or df.empty:
        return None
    for key in candidates:
        if key in df.index:
            return pd.to_numeric(df.loc[key], errors='coerce').dropna()
    return None


def _last_n(series: pd.Series, n: int = 3) -> np.ndarray:
    if series is None or series.empty:
        return np.array([])
    values = series.sort_index().values
    return values[-n:] if len(values) >= n else values


def _avg_growth(values: np.ndarray) -> float:
    if len(values) < 2:
        return 0.08
    growths = []
    for i in range(1, len(values)):
        prev = values[i - 1]
        curr = values[i]
        if prev and prev != 0:
            growths.append((curr / prev) - 1)
    return float(np.mean(growths)) if growths else 0.08


@app.post('/dcf')
def dcf_endpoint():
    payload: Dict = request.get_json(silent=True) or {}

    company = str(payload.get('company', 'RELIANCE.NS')).strip() or 'RELIANCE.NS'
    growth_in = payload.get('growth')
    ebit_margin_in = payload.get('ebit_margin')
    wacc = _safe_float(payload.get('wacc', 0.12), 0.12)
    terminal_growth = _safe_float(payload.get('terminal_growth', 0.03), 0.03)
    tax = _safe_float(payload.get('tax', 0.18), 0.18)

    if wacc <= terminal_growth:
        return jsonify({'error': 'WACC must be greater than terminal growth.'}), 400

    try:
        ticker = yf.Ticker(company)
        financials = ticker.financials
        balance_sheet = ticker.balance_sheet
        info = ticker.info or {}

        revenue_row = _pick_row(financials, ['Total Revenue', 'Revenue'])
        ebit_row = _pick_row(financials, ['EBIT', 'Operating Income'])

        revenue_hist = _last_n(revenue_row, 3)
        ebit_hist = _last_n(ebit_row, 3)

        if len(revenue_hist) == 0 or len(ebit_hist) == 0:
            return jsonify({'error': f'Financial data unavailable for symbol {company}.'}), 404

        implied_growth = _avg_growth(revenue_hist)
        implied_margin = float(np.mean(ebit_hist / revenue_hist)) if len(revenue_hist) == len(ebit_hist) else 0.15

        growth = _safe_float(growth_in, implied_growth) if growth_in is not None else implied_growth
        ebit_margin = _safe_float(ebit_margin_in, implied_margin) if ebit_margin_in is not None else implied_margin

        base_revenue = float(revenue_hist[-1])

        forecast_fcff = []
        forecast_revenue = []

        for t in range(1, 6):
            revenue_t = base_revenue * ((1 + growth) ** t)
            ebit_t = revenue_t * ebit_margin
            nopat_t = ebit_t * (1 - tax)

            depreciation_t = revenue_t * 0.03
            capex_t = revenue_t * 0.05
            delta_wc_t = revenue_t * 0.02

            fcff_t = nopat_t + depreciation_t - capex_t - delta_wc_t

            forecast_revenue.append(revenue_t)
            forecast_fcff.append(fcff_t)

        pv_fcff = [fcff / ((1 + wacc) ** i) for i, fcff in enumerate(forecast_fcff, start=1)]

        fcff_last = forecast_fcff[-1]
        terminal_value = (fcff_last * (1 + terminal_growth)) / (wacc - terminal_growth)
        pv_terminal_value = terminal_value / ((1 + wacc) ** 5)

        enterprise_value = float(np.sum(pv_fcff) + pv_terminal_value)

        cash_row = _pick_row(
            balance_sheet,
            ['Cash Cash Equivalents And Short Term Investments', 'Cash And Cash Equivalents', 'Cash']
        )
        debt_row = _pick_row(balance_sheet, ['Total Debt', 'Long Term Debt', 'Current Debt'])

        cash_value = float(cash_row.sort_index().values[-1]) if cash_row is not None and len(cash_row) else 0.0
        debt_value = float(debt_row.sort_index().values[-1]) if debt_row is not None and len(debt_row) else 0.0

        equity_value = enterprise_value + cash_value - debt_value

        shares_outstanding = _safe_float(info.get('sharesOutstanding', 0), 0)
        if shares_outstanding <= 0:
            return jsonify({'error': f'Shares outstanding not available for symbol {company}.'}), 404

        value_per_share = equity_value / shares_outstanding

        return jsonify({
            'enterprise_value': enterprise_value,
            'equity_value': float(equity_value),
            'value_per_share': float(value_per_share)
        })

    except Exception as exc:  # noqa: BLE001
        return jsonify({'error': f'DCF calculation failed: {str(exc)}'}), 500


@app.get('/health')
def health():
    return jsonify({'ok': True})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

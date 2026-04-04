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


def _avg_growth(values: np.ndarray, default: float = 0.08) -> float:
    if len(values) < 2:
        return default
    growths = []
    for i in range(1, len(values)):
        prev = values[i - 1]
        curr = values[i]
        if prev and prev != 0:
            growths.append((curr / prev) - 1)
    return float(np.mean(growths)) if growths else default


def _ratio_series(numer: pd.Series | None, denom: pd.Series | None) -> np.ndarray:
    if numer is None or denom is None:
        return np.array([])
    common = numer.index.intersection(denom.index)
    if len(common) == 0:
        return np.array([])
    values = (numer.loc[common] / denom.loc[common]).replace([np.inf, -np.inf], np.nan).dropna()
    return _last_n(values, 3)


def _shares_outstanding(ticker: yf.Ticker, user_shares: float | None) -> float:
    if user_shares and user_shares > 0:
        return user_shares

    try:
        fast_info = getattr(ticker, 'fast_info', None) or {}
        if isinstance(fast_info, dict):
            for key in ('shares', 'sharesOutstanding'):
                value = fast_info.get(key)
                if value:
                    return _safe_float(value, 0)

            market_cap = fast_info.get('market_cap')
            last_price = fast_info.get('last_price') or fast_info.get('regular_market_price')
            if market_cap and last_price:
                inferred = _safe_float(market_cap, 0) / max(_safe_float(last_price, 0), 1e-9)
                if inferred > 0:
                    return inferred
    except Exception:
        pass

    try:
        info = ticker.info or {}
        return _safe_float(info.get('sharesOutstanding', 0), 0)
    except Exception:
        return 0.0


def _sensitivity_grid(forecast_fcff: List[float], years: int, cash_value: float, debt_value: float, shares: float,
                      base_wacc: float, base_tg: float):
    wacc_values = np.round(np.arange(base_wacc - 0.05, base_wacc + 0.051, 0.01), 3)
    tg_values = np.round(np.arange(base_tg - 0.02, base_tg + 0.021, 0.005), 3)

    rows = []
    for tg in tg_values:
        row = {'terminal_growth': round(tg * 100, 2), 'values': {}}
        for wacc in wacc_values:
            key = f'{round(wacc * 100, 2)}'
            if wacc <= tg or wacc <= 0:
                row['values'][key] = None
                continue

            pv_fcff = sum(fcff / ((1 + wacc) ** i) for i, fcff in enumerate(forecast_fcff, start=1))
            terminal_value = (forecast_fcff[-1] * (1 + tg)) / (wacc - tg)
            pv_terminal = terminal_value / ((1 + wacc) ** years)
            equity = pv_fcff + pv_terminal + cash_value - debt_value
            row['values'][key] = float(equity / shares)

        rows.append(row)
    return rows


@app.post('/dcf')
def dcf_endpoint():
    payload: Dict = request.get_json(silent=True) or {}

    company = str(payload.get('company', 'RELIANCE.NS')).strip() or 'RELIANCE.NS'
    growth_in = payload.get('growth')
    ebit_margin_in = payload.get('ebit_margin')
    depr_pct_in = payload.get('depr_pct')
    nwc_pct_in = payload.get('nwc_pct')
    capex_pct_in = payload.get('capex_pct')
    shares_in = payload.get('shares')
    wacc = _safe_float(payload.get('wacc', 0.12), 0.12)
    terminal_growth = _safe_float(payload.get('terminal_growth', 0.03), 0.03)
    tax = _safe_float(payload.get('tax', 0.18), 0.18)

    if wacc <= terminal_growth:
        return jsonify({'error': 'WACC must be greater than terminal growth.'}), 400

    try:
        ticker = yf.Ticker(company)
        financials = ticker.financials
        balance_sheet = ticker.balance_sheet
        cash_flow = ticker.cash_flow

        revenue_row = _pick_row(financials, ['Total Revenue', 'Revenue'])
        ebit_row = _pick_row(financials, ['EBIT', 'Operating Income'])
        depreciation_row = _pick_row(cash_flow, ['Depreciation And Amortization', 'Depreciation'])
        current_assets_row = _pick_row(balance_sheet, ['Current Assets'])
        current_liabilities_row = _pick_row(balance_sheet, ['Current Liabilities'])

        revenue_hist = _last_n(revenue_row, 4)
        ebit_hist = _last_n(ebit_row, 4)

        if len(revenue_hist) < 2 or len(ebit_hist) == 0:
            return jsonify({'error': f'Financial data unavailable for symbol {company}.'}), 404

        implied_growth = _avg_growth(revenue_hist, 0.08)
        implied_margin = float(np.mean(ebit_hist[-min(len(ebit_hist), len(revenue_hist)):] / revenue_hist[-min(len(ebit_hist), len(revenue_hist)):]))

        depr_ratio_hist = _ratio_series(depreciation_row, revenue_row)
        implied_depr = float(np.mean(depr_ratio_hist)) if len(depr_ratio_hist) else 0.03

        if current_assets_row is not None and current_liabilities_row is not None and revenue_row is not None:
            wc_row = (current_assets_row - current_liabilities_row).dropna()
            nwc_ratio_hist = _ratio_series(wc_row, revenue_row)
            implied_nwc = float(np.mean(nwc_ratio_hist)) if len(nwc_ratio_hist) else 0.02
        else:
            implied_nwc = 0.02

        capex_row = _pick_row(cash_flow, ['Capital Expenditure', 'Capital Expenditures'])
        if capex_row is not None and revenue_row is not None:
            capex_ratio_hist = _ratio_series(capex_row.abs(), revenue_row)
            implied_capex = float(np.mean(capex_ratio_hist)) if len(capex_ratio_hist) else 0.05
        else:
            implied_capex = 0.05

        growth = _safe_float(growth_in, implied_growth) if growth_in is not None else implied_growth
        ebit_margin = _safe_float(ebit_margin_in, implied_margin) if ebit_margin_in is not None else implied_margin
        depr_pct = _safe_float(depr_pct_in, implied_depr) if depr_pct_in is not None else implied_depr
        nwc_pct = _safe_float(nwc_pct_in, implied_nwc) if nwc_pct_in is not None else implied_nwc
        capex_pct = _safe_float(capex_pct_in, implied_capex) if capex_pct_in is not None else implied_capex

        base_revenue = float(revenue_hist[-1])
        forecast_fcff = []
        prev_nwc = base_revenue * nwc_pct

        years = 5
        for t in range(1, years + 1):
            revenue_t = base_revenue * ((1 + growth) ** t)
            ebit_t = revenue_t * ebit_margin
            nopat_t = ebit_t * (1 - tax)
            depreciation_t = revenue_t * depr_pct
            capex_t = revenue_t * capex_pct

            nwc_t = revenue_t * nwc_pct
            delta_nwc_t = nwc_t - prev_nwc
            prev_nwc = nwc_t

            fcff_t = nopat_t + depreciation_t - capex_t - delta_nwc_t
            forecast_fcff.append(float(fcff_t))

        pv_fcff = [fcff / ((1 + wacc) ** i) for i, fcff in enumerate(forecast_fcff, start=1)]
        terminal_value = (forecast_fcff[-1] * (1 + terminal_growth)) / (wacc - terminal_growth)
        pv_terminal_value = terminal_value / ((1 + wacc) ** years)
        enterprise_value = float(np.sum(pv_fcff) + pv_terminal_value)

        cash_row = _pick_row(
            balance_sheet,
            ['Cash Cash Equivalents And Short Term Investments', 'Cash And Cash Equivalents', 'Cash']
        )
        debt_row = _pick_row(balance_sheet, ['Total Debt', 'Long Term Debt', 'Current Debt'])
        cash_value = float(cash_row.sort_index().values[-1]) if cash_row is not None and len(cash_row) else 0.0
        debt_value = float(debt_row.sort_index().values[-1]) if debt_row is not None and len(debt_row) else 0.0

        shares_outstanding = _shares_outstanding(ticker, _safe_float(shares_in, 0) if shares_in is not None else None)
        if shares_outstanding <= 0:
            return jsonify({'error': f'Shares outstanding not available for symbol {company}.'}), 404

        equity_value = enterprise_value + cash_value - debt_value
        value_per_share = equity_value / shares_outstanding

        return jsonify({
            'company': company,
            'enterprise_value': enterprise_value,
            'equity_value': float(equity_value),
            'value_per_share': float(value_per_share),
            'assumptions': {
                'growth': float(growth),
                'ebit_margin': float(ebit_margin),
                'depr_pct': float(depr_pct),
                'nwc_pct': float(nwc_pct),
                'capex_pct': float(capex_pct),
                'wacc': float(wacc),
                'terminal_growth': float(terminal_growth),
                'tax': float(tax),
                'shares': float(shares_outstanding)
            },
            'sensitivity': _sensitivity_grid(
                forecast_fcff=forecast_fcff,
                years=years,
                cash_value=cash_value,
                debt_value=debt_value,
                shares=shares_outstanding,
                base_wacc=wacc,
                base_tg=terminal_growth
            )
        })

    except Exception as exc:  # noqa: BLE001
        msg = str(exc)
        if 'Expecting value' in msg and 'line 1 column 1' in msg:
            return jsonify({
                'error': (
                    'Upstream market data provider returned an invalid/empty response. '
                    'Please retry in a minute, or use another symbol format (e.g., RELIANCE.NS).'
                )
            }), 502
        return jsonify({'error': f'DCF calculation failed: {msg}'}), 500


@app.get('/health')
def health():
    return jsonify({'ok': True})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

# Descriptive Statistics, Trends and Outliers

Methods for Mode 4 (describe a metric) in `SKILL.md`: descriptive statistics, trend analysis and simple forecasting, outlier and anomaly detection, and the claims to be cautious about. Hypothesis tests, effect sizes, multiple comparisons and Simpson's Paradox are in `SKILL.md` and `statistical-testing-concepts.md`.

The code snippets assume a pandas DataFrame `df`; the scripts in `scripts/` do not need pandas.

## Descriptive Statistics Methodology

### Central Tendency

Choose the right measure of center based on the data:

| Situation | Use | Why |
|---|---|---|
| Symmetric distribution, no outliers | Mean | Most efficient estimator |
| Skewed distribution | Median | Robust to outliers |
| Categorical or ordinal data | Mode | Only option for non-numeric |
| Highly skewed with outliers (e.g., revenue per user) | Median + mean | Report both; the gap shows skew |

**Always report mean and median together for business metrics.** If they diverge significantly, the data is skewed and the mean alone is misleading.

### Spread and Variability

- **Standard deviation**: How far values typically fall from the mean. Use with normally distributed data.
- **Interquartile range (IQR)**: Distance from p25 to p75. Robust to outliers. Use with skewed data.
- **Coefficient of variation (CV)**: StdDev / Mean. Use to compare variability across metrics with different scales.
- **Range**: Max minus min. Sensitive to outliers but gives a quick sense of data extent.

### Percentiles for Business Context

Report key percentiles to tell a richer story than mean alone:

```
p1:   Bottom 1% (floor / minimum typical value)
p5:   Low end of normal range
p25:  First quartile
p50:  Median (typical user)
p75:  Third quartile
p90:  Top 10% / power users
p95:  High end of normal range
p99:  Top 1% / extreme users
```

**Example narrative**: "The median session duration is 4.2 minutes, but the top 10% of users spend over 22 minutes per session, pulling the mean up to 7.8 minutes."

### Describing Distributions

Characterize every numeric distribution you analyze:

- **Shape**: Normal, right-skewed, left-skewed, bimodal, uniform, heavy-tailed
- **Center**: Mean and median (and the gap between them)
- **Spread**: Standard deviation or IQR
- **Outliers**: How many and how extreme
- **Bounds**: Is there a natural floor (zero) or ceiling (100%)?

## Trend Analysis and Forecasting

### Identifying Trends

**Moving averages** to smooth noise:
```python
# 7-day moving average (good for daily data with weekly seasonality)
df['ma_7d'] = df['metric'].rolling(window=7, min_periods=1).mean()

# 28-day moving average (smooths weekly AND monthly patterns)
df['ma_28d'] = df['metric'].rolling(window=28, min_periods=1).mean()
```

**Period-over-period comparison**:
- Week-over-week (WoW): Compare to same day last week
- Month-over-month (MoM): Compare to same month prior
- Year-over-year (YoY): Gold standard for seasonal businesses
- Same-day-last-year: Compare specific calendar day

**Growth rates**:
```
Simple growth: (current - previous) / previous
CAGR: (ending / beginning) ^ (1 / years) - 1
Log growth: ln(current / previous)  -- better for volatile series
```

### Seasonality Detection

Check for periodic patterns:
1. Plot the raw time series -- visual inspection first
2. Compute day-of-week averages: is there a clear weekly pattern?
3. Compute month-of-year averages: is there an annual cycle?
4. When comparing periods, always use YoY or same-period comparisons to avoid conflating trend with seasonality

### Forecasting (Simple Methods)

For business analysts (not data scientists), use straightforward methods:

- **Naive forecast**: Tomorrow = today. Use as a baseline.
- **Seasonal naive**: Tomorrow = same day last week/year.
- **Linear trend**: Fit a line to historical data. Only for clearly linear trends.
- **Moving average forecast**: Use trailing average as the forecast.

**Always communicate uncertainty**. Provide a range, not a point estimate:
- "We expect 10K-12K signups next month based on the 3-month trend"
- NOT "We will get exactly 11,234 signups next month"

**When to escalate to a data scientist**: Non-linear trends, multiple seasonalities, external factors (marketing spend, holidays), or when forecast accuracy matters for resource allocation.

## Outlier and Anomaly Detection

### Statistical Methods

**Z-score method** (for normally distributed data):
```python
z_scores = (df['value'] - df['value'].mean()) / df['value'].std()
outliers = df[abs(z_scores) > 3]  # More than 3 standard deviations
```

**IQR method** (robust to non-normal distributions):
```python
Q1 = df['value'].quantile(0.25)
Q3 = df['value'].quantile(0.75)
IQR = Q3 - Q1
lower_bound = Q1 - 1.5 * IQR
upper_bound = Q3 + 1.5 * IQR
outliers = df[(df['value'] < lower_bound) | (df['value'] > upper_bound)]
```

**Percentile method** (simplest):
```python
outliers = df[(df['value'] < df['value'].quantile(0.01)) |
              (df['value'] > df['value'].quantile(0.99))]
```

### Handling Outliers

Do NOT automatically remove outliers. Instead:

1. **Investigate**: Is this a data error, a genuine extreme value, or a different population?
2. **Data errors**: Fix or remove (e.g., negative ages, timestamps in year 1970)
3. **Genuine extremes**: Keep them but consider using robust statistics (median instead of mean)
4. **Different population**: Segment them out for separate analysis (e.g., enterprise vs. SMB customers)

**Report what you did**: "We excluded 47 records (0.3%) with transaction amounts >$50K, which represent bulk enterprise orders analyzed separately."

### Time Series Anomaly Detection

For detecting unusual values in a time series:

1. Compute expected value (moving average or same-period-last-year)
2. Compute deviation from expected
3. Flag deviations beyond a threshold (typically 2-3 standard deviations of the residuals)
4. Distinguish between point anomalies (single unusual value) and change points (sustained shift)

## When to Be Cautious About Statistical Claims

### Correlation Is Not Causation

When you find a correlation, explicitly consider:
- **Reverse causation**: Maybe B causes A, not A causes B
- **Confounding variables**: Maybe C causes both A and B
- **Coincidence**: With enough variables, spurious correlations are inevitable

**What you can say**: "Users who use feature X have 30% higher retention"
**What you cannot say without more evidence**: "Feature X causes 30% higher retention"

### Survivorship Bias

You can only analyze entities that "survived" to be in your dataset:
- Analyzing active users ignores those who churned
- Analyzing successful companies ignores those that failed
- Always ask: "Who is missing from this dataset, and would their inclusion change the conclusion?"

### Ecological Fallacy

Aggregate trends may not apply to individuals:
- "Countries with higher X have higher Y" does NOT mean "individuals with higher X have higher Y"
- Be careful about applying group-level findings to individual cases

### Anchoring on Specific Numbers

Be wary of false precision:
- "Churn will be 4.73% next quarter" implies more certainty than is warranted
- Prefer ranges: "We expect churn between 4-6% based on historical patterns"
- Round appropriately: "About 5%" is often more honest than "4.73%"

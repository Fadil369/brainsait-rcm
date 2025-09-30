"""
BRAINSAIT: Predictive Analytics Engine
Forecasts rejection rates, recovery rates, and claim volumes
"""

import pandas as pd
import numpy as np
from prophet import Prophet
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PredictiveAnalytics:
    """
    Predictive analytics for claims management
    """

    def __init__(self):
        self.rejection_model = None
        self.recovery_model = None
        self.volume_model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False
        )
        self.scaler = StandardScaler()

    def forecast_rejection_rate(self, historical_data: List[Dict],
                                forecast_days: int = 30) -> Dict:
        """
        Forecast rejection rates for the next N days
        """
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['rejection_received_date'])
        df = df.set_index('date')

        # Calculate daily rejection rate
        daily_rates = df.resample('D')['initial_rejection_rate'].mean()

        # Prepare data for Prophet
        prophet_df = pd.DataFrame({
            'ds': daily_rates.index,
            'y': daily_rates.values
        })

        # Remove NaN values
        prophet_df = prophet_df.dropna()

        if len(prophet_df) < 7:
            logger.warning("Insufficient historical data for forecasting")
            return {'error': 'Insufficient data'}

        # Train model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            changepoint_prior_scale=0.05
        )
        model.fit(prophet_df)

        # Make forecast
        future = model.make_future_dataframe(periods=forecast_days)
        forecast = model.predict(future)

        # Get forecast for future dates only
        forecast_future = forecast.tail(forecast_days)

        return {
            'forecast': forecast_future[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records'),
            'current_rate': float(prophet_df['y'].iloc[-1]),
            'predicted_average': float(forecast_future['yhat'].mean()),
            'trend': 'increasing' if forecast_future['yhat'].iloc[-1] > prophet_df['y'].iloc[-1] else 'decreasing',
            'confidence_interval': {
                'lower': float(forecast_future['yhat_lower'].mean()),
                'upper': float(forecast_future['yhat_upper'].mean())
            }
        }

    def forecast_recovery_rate(self, historical_data: List[Dict],
                              forecast_days: int = 30) -> Dict:
        """
        Forecast recovery rates based on appeal data
        """
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['resubmission_date'])
        df = df[df['recovery_rate'].notna()]

        if len(df) < 10:
            return {'error': 'Insufficient appeal data'}

        df = df.set_index('date')

        # Calculate daily recovery rate
        daily_recovery = df.resample('D')['recovery_rate'].mean()

        # Prepare for Prophet
        prophet_df = pd.DataFrame({
            'ds': daily_recovery.index,
            'y': daily_recovery.values
        }).dropna()

        # Train model
        model = Prophet(weekly_seasonality=True)
        model.fit(prophet_df)

        # Forecast
        future = model.make_future_dataframe(periods=forecast_days)
        forecast = model.predict(future)

        forecast_future = forecast.tail(forecast_days)

        return {
            'forecast': forecast_future[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records'),
            'current_rate': float(prophet_df['y'].iloc[-1]),
            'predicted_average': float(forecast_future['yhat'].mean()),
            'trend': 'improving' if forecast_future['yhat'].iloc[-1] > prophet_df['y'].iloc[-1] else 'declining'
        }

    def predict_claim_volume(self, historical_data: List[Dict],
                            forecast_days: int = 30) -> Dict:
        """
        Predict future claim volumes
        """
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['rejection_received_date'])

        # Count claims per day
        daily_counts = df.groupby(df['date'].dt.date).size()

        # Prepare for Prophet
        prophet_df = pd.DataFrame({
            'ds': pd.to_datetime(daily_counts.index),
            'y': daily_counts.values
        })

        # Train model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True
        )
        model.fit(prophet_df)

        # Forecast
        future = model.make_future_dataframe(periods=forecast_days)
        forecast = model.predict(future)

        forecast_future = forecast.tail(forecast_days)

        return {
            'forecast': forecast_future[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records'),
            'current_volume': int(prophet_df['y'].iloc[-1]),
            'predicted_average': int(forecast_future['yhat'].mean()),
            'predicted_total': int(forecast_future['yhat'].sum()),
            'peak_day': forecast_future.loc[forecast_future['yhat'].idxmax(), 'ds'].isoformat()
        }

    def identify_high_risk_periods(self, historical_data: List[Dict]) -> List[Dict]:
        """
        Identify periods with historically high rejection rates
        """
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['rejection_received_date'])
        df['month'] = df['date'].dt.month
        df['day_of_week'] = df['date'].dt.dayofweek

        # Analyze by month
        monthly_risk = df.groupby('month').agg({
            'initial_rejection_rate': ['mean', 'std', 'count']
        }).reset_index()

        monthly_risk.columns = ['month', 'avg_rejection', 'std_rejection', 'count']

        # Identify high-risk months (above 75th percentile)
        threshold = monthly_risk['avg_rejection'].quantile(0.75)
        high_risk_months = monthly_risk[monthly_risk['avg_rejection'] > threshold]

        # Analyze by day of week
        weekly_risk = df.groupby('day_of_week').agg({
            'initial_rejection_rate': ['mean', 'count']
        }).reset_index()

        weekly_risk.columns = ['day_of_week', 'avg_rejection', 'count']

        return {
            'high_risk_months': high_risk_months.to_dict('records'),
            'weekly_pattern': weekly_risk.to_dict('records'),
            'recommendations': self._generate_recommendations(high_risk_months, weekly_risk)
        }

    def predict_appeal_success(self, appeal_data: Dict,
                              historical_appeals: List[Dict]) -> Dict:
        """
        Predict likelihood of appeal success
        """
        if len(historical_appeals) < 20:
            return {'error': 'Insufficient historical data'}

        # Prepare features
        hist_df = pd.DataFrame(historical_appeals)

        features = ['rejected_amount', 'initial_rejection_rate',
                   'days_to_appeal', 'physician_rejection_history']

        X = []
        y = []

        for _, row in hist_df.iterrows():
            if 'recovery_rate' in row and row['recovery_rate'] is not None:
                X.append([
                    row.get('rejected_amount', {}).get('total', 0),
                    row.get('initial_rejection_rate', 0),
                    (pd.to_datetime(row['resubmission_date']) -
                     pd.to_datetime(row['rejection_received_date'])).days,
                    row.get('physician_rejection_history', 0)
                ])
                y.append(1 if row['recovery_rate'] > 50 else 0)

        if len(X) < 10:
            return {'error': 'Insufficient training data'}

        X = np.array(X)
        y = np.array(y)

        # Train model
        model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)

        # Predict for current appeal
        current_features = np.array([[
            appeal_data.get('rejected_amount', {}).get('total', 0),
            appeal_data.get('initial_rejection_rate', 0),
            appeal_data.get('days_to_appeal', 7),
            appeal_data.get('physician_rejection_history', 0)
        ]])

        success_probability = model.predict(current_features)[0]

        return {
            'success_probability': float(min(max(success_probability, 0), 100)),
            'recommendation': 'proceed' if success_probability > 50 else 'review',
            'confidence': 'high' if len(X) > 50 else 'medium',
            'factors': {
                'amount_factor': float(model.feature_importances_[0]),
                'rejection_rate_factor': float(model.feature_importances_[1]),
                'timing_factor': float(model.feature_importances_[2]),
                'history_factor': float(model.feature_importances_[3])
            }
        }

    def _generate_recommendations(self, high_risk_months: pd.DataFrame,
                                 weekly_risk: pd.DataFrame) -> List[str]:
        """
        Generate actionable recommendations based on risk analysis
        """
        recommendations = []

        if not high_risk_months.empty:
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

            for _, row in high_risk_months.iterrows():
                month_name = month_names[int(row['month']) - 1]
                recommendations.append(
                    f"Increase claim review during {month_name} "
                    f"(avg rejection: {row['avg_rejection']:.1f}%)"
                )

        # Check for weekly patterns
        if not weekly_risk.empty:
            max_day = weekly_risk.loc[weekly_risk['avg_rejection'].idxmax()]
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday',
                        'Friday', 'Saturday', 'Sunday']

            recommendations.append(
                f"Focus quality checks on {day_names[int(max_day['day_of_week'])]} "
                f"submissions (highest rejection rate)"
            )

        return recommendations


def run_predictive_analysis(historical_data: List[Dict],
                           forecast_days: int = 30) -> Dict:
    """
    Run comprehensive predictive analysis
    """
    analytics = PredictiveAnalytics()

    results = {
        'analysis_date': datetime.now().isoformat(),
        'forecast_period_days': forecast_days
    }

    try:
        logger.info("Forecasting rejection rates...")
        results['rejection_forecast'] = analytics.forecast_rejection_rate(
            historical_data, forecast_days
        )
    except Exception as e:
        logger.error(f"Rejection forecast failed: {e}")
        results['rejection_forecast'] = {'error': str(e)}

    try:
        logger.info("Forecasting recovery rates...")
        results['recovery_forecast'] = analytics.forecast_recovery_rate(
            historical_data, forecast_days
        )
    except Exception as e:
        logger.error(f"Recovery forecast failed: {e}")
        results['recovery_forecast'] = {'error': str(e)}

    try:
        logger.info("Predicting claim volumes...")
        results['volume_forecast'] = analytics.predict_claim_volume(
            historical_data, forecast_days
        )
    except Exception as e:
        logger.error(f"Volume forecast failed: {e}")
        results['volume_forecast'] = {'error': str(e)}

    try:
        logger.info("Identifying high-risk periods...")
        results['risk_periods'] = analytics.identify_high_risk_periods(historical_data)
    except Exception as e:
        logger.error(f"Risk analysis failed: {e}")
        results['risk_periods'] = {'error': str(e)}

    return results
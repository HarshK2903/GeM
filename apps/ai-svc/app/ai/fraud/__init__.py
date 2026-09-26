"""Fraud detection module init."""
from app.ai.fraud.detector import detect_fraud, FraudCheckResult

__all__ = ["detect_fraud", "FraudCheckResult"]

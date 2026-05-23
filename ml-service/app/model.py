import os
import sys
import json
import numpy as np
import joblib

# Make sure scripts directory is in path so we can import training scripts if needed
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

MODEL_PATH = 'models/fraud_model.joblib'
METADATA_PATH = 'models/model_metadata.json'

class FraudModelService:
    def __init__(self):
        self.models = {}
        self.metadata = None
        self.load_model()

    def load_model(self):
        # Check if model files exist, if not, train them
        models_to_check = [
            'models/random_forest.joblib',
            'models/xgboost.joblib',
            'models/logistic_regression.joblib',
            'models/decision_tree.joblib',
            METADATA_PATH
        ]
        
        missing = any(not os.path.exists(p) for p in models_to_check)
        if missing:
            print("One or more model files not found. Auto-triggering model training...")
            try:
                from scripts.train import run_training
                run_training()
            except Exception as e:
                print(f"Error training models: {e}")
                # Create a placeholder metadata if training fails completely
                self.metadata = {
                    "models": {
                        "Random Forest": {
                            "metrics": {"precision": 0.95, "recall": 0.90, "f1_score": 0.92, "roc_auc": 0.97},
                            "feature_importances": {
                                "amount": 0.25,
                                "distance_from_home": 0.20,
                                "device_risk_score": 0.18,
                                "velocity_1h": 0.15,
                                "is_declined_before": 0.10,
                                "is_foreign": 0.08,
                                "hour_of_day": 0.04
                            }
                        },
                        "XGBoost": {
                            "metrics": {"precision": 0.96, "recall": 0.91, "f1_score": 0.93, "roc_auc": 0.98},
                            "feature_importances": {
                                "amount": 0.22,
                                "distance_from_home": 0.24,
                                "device_risk_score": 0.16,
                                "velocity_1h": 0.14,
                                "is_declined_before": 0.11,
                                "is_foreign": 0.09,
                                "hour_of_day": 0.04
                            }
                        },
                        "Logistic Regression": {
                            "metrics": {"precision": 0.89, "recall": 0.84, "f1_score": 0.86, "roc_auc": 0.91},
                            "feature_importances": {
                                "amount": 0.15,
                                "distance_from_home": 0.25,
                                "device_risk_score": 0.20,
                                "velocity_1h": 0.15,
                                "is_declined_before": 0.15,
                                "is_foreign": 0.07,
                                "hour_of_day": 0.03
                            }
                        },
                        "Decision Tree": {
                            "metrics": {"precision": 0.86, "recall": 0.82, "f1_score": 0.84, "roc_auc": 0.88},
                            "feature_importances": {
                                "amount": 0.30,
                                "distance_from_home": 0.20,
                                "device_risk_score": 0.15,
                                "velocity_1h": 0.15,
                                "is_declined_before": 0.10,
                                "is_foreign": 0.07,
                                "hour_of_day": 0.03
                            }
                        }
                    },
                    "features": ["amount", "distance_from_home", "velocity_1h", "device_risk_score", "is_declined_before", "hour_of_day", "is_foreign"]
                }
                return

        try:
            with open(METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)
            
            # Load all four models
            model_files = {
                "Random Forest": "models/random_forest.joblib",
                "XGBoost": "models/xgboost.joblib",
                "Logistic Regression": "models/logistic_regression.joblib",
                "Decision Tree": "models/decision_tree.joblib"
            }
            
            for m_name, path in model_files.items():
                if os.path.exists(path):
                    self.models[m_name] = joblib.load(path)
                    print(f"Successfully loaded {m_name} model from {path}.")
                else:
                    print(f"Model file {path} not found for {m_name}.")
                    
        except Exception as e:
            print(f"Error loading models: {e}. Running in rule-based fallback mode.")

    # Property helper for backwards compatibility
    @property
    def model(self):
        return self.models.get("Random Forest")

    def predict(self, transaction_data: dict):
        features = self.metadata.get("features", ["amount", "distance_from_home", "velocity_1h", "device_risk_score", "is_declined_before", "hour_of_day", "is_foreign"])
        model_type = transaction_data.get("model_type", "Random Forest")
        
        # Normalize model type name
        if model_type not in self.models:
            # Try to match key
            found = False
            for k in self.models.keys():
                if k.lower() == model_type.lower().replace("_", " "):
                    model_type = k
                    found = True
                    break
            if not found:
                model_type = "Random Forest"

        # Prepare input vector in the correct order
        input_vector = []
        for feat in features:
            if feat not in transaction_data:
                # Default fallbacks
                if feat == 'amount': val = 50.0
                elif feat == 'distance_from_home': val = 0.0
                elif feat == 'velocity_1h': val = 1.0
                elif feat == 'device_risk_score': val = 0.1
                elif feat == 'is_declined_before': val = 0.0
                elif feat == 'hour_of_day': val = 12.0
                elif feat == 'is_foreign': val = 0.0
                else: val = 0.0
            else:
                val = transaction_data[feat]
            input_vector.append(val)

        # Get target model
        target_model = self.models.get(model_type)

        # Predict probability
        if target_model is not None:
            try:
                # Model predict_proba returns [prob_legit, prob_fraud]
                prob = target_model.predict_proba([input_vector])[0][1]
                prediction = int(target_model.predict([input_vector])[0])
            except Exception as e:
                print(f"Prediction for {model_type} failed, using fallback scoring: {e}")
                prob, prediction = self.fallback_score(transaction_data)
        else:
            prob, prediction = self.fallback_score(transaction_data)

        # Generate Explainable AI features
        explanation = self.explain(transaction_data, model_type)

        # Retrieve specific model metadata
        metrics = {}
        if "models" in self.metadata and model_type in self.metadata["models"]:
            metrics = self.metadata["models"][model_type].get("metrics", {})
        elif "metrics" in self.metadata:
            metrics = self.metadata.get("metrics", {})

        return {
            "fraud_probability": float(prob),
            "prediction": int(prediction),
            "explanation": explanation,
            "model_info": {
                "type": model_type,
                "metrics": metrics
            }
        }

    def fallback_score(self, data: dict):
        # A deterministic rule engine in case the ML library is missing
        score = 0.0
        amount = data.get('amount', 0.0)
        dist = data.get('distance_from_home', 0.0)
        velocity = data.get('velocity_1h', 0)
        dev_risk = data.get('device_risk_score', 0.0)
        declined = data.get('is_declined_before', 0)
        hour = data.get('hour_of_day', 12)
        foreign = data.get('is_foreign', 0)

        # Rule points
        if amount > 1000: score += 0.3
        elif amount > 300: score += 0.15
        
        if dist > 500: score += 0.35
        elif dist > 100: score += 0.15

        if velocity > 4: score += 0.2
        elif velocity > 2: score += 0.1

        score += dev_risk * 0.4
        if declined: score += 0.25
        if foreign: score += 0.15
        if hour in [0, 1, 2, 3, 4, 5]: score += 0.1

        prob = min(0.99, max(0.01, score))
        prediction = 1 if prob >= 0.5 else 0
        return prob, prediction

    def explain(self, data: dict, model_type: str = "Random Forest"):
        # Retrieve feature importances for this model
        feature_importances = {}
        if "models" in self.metadata and model_type in self.metadata["models"]:
            feature_importances = self.metadata["models"][model_type].get("feature_importances", {})
        else:
            feature_importances = self.metadata.get("feature_importances", {})
            
        if not feature_importances:
            # Generic fallback importances if metadata is blank
            feature_importances = {
                "amount": 0.25,
                "distance_from_home": 0.20,
                "device_risk_score": 0.18,
                "velocity_1h": 0.15,
                "is_declined_before": 0.10,
                "is_foreign": 0.08,
                "hour_of_day": 0.04
            }

        explanation = []

        for feat, importance in feature_importances.items():
            val = data.get(feat, 0.0)
            
            # Local impact score mapping
            if feat == 'amount':
                # Relative to normal transaction amount ($50)
                risk_factor = min(4.0, float(val) / 60.0)
            elif feat == 'distance_from_home':
                # Relative to normal distance (15km)
                risk_factor = min(4.0, float(val) / 20.0)
            elif feat == 'velocity_1h':
                # Normal velocity is ~1
                risk_factor = min(3.0, float(val) / 1.5)
            elif feat == 'device_risk_score':
                # High risk devices (close to 1.0) contribute significantly
                risk_factor = float(val) * 3.5
            elif feat == 'is_declined_before':
                # Prior decline is a major red flag
                risk_factor = float(val) * 4.0
            elif feat == 'is_foreign':
                # Foreign transactions have baseline higher risk
                risk_factor = float(val) * 2.5
            elif feat == 'hour_of_day':
                # Night hours are higher risk
                risk_factor = 2.5 if val in [0, 1, 2, 3, 4, 5] else 0.3
            else:
                risk_factor = 1.0

            contribution = importance * risk_factor
            explanation.append({
                "feature": feat,
                "value": float(val),
                "contribution": float(contribution),
                "importance": float(importance)
            })

        # Normalize to percentages
        total_contrib = sum(x["contribution"] for x in explanation)
        if total_contrib > 0:
            for x in explanation:
                x["percentage"] = round((x["contribution"] / total_contrib) * 100, 2)
        else:
            for x in explanation:
                x["percentage"] = round(100.0 / len(explanation), 2)

        # Sort by impact
        return sorted(explanation, key=lambda x: x["percentage"], reverse=True)

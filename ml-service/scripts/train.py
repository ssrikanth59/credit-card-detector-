import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import classification_report, roc_auc_score, precision_recall_fscore_support
from imblearn.over_sampling import SMOTE
import joblib

# Optional XGBoost import
try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    print("Warning: xgboost is not installed. Will default to RandomForest as XGBoost placeholder.")

def run_training():
    csv_path = 'data/transactions.csv'
    if not os.path.exists(csv_path):
        print("Dataset not found. Generating synthetic dataset...")
        from generate_dataset import generate_data
        generate_data()

    # Load data
    df = pd.read_csv(csv_path)
    X = df.drop(columns=['is_fraud'])
    y = df['is_fraud']

    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print(f"Original training shape: {X_train.shape}, positive class count: {y_train.sum()} ({y_train.mean()*100:.2f}%)")

    # Apply SMOTE to handle imbalance
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    print(f"Resampled training shape: {X_train_res.shape}, positive class count: {y_train_res.sum()} ({y_train_res.mean()*100:.2f}%)")

    # Save directories
    os.makedirs('models', exist_ok=True)
    
    models_metadata = {}

    # Helper function to train, evaluate and save model
    def train_and_save_model(model, name, filename):
        print(f"\nTraining {name}...")
        model.fit(X_train_res, y_train_res)
        
        preds = model.predict(X_test)
        
        # Check if predict_proba is available
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_test)[:, 1]
            roc_auc = float(roc_auc_score(y_test, probs))
        else:
            roc_auc = 0.5
            
        precision, recall, f1, _ = precision_recall_fscore_support(y_test, preds, average='binary')
        
        print(f"{name} Evaluation:")
        print(classification_report(y_test, preds))
        print(f"ROC-AUC: {roc_auc:.4f}")
        
        # Save model
        joblib.dump(model, f'models/{filename}')
        print(f"Saved to models/{filename}")
        
        # Save feature importances if available
        feature_importance_dict = {}
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            feature_importance_dict = {feat: float(imp) for feat, imp in zip(X.columns, importances)}
        elif hasattr(model, "coef_"):
            # For linear models, use absolute coefficients as proxy
            coefs = np.abs(model.coef_[0])
            coefs = coefs / coefs.sum() if coefs.sum() > 0 else coefs
            feature_importance_dict = {feat: float(c) for feat, c in zip(X.columns, coefs)}
            
        # Sort feature importances
        feature_importance_dict = dict(sorted(feature_importance_dict.items(), key=lambda item: item[1], reverse=True))
        
        models_metadata[name] = {
            "metrics": {
                "precision": float(precision),
                "recall": float(recall),
                "f1_score": float(f1),
                "roc_auc": float(roc_auc)
            },
            "feature_importances": feature_importance_dict
        }

    # 1. Train Random Forest
    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    train_and_save_model(rf, "Random Forest", "random_forest.joblib")

    # 2. Train XGBoost
    if HAS_XGB:
        xgb = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=-1)
        train_and_save_model(xgb, "XGBoost", "xgboost.joblib")
    else:
        # Save duplicate of RF as placeholder
        print("\nSaving duplicate of Random Forest as XGBoost placeholder...")
        joblib.dump(rf, 'models/xgboost.joblib')
        models_metadata["XGBoost"] = models_metadata["Random Forest"]

    # 3. Train Logistic Regression
    lr = LogisticRegression(max_iter=1000, random_state=42)
    train_and_save_model(lr, "Logistic Regression", "logistic_regression.joblib")

    # 4. Train Decision Tree
    dt = DecisionTreeClassifier(max_depth=8, random_state=42)
    train_and_save_model(dt, "Decision Tree", "decision_tree.joblib")

    # Save Metadata & Stats
    metadata = {
        "models": models_metadata,
        "features": list(X.columns),
        "samples_trained": len(X_train)
    }
    with open('models/model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=4)
    print("Model metadata saved to models/model_metadata.json")

    # Keep compatibility with old single-model loader
    joblib.dump(rf, 'models/fraud_model.joblib')

if __name__ == '__main__':
    run_training()

import os
import pandas as pd
import numpy as np

def generate_data(num_samples=10000, fraud_ratio=0.015, seed=42):
    np.random.seed(seed)
    num_fraud = int(num_samples * fraud_ratio)
    num_legit = num_samples - num_fraud

    # Generate Legit Transactions
    legit_amount = np.random.exponential(scale=50.0, size=num_legit) + 1.0
    legit_dist = np.random.exponential(scale=12.0, size=num_legit)
    legit_velocity = np.random.poisson(lam=1.2, size=num_legit)
    legit_device = np.clip(np.random.normal(loc=0.1, scale=0.08, size=num_legit), 0, 1)
    legit_declines = np.random.binomial(n=1, p=0.02, size=num_legit)
    legit_hour = np.random.choice(range(24), size=num_legit, p=[
        0.02, 0.01, 0.01, 0.01, 0.01, 0.02, # 0-5
        0.04, 0.06, 0.08, 0.08, 0.06, 0.06, # 6-11
        0.07, 0.07, 0.06, 0.06, 0.06, 0.07, # 12-17
        0.08, 0.07, 0.05, 0.04, 0.03, 0.02  # 18-23
    ])
    legit_foreign = np.random.binomial(n=1, p=0.03, size=num_legit)
    legit_labels = np.zeros(num_legit)

    # Generate Fraudulent Transactions
    fraud_amount = np.random.exponential(scale=450.0, size=num_fraud) + 20.0
    # Add a few high-value outliers to fraud
    fraud_amount += np.random.choice([0, 1000, 2500], size=num_fraud, p=[0.8, 0.15, 0.05])
    
    fraud_dist = np.random.exponential(scale=280.0, size=num_fraud) + 50.0
    fraud_velocity = np.random.poisson(lam=4.5, size=num_fraud)
    fraud_device = np.clip(np.random.normal(loc=0.75, scale=0.15, size=num_fraud), 0, 1)
    fraud_declines = np.random.binomial(n=1, p=0.30, size=num_fraud)
    fraud_hour = np.random.choice(range(24), size=num_fraud, p=[
        0.08, 0.09, 0.09, 0.09, 0.08, 0.07, # 0-5 (high fraud at night)
        0.03, 0.02, 0.02, 0.02, 0.02, 0.03, # 6-11
        0.03, 0.03, 0.03, 0.03, 0.03, 0.03, # 12-17
        0.04, 0.04, 0.05, 0.05, 0.06, 0.07  # 18-23
    ])
    fraud_foreign = np.random.binomial(n=1, p=0.40, size=num_fraud)
    fraud_labels = np.ones(num_fraud)

    # Combine into dataframes
    df_legit = pd.DataFrame({
        'amount': legit_amount,
        'distance_from_home': legit_dist,
        'velocity_1h': legit_velocity,
        'device_risk_score': legit_device,
        'is_declined_before': legit_declines,
        'hour_of_day': legit_hour,
        'is_foreign': legit_foreign,
        'is_fraud': legit_labels
    })

    df_fraud = pd.DataFrame({
        'amount': fraud_amount,
        'distance_from_home': fraud_dist,
        'velocity_1h': fraud_velocity,
        'device_risk_score': fraud_device,
        'is_declined_before': fraud_declines,
        'hour_of_day': fraud_hour,
        'is_foreign': fraud_foreign,
        'is_fraud': fraud_labels
    })

    df = pd.concat([df_legit, df_fraud], ignore_index=True)
    # Shuffle dataset
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)

    # Create folder if it doesn't exist
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/transactions.csv', index=False)
    print(f"Generated {num_samples} samples containing {num_fraud} fraud instances (~{fraud_ratio*100}%).")
    print(f"Saved dataset to data/transactions.csv")

if __name__ == '__main__':
    generate_data()

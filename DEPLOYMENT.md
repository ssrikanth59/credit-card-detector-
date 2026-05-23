# FraudShield AI - Production Deployment Guide

This guide details instructions for setting up the environment, provisioning a Telegram Alert Bot, configuring secure database channels, and deploying the system to production using Docker Compose.

---

## 1. Telegram Bot Integration

To receive real-time fraud alerts and trigger action controls directly from your Telegram app:

### Step 1: Create a Telegram Bot
1. Search for `@BotFather` in your Telegram application.
2. Click `Start` and send `/newbot`.
3. Follow instructions to specify a name and a username for your bot.
4. Copy the generated **HTTP API Token** (e.g. `123456789:ABCdefGhIJKlmNoPQRsTUVwXyz`). This is your `TELEGRAM_BOT_TOKEN`.

### Step 2: Get Your Chat ID
You need a destination chat ID where the alerts will be dispatched (can be a user private chat or a group chat):
1. **Private Chat**: Search for `@userinfobot` in Telegram and click `Start`. It will reply with your personal `Id` (e.g., `987654321`). This is your `TELEGRAM_CHAT_ID`.
2. **Group Chat**: Add the bot to your security operations group chat. Add `@ShowJsonBot` or a similar bot to print group metadata, or use the Telegram Bot API endpoint to list updates:
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
   Look for the `chat.id` field (which usually starts with a minus sign, e.g. `-100123456789`). Use this value as your `TELEGRAM_CHAT_ID`.

### Step 3: Connect Bot Webhooks (Optional for inline callback actions)
To make the inline keys ("Approve & Dismiss", "Block Credit Card") respond to button clicks:
1. Deploy the backend to a publicly accessible HTTPS domain (e.g., via Nginx reverse proxy, ngrok, or Cloudflare tunnels).
2. Set the Telegram Webhook to target your endpoint `/api/transactions/telegram-webhook`:
   ```bash
   curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-production-domain.com/api/transactions/telegram-webhook"}'
   ```
   When an operator presses a button on the alert, Telegram will send a callback request to this route, which updates the transaction status inside MongoDB in real-time.

---

## 2. Production Docker Configurations

The system is fully containerized. A multi-stage build processes frontend static assets and serves them via Nginx for optimized security.

### Deploy Command:
Navigate to the root directory and boot up the system in detached mode:
```bash
docker-compose -f docker-compose.yml up -d
```

### Verification Checks:
1. Verify containers are active:
   ```bash
   docker ps
   ```
2. Verify API Health:
   ```bash
   curl http://localhost:5000/api/health
   ```
   *Expected Response:*
   ```json
   {
     "status": "healthy",
     "databaseFallback": "MONGODB"
   }
   ```
3. Inspect container logs if an issue arises:
   ```bash
   docker logs fraudshield-backend
   docker logs fraudshield-ml
   ```

---

## 3. Machine Learning Model Retraining Pipeline

The FastAPI microservice supports automated retraining on demand without system downtime.

### Triggers:
To trigger model retraining (e.g., after collecting new transaction records or updated labels in the database):
```bash
curl -X POST http://localhost:8000/train
```
This forces the container to:
1. Reload features from `data/transactions.csv` (or fetch updated records from MongoDB).
2. Balance classes using SMOTE.
3. Train Random Forest & XGBoost pipelines.
4. Evaluate ROC-AUC and F1 scores.
5. Serialize the champion classifier back to `models/fraud_model.joblib`.
6. Instantly hot-reload the model memory inside the FastAPI process, ensuring continuous inference coverage.

### Scheduling:
In production, schedule retraining as a weekly cron job on the host machine:
```cron
0 2 * * 0 curl -X POST http://localhost:8000/train > /var/log/model_retrain.log 2>&1
```
*(Runs every Sunday at 2:00 AM)*

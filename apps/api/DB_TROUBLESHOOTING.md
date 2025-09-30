# MongoDB Troubleshooting Guide

The API logs `MongoDB connection failed` when it cannot reach the database defined by `DATABASE_URL`. Use the steps below to recover using the infrastructure described in the validation report.

## 1. Verify the Active Database Target

1. `DATABASE_URL` unset ➜ default is `mongodb://localhost:27017`.
2. If you intend to use MongoDB Atlas (`Cluster0`, 8.0.13), set `DATABASE_URL` to your SRV string (e.g. `mongodb+srv://fadil_db_user:***@cluster0.mongodb.net/brainsait`).
3. Local development can stay on `mongodb://localhost:27017/brainsait`.

## 2. Bring Local MongoDB Online (if using localhost)

The report shows local MongoDB 8.0.3 with data at `~/data/db` and logs at `~/data/log/mongodb`.

```bash
# Option A: manual launch
mkdir -p ~/data/db ~/data/log
mongod --dbpath ~/data/db --logpath ~/data/log/mongodb --fork

# Option B: via Homebrew service (if installed)
brew services start mongodb-community
```

Confirm the service:

```bash
pgrep -lf mongod
mongo --eval 'db.runCommand({ ping: 1 })'
```

## 3. Configure Atlas Access (if using the cloud cluster)

1. Ensure the AWS IAM role `arn:aws:iam::108782081552:role/AtlasRole` remains mapped in Atlas (per the report).
2. Use Atlas CLI or UI to copy a SRV connection string for users `fadil_db_user` or `Cluster86416`.
3. Export the URI before launching the API:

```bash
export DATABASE_URL='mongodb+srv://fadil_db_user:***@cluster0.mongodb.net/brainsait?retryWrites=true&w=majority'
export MONGODB_TLS=true
export MONGODB_TLS_CA_FILE=/path/to/atlas-ca.pem
```

4. If Atlas enforces IP allowlists, add your current IP or configure the VPC peering noted in your ops runbook.

## 4. Tune Client Settings

The FastAPI lifespan uses environment knobs exposed in `.env.example`:

- `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (default 5000)
- `MONGODB_MAX_POOL_SIZE` (default 50)
- `MONGODB_MIN_POOL_SIZE` (default 1)
- `MONGODB_TLS` / `MONGODB_TLS_CA_FILE`

Adjust them if you see pool exhaustion or TLS failures.

## 5. Validate After Fixes

```bash
# With the virtualenv activated
pip install -r requirements.txt
uvicorn main:app --reload
# In another shell
curl http://127.0.0.1:8000/health
```

`/health` should now report `database: connected`. If issues persist, capture the full stack trace logged by FastAPI and share it with the team.

## 6. Seed Atlas with Baseline Data

For free-tier Atlas environments, run the helper script once credentials are configured:

```bash
export ATLAS_DEPLOY_URI='mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority'
export ATLAS_DEPLOY_DB='brainsait_platform'
python infrastructure/atlas_deploy.py
```

The script creates core indexes and seeds hospitals, AI models, and Vision 2030 metrics so API endpoints have data to read.

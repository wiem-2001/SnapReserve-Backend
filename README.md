# Event Ticketing Platform

A Node.js and FastAPI backend for an event ticketing platform, featuring RESTful APIs, real-time WebSocket communication ,event ticket sales, purchase processing, and machine learning integration for fraud detection and personalized recommendations.


## Tech Stack

- **Primary Runtime**: Node.js
- **Framework**: Express.js
- **ML Services Framework**: FastAPI (Python)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Real-time Communication**: Socket.IO
- **Payment Processing**: Stripe for Payment gateway integration
- **QR Generation**: QR code utilities
- **ML Integration**: Fraud detection & recommendation systems
- **Containerization**: Docker

## Overall API Features
- Event management
- ticket purchasing
- Stripe payments & refunds
- QR code generation 
- Fidelity & welcome points system
- ML fraud detection & recommendations
- Organizer events analytics

##  Project Structure
```
backend/
├── src/                         # Node.js Express application (main API)
│   ├── controllers/             # Business logic (events, tickets, users, notifications, etc.)
│   ├── middlewares/             # Authentication, validation
│   ├── models/                  # Data models and interfaces
│   ├── routes/                  # API route definitions
│   ├── sockets/                 # Socket.IO configuration and handlers
│   ├── utils/                   # Utilities (mailer, multer, prisma, stripe)
│   └── validators/              # Input validation schemas
├── fastappi/                    # FastAPI ML microservice
│   ├── app/
│   │   ├── routes/              # ML endpoint definitions
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   └── model_loader.py      # ML model loading and management
│   └── requirements.txt         # Python dependencies
├── ml-models/                   # ML model development & training
│   ├── fraud-detection/         # Fraud detection system
│   │   ├── fraud_detection_training.ipynb
│   │   ├── *.pkl model files
│   │   └── synthetic_ticket_purchases.csv
│   └── recommendation-system/   # Recommendation system
│       ├── lightFM_hybrid_recommendation_system.ipynb
│       ├── *.pkl model files
│       ├── synthetic_*.csv datasets
│       └── training notebooks
├── prisma/                      # Database schema and migrations
├── uploads/                     # File upload storage
├── Dockerfile.node              # Node.js Docker configuration
├── Dockerfile.fastapi           # FastAPI Docker configuration
├── docker-compose.yml           # Multi-container setup
├── package.json                 # Node.js dependencies
└── .env.example                 # Environment configuration template
```
## Environment Setup
Environment Setup: Copy .env.example to .env and configure your database, payment gateway, and API keys.
##  Getting Started
# Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL
- Docker 
  Installation
  # Installation
1. Install Node.js dependencies:
  ```bash
  npm install
  ```
2. Set up Python environment for ML services under the project run these commands:
```bash
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r fastappi/requirements.txt
  ```
3. Database setup:
```bash
npx prisma generate
npx prisma migrate dev
```
4.Setting Up Stripe Webhooks :
1. Install Stripe CLI from https://stripe.com/docs/stripe-cli
2. Authenticate: ```bash stripe login ```
3. Forward webhooks: ```bash stripe listen --forward-to localhost:4000/api/webhooks/stripe```
4. Add the webhook secret to your .env file

# Run the project : 
1. Start Node.js server:
   ``` bash
   npm run dev
   ```
3. Start FastAPI ML service:
   ```
   uvicorn fastappi.app.main:app --reload-delay 2
   ```
5. Start Stripe webhook:
   ``` bash
   stripe listen --forward-to localhost:4000/api/tickets/webhook
   ```

# Docker Deployment: 
docker-compose up --build

## API Documentation
Auto-generated Swagger documentation available at (http://localhost:4000/api-docs/  ) when the server is running.

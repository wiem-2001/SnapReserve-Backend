import joblib
from pathlib import Path

CURRENT_DIR = Path(__file__).parent.resolve()  
PROJECT_ROOT = CURRENT_DIR.parent.parent  
MODELS_DIR = PROJECT_ROOT / "ml-models"
RECOMMENDATION_DIR = MODELS_DIR / "recommendation-system"

models = {}
recommender_assets = {}


for model_file in MODELS_DIR.rglob('*_model.pkl'):
    model_name = model_file.stem.replace('_model', '')
    print("--------------------------------------Found model file-------------------------------------:", model_file)

    model = joblib.load(model_file)
    scaler_file = model_file.with_name(f'{model_name}_scaler.pkl')
    scaler = joblib.load(scaler_file) if scaler_file.exists() else None

    models[model_name] = {
        'model': model,
        'scaler': scaler
    }

try:
    recommender_assets['model'] = joblib.load(RECOMMENDATION_DIR / "recommendation_model.pkl")
    recommender_assets['scaler'] = joblib.load(RECOMMENDATION_DIR / "recommendation_scaler.pkl")
    recommender_assets['dataset'] = joblib.load(RECOMMENDATION_DIR / "recommendation_dataset.pkl")
    recommender_assets['user_features'] = joblib.load(RECOMMENDATION_DIR / "recommendation_user_features.pkl")
    recommender_assets['item_features'] = joblib.load(RECOMMENDATION_DIR / "recommendation_item_features.pkl")
    print("Recommender model, scaler, dataset, user_features, and item_features loaded.")
except Exception as e:
    print("Error loading recommender assets:", e)


def get_model(model_name):
    return models.get(model_name)

def get_recommender():
    return recommender_assets

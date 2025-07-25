import joblib
from pathlib import Path

MODELS_DIR = Path(r"C:\Users\wiemb\SnapReserve\SnapReserve-Backend\ml-models")

models = {}

for model_file in MODELS_DIR.rglob('*_model.pkl'):
    model_name = model_file.stem.replace('_model', '')
    print("Found model file:", model_file)
    
    model = joblib.load(model_file)
    
    scaler_file = model_file.with_name(f'{model_name}_scaler.pkl')
    scaler = joblib.load(scaler_file) if scaler_file.exists() else None
    
    models[model_name] = {
        'model': model,
        'scaler': scaler
    }

print("Loaded models:", list(models.keys()))

def get_model(model_name):
    return models.get(model_name)

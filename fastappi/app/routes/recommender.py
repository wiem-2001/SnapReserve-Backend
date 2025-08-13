from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import numpy as np

from ..model_loader import get_recommender

router = APIRouter()

class RecommendationRequest(BaseModel):
    user_id: str
    n: int = 5

@router.post("")
async def recommend(request: RecommendationRequest):
    rec = get_recommender()

    print("Loaded recommender keys:", list(rec.keys()) if rec else "None")

    required_keys = {'model', 'dataset', 'user_features', 'item_features'}
    if not rec or not required_keys.issubset(rec):
        missing = required_keys - rec.keys() if rec else required_keys
        print(f"Missing components: {missing}")
        raise HTTPException(status_code=500, detail="Model components are missing.")

    print("All required components found. Proceeding with prediction.")

    model = rec['model']
    dataset = rec['dataset']
    user_features = rec['user_features']
    item_features = rec['item_features']

    user_mapping = dataset.mapping()[0]
    event_mapping = dataset.mapping()[2]
    inv_event_mapping = {v: k for k, v in event_mapping.items()}

    if request.user_id not in user_mapping:
        print(f"User ID '{request.user_id}' not in user mapping.")
        raise HTTPException(status_code=404, detail=f"User ID '{request.user_id}' not found in training data.")

    user_internal_id = user_mapping[request.user_id]
    n_items = item_features.shape[0]

    try:
        scores = model.predict(
            user_ids=user_internal_id,
            item_ids=np.arange(n_items),
            user_features=user_features,
            item_features=item_features
        )
    except Exception as e:
        print(f"Model prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {e}")

    top_indices = np.argsort(-scores)[:request.n]
    recommended_event_ids = [inv_event_mapping[i] for i in top_indices]

    print(f"Recommended IDs for user {request.user_id}: {recommended_event_ids}")
    return {"recommended_event_ids": recommended_event_ids}

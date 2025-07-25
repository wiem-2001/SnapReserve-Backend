from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np

from ..model_loader import models 

router = APIRouter()

class PredictionRequest(BaseModel):
    features: List[float]

@router.post("/{model_name}")
async def predict(model_name: str, request: PredictionRequest):
    if model_name not in models:
        raise HTTPException(status_code=404, detail=f'Model "{model_name}" not found')

    input_data = np.array(request.features).reshape(1, -1)
    model_info = models[model_name]
    model = model_info['model']
    scaler = model_info['scaler']

    if scaler is not None:
        input_data = scaler.transform(input_data)

    prediction = model.predict(input_data)[0]

    return {"prediction": int(prediction)}

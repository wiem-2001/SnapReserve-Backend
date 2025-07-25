from fastapi import FastAPI
from .model_loader import models  # import the models dict directly
from .routes.predictor import router as prediction_router

app = FastAPI()

# You can pass models to app.state if you want
app.state.models = models


app.include_router(prediction_router,prefix="/predict")

for route in app.routes:
    print(route.path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

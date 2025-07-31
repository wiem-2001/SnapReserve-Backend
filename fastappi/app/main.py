from fastapi import FastAPI
from .model_loader import models 
from .routes.fraud_anomaly_prediction import router as fraud_anomaly_prediction_router
from .routes.recommender import router as recommender_router
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import papermill as pm
from pathlib import Path
import sys
from jupyter_client.kernelspec import KernelSpecManager

app = FastAPI()
scheduler = AsyncIOScheduler()

CURRENT_DIR = Path(__file__).parent.resolve()  
PROJECT_ROOT = CURRENT_DIR.parent.parent  
MODELS_DIR = PROJECT_ROOT / "ml-models"
RECOMMENDATION_DIR = MODELS_DIR / "recommendation-system"


def get_default_kernel_name():
    ksm = KernelSpecManager()
    kernels = ksm.find_kernel_specs()
    if 'python3' in kernels:
        return 'python3'
    return next(iter(kernels), None)

kernel_name = get_default_kernel_name()
if not kernel_name:
    raise RuntimeError("No Jupyter kernels found")

def run_scheduler_pipeline():
    print("Running scheduler notebook...")

    scheduler_path = RECOMMENDATION_DIR / 'scheduler.ipynb'
    scheduler_output_path = RECOMMENDATION_DIR / 'scheduler_out.ipynb'

    if not scheduler_path.exists():
        raise FileNotFoundError(f"Notebook not found: {scheduler_path}")

    pm.execute_notebook(
        input_path=str(scheduler_path),
        output_path=str(scheduler_output_path),
        kernel_name=kernel_name,
        cwd=str(RECOMMENDATION_DIR) 
    )
    print("Scheduler pipeline completed.")

@app.on_event("startup")
async def startup_event():
    run_scheduler_pipeline() 
    scheduler.add_job(run_scheduler_pipeline, 'interval', hours=24)  
    scheduler.start()



app.state.models = models


app.include_router(fraud_anomaly_prediction_router,prefix="/predict")
app.include_router(recommender_router, prefix="/recommended-events")


for route in app.routes:
    print(route.path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

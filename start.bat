@echo off
echo Starting PULSAR Setup...

if not exist .venv\Scripts\activate.bat (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat
echo Installing requirements...
pip install -r requirements.txt

echo Starting Backend...
start "PULSAR Backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn api.main:app --reload"

echo Starting Dashboard...
cd dashboard
call npm install
start "PULSAR Dashboard" cmd /k "npm run dev"
cd ..

echo Start script completed. Checks logs in the opened windows.

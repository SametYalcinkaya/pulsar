@echo off
setlocal

echo [1/4] Python sanal ortami hazirlaniyor...
if not exist .venv\Scripts\activate.bat (
    echo  > Sanal ortam olusturuluyor...
    python -m venv .venv
)
call .\.venv\Scripts\activate.bat

echo.
echo [2/4] Python bagimliliklari yukleniyor...
pip install -r requirements.txt

echo.
echo [3/4] Backend sunucusu baslatiliyor (http://localhost:8000)
start "PULSAR Backend" cmd /k "call .\.venv\Scripts\activate.bat && uvicorn api.main:app --reload"

timeout /t 5 > nul

echo.
echo [4/4] Frontend (Dashboard) baslatiliyor (http://localhost:5173)
start "PULSAR Dashboard" cmd /k "cd dashboard && npm install && npm run dev"

echo.
echo =================================================
echo  Sistem baslatildi!
echo.
echo  o Backend:   http://localhost:8000
echo  o Dashboard: http://localhost:5173
echo =================================================
echo.
pause

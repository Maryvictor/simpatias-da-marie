@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
  .venv\Scripts\python.exe -m pip install -r requirements.txt
)
start "" http://localhost:8000/
.venv\Scripts\python.exe scripts\build_site.py --serve

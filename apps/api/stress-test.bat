@echo off 
echo INICIANDO STRESS TEST PESADO... 
for /L %%i in (1,1,50) do ( 
  curl http://localhost:3001/health > nul 2>&1 
  curl http://localhost:3001/api > nul 2>&1 
  curl http://localhost:3001/api/admin/alerts > nul 2>&1 
) 
echo STRESS TEST CONCLUIDO! 

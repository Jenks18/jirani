@echo off
curl -X POST "http://localhost:3000/api/process-llm" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\": \"Someone was shot in Nairobi\", \"provider\": \"gemini\"}" ^
  --connect-timeout 30 ^
  --max-time 60

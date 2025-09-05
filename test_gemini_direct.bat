@echo off
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyB28UTpVW_HEf6au5b4wqFvFDR7qYlyRGU" ^
  -H "Content-Type: application/json" ^
  -d "{\"contents\":[{\"parts\":[{\"text\":\"Hello, can you respond with a simple greeting?\"}]}]}" ^
  --connect-timeout 10 ^
  --max-time 30

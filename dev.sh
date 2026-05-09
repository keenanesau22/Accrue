#!/bin/bash
# Start the backend on 3001
PORT=3001 tsx server.ts &
# Start the frontend on 3000
vite --host 0.0.0.0 --port 3000

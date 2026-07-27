# Glass Box decisioning engine (app.py + core.jac + agents.jac).
#
# The Jac pipeline keeps its provenance graph in process memory across the
# reset -> run -> graph request sequence, so it needs a persistent process.
# That rules out serverless (and Vercel's 250MB function limit, which jaclang's
# llvmlite dependency alone would blow past). Deploy this to Render, Railway or
# Fly, then point the frontend at it with GLASSBOX_API.
#
# Run ONE instance. Two replicas would each hold a different graph, and a run
# could land on an instance that never saw the matching reset.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# only what the engine needs at runtime
COPY app.py core.jac agents.jac ./
COPY data ./data
COPY web ./web

ENV HOST=0.0.0.0 \
    PORT=8000 \
    PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["python", "app.py"]

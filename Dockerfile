# Use a Jupyter base image with Python 3.10
FROM python:3.10-slim

# Switch to root to install system dependencies
USER root

# Install system-level dependencies required for arcgis
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy all repository files to the working directory (/home/jovyan)
COPY . /home/jovyan

# Set ownership to jovyan user for Binder compatibility
RUN chown -R ${NB_UID}:${NB_GID} /home/jovyan

# Switch back to the jovyan user
USER ${NB_UID}

# Install arcgis and other dependencies using conda
RUN pip install --upgrade pip && pip install uv && \
    uv venv .venv --python=3.10 && \
    . .venv/bin/activate && uv pip install arcgis==2.3 jupyterlab && \
    rm -rf /var/lib/apt/lists/*

# Ensure JupyterLab is installed
RUN pip install --no-cache-dir jupyterlab

# Expose port 8888 for JupyterLab (required by Binder)
EXPOSE 8888

# Set the default command to start JupyterLab
CMD ["/bin/bash", "-c", ". .venv/bin/activate && jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root --NotebookApp.token='' --NotebookApp.password=''"]

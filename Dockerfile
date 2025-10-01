# Use a Jupyter base image with Python 3.10
FROM jupyter/minimal-notebook:python-3.10

# Switch to root to install system dependencies
USER root

# Install system-level dependencies required for arcgis
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libgif-dev \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Switch back to the jovyan user for Binder compatibility
USER ${NB_UID}

# Install arcgis and other dependencies using conda
# Use mamba for faster dependency resolution
RUN conda install -c conda-forge mamba && \
    mamba install -c esri -c conda-forge arcgis && \
    mamba clean --all --yes

# Ensure JupyterLab is installed
RUN pip install --no-cache-dir jupyterlab

# Expose port 8888 for JupyterLab (required by Binder)
EXPOSE 8888

# Set the default command to start JupyterLab
CMD ["start-notebook.sh"]

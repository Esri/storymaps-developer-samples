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

# Copy all repository files to the working directory (/home/jovyan)
COPY . /home/jovyan

# Set ownership to jovyan user for Binder compatibility
RUN chown -R ${NB_UID}:${NB_GID} /home/jovyan

# Switch back to the jovyan user
USER ${NB_UID}

# Install arcgis and other dependencies using conda
RUN conda install -c conda-forge mamba && \
    mamba install -c esri -c conda-forge arcgis && \
    mamba clean --all --yes

# Ensure JupyterLab is installed
RUN pip install --no-cache-dir jupyterlab

# Expose port 8888 for JupyterLab (required by Binder)
EXPOSE 8888

# Set the default command to start JupyterLab
CMD ["start-notebook.sh"]

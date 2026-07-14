#!/bin/bash
# Script to launch the Vedanta CBM Insights Dashboard

echo "==================================================="
echo "  Starting Vedanta CBM Insights Dashboard..."
echo "==================================================="
echo "Loading Python environment..."

# Change directory to where the script is located
cd "$(dirname "$0")"

# Execute the streamlit script using the local Anaconda environment
/opt/anaconda3/bin/streamlit run app.py

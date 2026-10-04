#!/bin/bash
set -e
docker build -f Dockerfile.gnucobol -t yumesorai-cobol "$(dirname "$0")"
echo "Docker image 'yumesorai-cobol' built successfully."

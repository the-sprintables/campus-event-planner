#!/bin/bash
set -e

# Fix Go coverage paths from event-planner/ to backend/
# This is needed because the Go module name is "event-planner" but SonarQube expects paths relative to project root

COVERAGE_FILE="${1:-backend/coverage.out}"

if [ ! -f "$COVERAGE_FILE" ]; then
    echo "Error: Coverage file not found: $COVERAGE_FILE"
    exit 1
fi

echo "Fixing coverage paths in $COVERAGE_FILE..."
echo "Replacing 'event-planner/' with 'backend/'..."

# Create a temporary file
TEMP_FILE="${COVERAGE_FILE}.tmp"

# Replace event-planner/ with backend/ in the coverage file
sed 's|^event-planner/|backend/|g' "$COVERAGE_FILE" > "$TEMP_FILE"

# Replace the original file
mv "$TEMP_FILE" "$COVERAGE_FILE"

echo "Coverage paths fixed successfully!"


#!/bin/bash

# Component naming mapping for chadcn/ui consistency
# This script replaces all component filenames and imports to use camelCase

echo "🔄 Starting component naming standardization..."

# Rename component files and update imports
REPLACEMENTS=(
  # Format: "old-name|NewName"
  "input-group|InputGroup"
  "button-group|ButtonGroup"
  "input-otp|InputOTP"
  "context-menu|ContextMenu"
  "dropdown-menu|DropdownMenu"
  "alert-dialog|AlertDialog"
  "aspect-ratio|AspectRatio"
  "hover-card|HoverCard"
  "navigation-menu|NavigationMenu"
  "radio-group|RadioGroup"
  "scroll-area|ScrollArea"
  "alert-dialog|AlertDialog"
  "date-picker|DatePicker"
  "toggle-group|ToggleGroup"
)

# Frontend replacements
cd /Users/itswatthachai/flexboard_v2/frontend

echo "📁 Processing frontend..."

for replacement in "${REPLACEMENTS[@]}"; do
  OLD="${replacement%|*}"
  NEW="${replacement#*|}"
  
  # Find and replace in all tsx/ts files
  find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s/from \"@\/components\/ui\/${OLD}\"/from \"@\/components\/ui\/${OLD}\"/g" {} \;
done

# OnPrem frontend replacements
cd /Users/itswatthachai/flexboard_v2/onprem-frontend

echo "📁 Processing onprem-frontend..."

for replacement in "${REPLACEMENTS[@]}"; do
  OLD="${replacement%|*}"
  NEW="${replacement#*|}"
  
  # Find and replace in all tsx/ts files
  find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s/from \"@\/components\/ui\/${OLD}\"/from \"@\/components\/ui\/${OLD}\"/g" {} \;
done

echo "✅ Component standardization complete!"

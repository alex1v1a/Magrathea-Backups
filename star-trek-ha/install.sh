# Installation Script for LCARS Home Assistant Theme
# Run these commands in order

echo "=========================================="
echo "Star Trek LCARS Theme Installation"
echo "=========================================="

# Step 1: Create directory structure
echo "Creating directory structure..."
mkdir -p /config/themes/lcars
mkdir -p /config/www/community/fonts
mkdir -p /config/dashboards

# Step 2: Copy theme files
echo "Copying theme files..."
cp themes/lcars/lcars.yaml /config/themes/lcars/
cp www/community/fonts/tungsten.css /config/www/community/fonts/

# Step 3: Update configuration.yaml
echo "Updating configuration.yaml..."
echo "" >> /config/configuration.yaml
echo "# LCARS Theme Configuration" >> /config/configuration.yaml
echo "frontend:" >> /config/configuration.yaml
echo "  themes: !include_dir_merge_named themes" >> /config/configuration.yaml
echo "  extra_module_url:" >> /config/configuration.yaml
echo "    - /www/community/lovelace-card-mod/card-mod.js" >> /config/configuration.yaml

# Step 4: Add helper entities
echo "Adding helper entities..."
cat lcars-helpers.yaml >> /config/configuration.yaml

# Step 5: Restart Home Assistant
echo "Installation complete!"
echo "Please restart Home Assistant to apply changes."
echo ""
echo "After restart:"
echo "1. Go to your Profile"
echo "2. Select 'LCARS Default' theme"
echo "3. Create a new dashboard using the example in dashboards/"

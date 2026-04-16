wsl -d Ubuntu -e bash -c 'cat > /home/marvin/homeassistant/config/dashboards/home-main.yaml << "EOF"
# Home Main Dashboard
# Professional main dashboard for Home Assistant

title: Home
views:
  - title: Main
    cards:
      - type: entities
        title: Quick Access
        entities:
          - entity: light.lounge
            name: Lounge
          - entity: light.kitchen_lamp
            name: Kitchen
          - entity: light.foyer
            name: Foyer
          - entity: light.front_door
            name: Front Door

      - type: button
        name: All Lights Off
        tap_action:
          action: call-service
          service: light.turn_off
          target:
            entity_id: all
EOF'
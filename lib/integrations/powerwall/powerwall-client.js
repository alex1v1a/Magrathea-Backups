/**
 * Tesla Powerwall Integration
 * Local API client for energy monitoring and control
 * 
 * Features:
 * - Real-time energy data (solar, battery, grid, home)
 * - Battery state of charge
 * - Grid connection status
 * - Operation mode control
 * - Automated optimization recommendations
 */

const axios = require('axios');
const https = require('https');

class PowerwallClient {
  constructor(ip, password) {
    this.baseUrl = `https://${ip}`;
    this.password = password; // Last 5 digits of Gateway serial
    this.authToken = null;
    
    // Allow self-signed certificate
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  /**
   * Authenticate with Powerwall Gateway
   */
  async authenticate() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/login/Basic`,
        {
          username: 'customer',
          password: this.password,
          email: ''
        },
        {
          httpsAgent: this.httpsAgent,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      this.authToken = response.data.token;
      return { success: true, token: this.authToken };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  }

  /**
   * Ensure authenticated before making requests
   */
  async ensureAuthenticated() {
    if (!this.authToken) {
      const result = await this.authenticate();
      if (!result.success) {
        throw new Error(`Authentication failed: ${result.error}`);
      }
    }
  }

  /**
   * Get aggregate energy meters (solar, battery, grid, home)
   */
  async getEnergyData() {
    await this.ensureAuthenticated();

    const response = await axios.get(
      `${this.baseUrl}/api/meters/aggregates`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` },
        timeout: 10000
      }
    );

    return this._formatEnergyData(response.data);
  }

  /**
   * Get battery state of charge
   */
  async getBatteryLevel() {
    await this.ensureAuthenticated();

    const response = await axios.get(
      `${this.baseUrl}/api/system_status/soe`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` },
        timeout: 10000
      }
    );

    const percentage = response.data.percentage;
    
    return {
      percentage,
      level: this._getBatteryLevelDescription(percentage)
    };
  }

  /**
   * Get grid connection status
   */
  async getGridStatus() {
    await this.ensureAuthenticated();

    const response = await axios.get(
      `${this.baseUrl}/api/system_status/grid_status`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` },
        timeout: 10000
      }
    );

    const statusMap = {
      'SystemGridConnected': 'Connected',
      'SystemIslandedActive': 'Off-grid (power outage)',
      'SystemTransitionToGrid': 'Reconnecting'
    };

    return {
      raw: response.data.grid_status,
      status: statusMap[response.data.grid_status] || response.data.grid_status,
      isOffGrid: response.data.grid_status === 'SystemIslandedActive'
    };
  }

  /**
   * Get current operation mode
   */
  async getOperationMode() {
    await this.ensureAuthenticated();

    const response = await axios.get(
      `${this.baseUrl}/api/operation`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` },
        timeout: 10000
      }
    );

    const modeDescriptions = {
      'self_consumption': 'Self-Powered (use solar first)',
      'backup': 'Backup Only (save battery for outages)',
      'autonomous': 'Time-Based Control (peak shaving)'
    };

    return {
      mode: response.data.mode,
      description: modeDescriptions[response.data.mode] || response.data.mode,
      backupReservePercent: response.data.backup_reserve_percent
    };
  }

  /**
   * Set operation mode
   */
  async setOperationMode(mode, backupReservePercent = 20) {
    await this.ensureAuthenticated();
    
    // Convert app percentage to API value
    // Formula: API = (19/20) * app + 5
    const apiReserve = ((19/20) * backupReservePercent + 5);

    await axios.post(
      `${this.baseUrl}/api/operation`,
      {
        mode: mode,
        backup_reserve_percent: apiReserve
      },
      {
        httpsAgent: this.httpsAgent,
        headers: { 
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    // Commit the configuration change
    await axios.get(
      `${this.baseUrl}/api/config/completed`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` },
        timeout: 10000
      }
    );

    return { success: true, mode, backupReservePercent };
  }

  /**
   * Get complete system status
   */
  async getCompleteStatus() {
    await this.ensureAuthenticated();

    const [energy, battery, grid, operation] = await Promise.all([
      this.getEnergyData(),
      this.getBatteryLevel(),
      this.getGridStatus(),
      this.getOperationMode()
    ]);

    return {
      timestamp: new Date().toISOString(),
      energy,
      battery,
      grid,
      operation
    };
  }

  /**
   * Format energy data into readable format
   */
  _formatEnergyData(data) {
    const solar = data.solar || {};
    const battery = data.battery || {};
    const site = data.site || {};
    const load = data.load || {};

    return {
      solar: {
        power: solar.instant_power || 0,
        energyToday: solar.energy_imported || 0,
        isProducing: (solar.instant_power || 0) > 100
      },
      battery: {
        power: battery.instant_power || 0,
        isCharging: (battery.instant_power || 0) < 0,
        isDischarging: (battery.instant_power || 0) > 0
      },
      grid: {
        power: site.instant_power || 0,
        isImporting: (site.instant_power || 0) > 0,
        isExporting: (site.instant_power || 0) < 0
      },
      home: {
        power: load.instant_power || 0
      }
    };
  }

  /**
   * Get battery level description
   */
  _getBatteryLevelDescription(percentage) {
    if (percentage >= 90) return 'Full';
    if (percentage >= 70) return 'High';
    if (percentage >= 40) return 'Medium';
    if (percentage >= 20) return 'Low';
    return 'Critical';
  }
}

/**
 * Energy Automation Helper
 * Provides recommendations based on energy data
 */
class EnergyAutomation {
  constructor(powerwallClient) {
    this.powerwall = powerwallClient;
    this.history = [];
    this.maxHistory = 1440; // 24 hours at 1 reading per minute
  }

  /**
   * Monitor and provide optimization recommendations
   */
  async monitorAndOptimize() {
    const status = await this.powerwall.getCompleteStatus();
    this._addToHistory(status);

    const recommendations = [];
    const hour = new Date().getHours();

    // Scenario 1: High solar production, low battery - maximize self-consumption
    if (status.energy.solar.isProducing && 
        status.energy.solar.power > 3000 && 
        status.battery.percentage < 50) {
      recommendations.push({
        priority: 'high',
        action: 'self_consumption',
        reason: 'High solar production - maximizing self-consumption',
        shouldSwitchMode: status.operation.mode !== 'self_consumption'
      });
    }

    // Scenario 2: Peak hours approaching, battery full - prepare for peak shaving
    if ((hour >= 14 && hour <= 20) && 
        status.battery.percentage > 80 &&
        status.operation.mode !== 'autonomous') {
      recommendations.push({
        priority: 'medium',
        action: 'autonomous',
        reason: 'Peak hours approaching - prepare for Time-of-Use optimization',
        shouldSwitchMode: true
      });
    }

    // Scenario 3: Grid outage detected
    if (status.grid.isOffGrid) {
      recommendations.push({
        priority: 'critical',
        action: 'emergency',
        reason: 'GRID OUTAGE DETECTED - Running on battery backup',
        alert: true
      });
    }

    // Scenario 4: Low battery warning
    if (status.battery.percentage < 20 && !status.energy.solar.isProducing) {
      recommendations.push({
        priority: 'high',
        action: 'warning',
        reason: 'Battery critically low - conserve energy',
        alert: true
      });
    }

    // Scenario 5: Excess solar - good time to run high-power appliances
    if (status.energy.solar.power > 5000 && 
        status.battery.percentage > 90) {
      recommendations.push({
        priority: 'low',
        action: 'opportunity',
        reason: 'Excess solar production - good time to run dishwasher, dryer, or charge EV'
      });
    }

    return {
      status,
      recommendations,
      summary: this._generateSummary(status, recommendations)
    };
  }

  /**
   * Get daily energy summary
   */
  async getDailySummary() {
    if (this.history.length === 0) {
      return { error: 'No data collected yet' };
    }

    const solarProduction = this._calculateEnergy(this.history, 'energy.solar.power');
    const homeConsumption = this._calculateEnergy(this.history, 'energy.home.power');
    const gridImport = this._calculateEnergy(
      this.history.filter(h => h.energy.grid.isImporting),
      'energy.grid.power'
    );
    const gridExport = this._calculateEnergy(
      this.history.filter(h => h.energy.grid.isExporting),
      'energy.grid.power',
      true
    );

    return {
      solarProductionKwh: solarProduction.toFixed(2),
      homeConsumptionKwh: homeConsumption.toFixed(2),
      gridImportKwh: gridImport.toFixed(2),
      gridExportKwh: gridExport.toFixed(2),
      selfSufficiency: homeConsumption > 0 
        ? ((1 - gridImport / homeConsumption) * 100).toFixed(1)
        : '0.0',
      dataPoints: this.history.length
    };
  }

  /**
   * Add status to history
   */
  _addToHistory(status) {
    this.history.push(status);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Calculate energy from power readings
   */
  _calculateEnergy(history, path, absolute = false) {
    return history.reduce((sum, h) => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], h) || 0;
      return sum + (absolute ? Math.abs(value) : value);
    }, 0) / 60000; // Convert W-minutes to kWh (approximate)
  }

  /**
   * Generate human-readable summary
   */
  _generateSummary(status, recommendations) {
    const parts = [];

    // Solar status
    if (status.energy.solar.isProducing) {
      parts.push(`☀️ Producing ${status.energy.solar.power.toFixed(0)}W solar`);
    }

    // Battery status
    parts.push(`🔋 Battery at ${status.battery.percentage}% (${status.battery.level})`);

    // Grid status
    if (status.grid.isOffGrid) {
      parts.push('⚠️ OFF GRID - Power outage');
    } else if (status.energy.grid.isImporting) {
      parts.push(`🔌 Importing ${status.energy.grid.power.toFixed(0)}W from grid`);
    } else if (status.energy.grid.isExporting) {
      parts.push(`⚡ Exporting ${Math.abs(status.energy.grid.power).toFixed(0)}W to grid`);
    }

    // Critical recommendations
    const critical = recommendations.filter(r => r.priority === 'critical');
    if (critical.length > 0) {
      parts.push(`🚨 ${critical[0].reason}`);
    }

    return parts.join(' | ');
  }
}

module.exports = { PowerwallClient, EnergyAutomation };

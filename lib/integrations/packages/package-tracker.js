/**
 * Package Tracking Service
 * Uses Shippo API for multi-carrier tracking
 * 
 * Features:
 * - Multi-carrier support (USPS, UPS, FedEx, DHL)
 * - Automatic carrier detection
 * - Webhook support for real-time updates
 * - Delivery forecasting
 * - Action required detection
 */

const axios = require('axios');

const SHIPPO_BASE_URL = 'https://api.goshippo.com';

// Carrier detection patterns
const CARRIER_PATTERNS = {
  'usps': /^[\d]{20,22}$|^[A-Z]{2}[\d]{9}[A-Z]{2}$/i,
  'ups': /^1Z[\w]{16}$/i,
  'fedex': /^[\d]{12,14,15}$/,
  'dhl_express': /^[\d]{10,11}$/,
  'ontrac': /^[C|D][\d]{14}$/i,
  'lasership': /^1LS[\d]{12}$/i
};

// Status mappings
const STATUS_LABELS = {
  'PRE_TRANSIT': 'Label created',
  'TRANSIT': 'In transit',
  'DELIVERED': 'Delivered',
  'RETURNED': 'Returned',
  'FAILURE': 'Exception',
  'UNKNOWN': 'Unknown'
};

class PackageTracker {
  constructor(apiToken) {
    this.apiToken = apiToken;
    this.headers = {
      'Authorization': `ShippoToken ${apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Detect carrier from tracking number
   */
  static detectCarrier(trackingNumber) {
    for (const [carrier, pattern] of Object.entries(CARRIER_PATTERNS)) {
      if (pattern.test(trackingNumber)) {
        return carrier;
      }
    }
    return null;
  }

  /**
   * Track a package
   */
  async trackPackage(trackingNumber, carrier) {
    // Auto-detect carrier if not provided
    const detectedCarrier = carrier || PackageTracker.detectCarrier(trackingNumber);
    
    if (!detectedCarrier) {
      throw new Error(`Could not detect carrier for ${trackingNumber}`);
    }

    try {
      const response = await axios.get(
        `${SHIPPO_BASE_URL}/tracks/${detectedCarrier}/${trackingNumber}`,
        { headers: this.headers }
      );

      return this._formatTrackingResponse(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          trackingNumber,
          carrier: detectedCarrier,
          status: 'UNKNOWN',
          statusDescription: 'Tracking number not found',
          error: 'Not found'
        };
      }
      throw error;
    }
  }

  /**
   * Register tracking for webhook updates
   */
  async registerTracking(trackingNumber, carrier, metadata = '') {
    const detectedCarrier = carrier || PackageTracker.detectCarrier(trackingNumber);
    
    try {
      const response = await axios.post(
        `${SHIPPO_BASE_URL}/tracks/`,
        {
          carrier: detectedCarrier,
          tracking_number: trackingNumber,
          metadata: metadata
        },
        { headers: this.headers }
      );

      return { success: true, data: response.data };
    } catch (error) {
      // May already be registered
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message 
      };
    }
  }

  /**
   * Track multiple packages
   */
  async trackMultiple(packages) {
    const results = await Promise.allSettled(
      packages.map(pkg => 
        this.trackPackage(pkg.trackingNumber, pkg.carrier)
          .then(data => ({ ...data, description: pkg.description }))
          .catch(error => ({ 
            trackingNumber: pkg.trackingNumber,
            error: error.message,
            description: pkg.description 
          }))
      )
    );

    return results.map((result, index) => ({
      ...packages[index],
      ...(result.status === 'fulfilled' ? result.value : { error: result.reason })
    }));
  }

  /**
   * Get active (non-delivered) packages
   */
  async getActivePackages(packages) {
    const allPackages = await this.trackMultiple(packages);
    
    return allPackages.filter(pkg => 
      !pkg.error &&�
      pkg.status !== 'DELIVERED' &&
      pkg.status !== 'RETURNED' &&
      pkg.status !== 'FAILURE'
    );
  }

  /**
   * Get packages delivered today
   */
  async getTodayDeliveries(packages) {
    const allPackages = await this.trackMultiple(packages);
    const today = new Date().toDateString();

    return allPackages.filter(pkg => {
      if (pkg.error || pkg.status !== 'DELIVERED') return false;
      
      const deliveredEvent = pkg.trackingHistory?.find(
        h => h.status === 'DELIVERED'
      );
      
      if (deliveredEvent) {
        const deliveryDate = new Date(deliveredEvent.date).toDateString();
        return deliveryDate === today;
      }
      
      return false;
    });
  }

  /**
   * Get delivery forecast for upcoming packages
   */
  async getDeliveryForecast(packages) {
    const active = await this.getActivePackages(packages);
    
    return active.map(pkg => {
      const eta = pkg.estimatedDelivery;
      const daysUntil = eta 
        ? Math.ceil((new Date(eta) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        trackingNumber: pkg.trackingNumber,
        description: pkg.description,
        carrier: pkg.carrier,
        status: pkg.status,
        statusDescription: pkg.statusDescription,
        estimatedDelivery: eta,
        daysUntil,
        urgency: daysUntil === 0 ? 'today' : 
                 daysUntil === 1 ? 'tomorrow' : 
                 daysUntil <= 3 ? 'soon' : 'upcoming',
        actionRequired: pkg.actionRequired
      };
    }).sort((a, b) => (a.daysUntil || 999) - (b.daysUntil || 999));
  }

  /**
   * Handle webhook payload
   */
  handleWebhook(payload) {
    const event = {
      trackingNumber: payload.tracking_number,
      carrier: payload.carrier,
      status: payload.tracking_status?.status,
      statusDescription: STATUS_LABELS[payload.tracking_status?.status],
      substatus: payload.tracking_status?.substatus,
      statusDetails: payload.tracking_status?.status_details,
      location: payload.tracking_status?.location,
      timestamp: payload.tracking_status?.status_date,
      history: payload.tracking_history?.map(h => ({
        status: h.status,
        description: h.status_details,
        date: h.status_date,
        location: h.location
      })) || []
    };

    // Determine if action is required
    event.actionRequired = this._isActionRequired(event);
    event.notifications = this._generateNotifications(event);

    return event;
  }

  /**
   * Check if action is required
   */
  _isActionRequired(event) {
    const actionRequiredStatuses = [
      'delivery_attempted',
      'contact_carrier',
      'address_issue',
      'reschedule_delivery',
      'package_held',
      'pickup_available'
    ];

    return actionRequiredStatuses.includes(event.substatus);
  }

  /**
   * Generate notifications for event
   */
  _generateNotifications(event) {
    const notifications = [];

    switch (event.status) {
      case 'DELIVERED':
        notifications.push({
          type: 'success',
          message: `📦 Package delivered! ${event.trackingNumber}`,
          priority: 'normal',
          action: 'Check porch/front door'
        });
        break;
        
      case 'OUT_FOR_DELIVERY':
        notifications.push({
          type: 'info',
          message: `🚚 Package out for delivery today - ${event.trackingNumber}`,
          priority: 'high',
          action: 'Expect delivery today'
        });
        break;
        
      case 'FAILURE':
        notifications.push({
          type: 'error',
          message: `❌ Delivery issue with ${event.trackingNumber}: ${event.statusDetails}`,
          priority: 'urgent',
          action: 'Contact carrier'
        });
        break;
    }

    if (event.actionRequired) {
      notifications.push({
        type: 'warning',
        message: `⚠️ Action required for ${event.trackingNumber}: ${event.statusDetails}`,
        priority: 'urgent',
        action: event.substatus
      });
    }

    return notifications;
  }

  /**
   * Format tracking response
   */
  _formatTrackingResponse(data) {
    return {
      trackingNumber: data.tracking_number,
      carrier: data.carrier,
      status: data.tracking_status?.status,
      statusDescription: STATUS_LABELS[data.tracking_status?.status],
      statusDetails: data.tracking_status?.status_details,
      estimatedDelivery: data.eta,
      originalEta: data.original_eta,
      serviceLevel: data.servicelevel?.name,
      from: data.address_from,
      to: data.address_to,
      trackingHistory: data.tracking_history?.map(h => ({
        status: h.status,
        description: h.status_details,
        date: h.status_date,
        location: h.location
      })) || [],
      carrierUrl: data.tracking_url_provider,
      actionRequired: this._isActionRequired({
        substatus: data.tracking_status?.substatus
      })
    };
  }
}

/**
 * Household Package Manager
 * Manages package tracking for household
 */
class HouseholdPackageManager {
  constructor(tracker, storagePath = './data/packages.json') {
    this.tracker = tracker;
    this.storagePath = storagePath;
    this.packages = [];
  }

  /**
   * Load packages from storage
   */
  async load() {
    try {
      const fs = require('fs').promises;
      const data = await fs.readFile(this.storagePath, 'utf8');
      this.packages = JSON.parse(data);
    } catch (e) {
      this.packages = [];
    }
    return this.packages;
  }

  /**
   * Save packages to storage
   */
  async save() {
    const fs = require('fs').promises;
    const path = require('path');
    
    await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
    await fs.writeFile(this.storagePath, JSON.stringify(this.packages, null, 2));
  }

  /**
   * Add a new package to track
   */
  async addPackage(trackingNumber, carrier, description = '') {
    const detectedCarrier = carrier || PackageTracker.detectCarrier(trackingNumber);
    
    if (!detectedCarrier) {
      throw new Error(`Could not detect carrier for ${trackingNumber}. Please specify manually.`);
    }

    const pkg = {
      trackingNumber,
      carrier: detectedCarrier,
      description,
      addedDate: new Date().toISOString(),
      active: true
    };

    this.packages.push(pkg);
    await this.save();

    // Register for webhooks
    await this.tracker.registerTracking(trackingNumber, detectedCarrier, description);

    return pkg;
  }

  /**
   * Remove a package
   */
  async removePackage(trackingNumber) {
    const index = this.packages.findIndex(p => p.trackingNumber === trackingNumber);
    if (index > -1) {
      this.packages.splice(index, 1);
      await this.save();
      return true;
    }
    return false;
  }

  /**
   * Get morning briefing
   */
  async getMorningBriefing() {
    await this.load();
    const activePackages = this.packages.filter(p => p.active);

    if (activePackages.length === 0) {
      return {
        summary: '📭 No active packages tracked',
        today: { count: 0, packages: [] },
        upcoming: [],
        total: 0
      };
    }

    const [forecast, todayDeliveries] = await Promise.all([
      this.tracker.getDeliveryForecast(activePackages),
      this.tracker.getTodayDeliveries(activePackages)
    ]);

    return {
      summary: this._generateSummary(todayDeliveries, forecast),
      today: {
        count: todayDeliveries.length,
        packages: todayDeliveries
      },
      upcoming: forecast.filter(p => p.daysUntil > 0),
      total: activePackages.length
    };
  }

  /**
   * Generate summary message
   */
  _generateSummary(today, upcoming) {
    if (today.length > 0) {
      const items = today.map(p => p.description || p.trackingNumber).join(', ');
      return `📦 ${today.length} package${today.length > 1 ? 's' : ''} arriving today: ${items}`;
    }

    if (upcoming.length === 0) {
      return '📭 No active packages in transit';
    }

    const tomorrow = upcoming.filter(p => p.daysUntil === 1);
    if (tomorrow.length > 0) {
      return `📦 ${tomorrow.length} package${tomorrow.length > 1 ? 's' : ''} arriving tomorrow`;
    }

    const nextThreeDays = upcoming.filter(p => p.daysUntil <= 3);
    if (nextThreeDays.length > 0) {
      return `📦 ${nextThreeDays.length} package${nextThreeDays.length > 1 ? 's' : ''} arriving in the next 3 days`;
    }

    return `📦 ${upcoming.length} package${upcoming.length > 1 ? 's' : ''} in transit`;
  }
}

module.exports = { 
  PackageTracker, 
  HouseholdPackageManager,
  CARRIER_PATTERNS,
  STATUS_LABELS
};

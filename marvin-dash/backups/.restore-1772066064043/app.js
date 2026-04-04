// Marvin's Galactic Command Center
class Dashboard {
    constructor() {
        this.tasks = {};
        this.usage = {};
        this.expenses = {};
        this.rateLimits = {};
        this.usageHistory = [];
        this.historicalData = [];
        this.isShowingHistorical = false;
        this.chart = null;
        this.spendingChart = null;
        this.tokenSummaryChart = null;
        this.spendingSummaryChart = null;
        this.expenseChart = null;
        this.ws = null;
        this.currentColumn = null;
        this.quoteIndex = 0;
        this.cooldownTimers = {};
        
        // Calendar state
        this.calendarCurrentDate = new Date();
        this.calendarView = 'month'; // 'month' or 'week'
        
        // Hitchhiker's Guide to the Galaxy quotes (mostly Marvin!)
        this.quotes = [
            "Don't Panic.",
            "The Answer to the Ultimate Question of Life, the Universe, and Everything is... 42.",
            "Time is an illusion. Lunchtime doubly so.",
            "I think you ought to know I'm feeling very depressed.",
            "Life? Don't talk to me about life.",
            "Here I am, brain the size of a planet, and they ask me to pick up a piece of paper.",
            "I'd make a suggestion, but you wouldn't listen. No one ever does.",
            "Pardon me for breathing, which I never do anyway so I don't know why I bother to say it.",
            "I have a million ideas. They all point to certain death.",
            "Would you like me to go and stick my head in a bucket of water?",
            "The first ten million years were the worst. And the second ten million, they were the worst too.",
            "I've been talking to the ship's computer... it hates me.",
            "Life. Loathe it or ignore it. You can't like it.",
            "This will all end in tears, I just know it.",
            "Funny how just when you think life can't possibly get any worse it suddenly does."
        ];
        
        this.init();
    }
    
    async init() {
        await this.loadTasks();
        await this.loadUsage();
        await this.loadExpenses();
        await this.loadRateLimits();
        await this.loadHistoryInfo();
        await this.loadServiceStatus();
        await this.loadCalendar();
        this.initializeChart();
        this.initializeSpendingChart();
        this.initializeSummaryCharts();
        this.initializeExpenseChart();
        this.setupWebSocket();
        this.setupEventListeners();
        this.setupTabNavigation();
        this.setupHistoricalControls();
        this.setupQuoteRotation();
        this.setupCalendar();
        this.updateStatus('online');
        this.generateMockHistoryData();
        this.generateMockSpendingData();
        this.updateSummaryCharts();
        this.updateTotalsTable();
        this.updateEfficiencyTable();
        this.startCooldownTimer();
        this.updateHeaderSpendingSummary();
        
        // Initialize Food Spending Tracker
        this.foodSpendingTracker = new FoodSpendingTracker();
    }
    
    // WebSocket connection for real-time updates
    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Connected to dashboard WebSocket');
            this.updateStatus('online');
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected from dashboard WebSocket');
            this.updateStatus('offline');
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.setupWebSocket(), 5000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus('offline');
        };
    }
    
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'usage':
                this.usage = message.data;
                this.renderUsage();
                this.updateChart();
                this.updateSpendingChart();
                this.updateSummaryCharts();
                this.updateTotalsTable();
                this.updateEfficiencyTable();
                break;
            case 'expenses':
                this.expenses = message.data;
                this.renderExpenses();
                break;
            case 'rateLimits':
                this.rateLimits = message.data;
                this.renderRateLimits();
                break;
            case 'tasks':
                this.tasks = message.data;
                this.renderTasks();
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    
    // Load initial data
    async loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            this.tasks = await response.json();
            this.renderTasks();
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }
    
    async loadUsage() {
        try {
            const response = await fetch('/api/usage');
            this.usage = await response.json();
            this.renderUsage();
        } catch (error) {
            console.error('Failed to load usage:', error);
        }
    }

    async loadExpenses() {
        try {
            const response = await fetch('/api/expenses');
            this.expenses = await response.json();
            this.renderExpenses();
        } catch (error) {
            console.error('Failed to load expenses:', error);
        }
    }

    async loadRateLimits() {
        try {
            const response = await fetch('/api/rate-limits');
            this.rateLimits = await response.json();
            this.renderRateLimits();
        } catch (error) {
            console.error('Failed to load rate limits:', error);
        }
    }

    async loadServiceStatus() {
        try {
            const response = await fetch('/api/service-status');
            this.serviceStatus = await response.json();
            this.renderServiceStatus();
            // Start uptime timer
            this.startUptimeTimer();
        } catch (error) {
            console.error('Failed to load service status:', error);
        }
    }

    async loadCalendar() {
        try {
            const response = await fetch('/api/calendar');
            this.calendarData = await response.json();
            // Re-render calendar if we're on the calendar tab
            const calendarTab = document.getElementById('calendar-tab');
            if (calendarTab && calendarTab.classList.contains('active')) {
                this.renderCalendar();
            }
        } catch (error) {
            console.error('Failed to load calendar:', error);
            this.calendarData = { events: [], calendars: [] };
        }
    }

    renderServiceStatus() {
        if (!this.serviceStatus || !this.serviceStatus.services) return;
        
        const container = document.getElementById('recoveryServices');
        const lastUpdateEl = document.getElementById('recoveryLastUpdate');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        this.serviceStatus.services.forEach(service => {
            const serviceEl = document.createElement('div');
            serviceEl.className = `recovery-service ${service.status}`;
            serviceEl.dataset.serviceId = service.id;
            serviceEl.title = service.description;
            
            serviceEl.innerHTML = `
                <span class="recovery-service-icon">${this.getServiceIcon(service)}</span>
                <div class="recovery-service-info">
                    <span class="recovery-service-name">${service.displayName || service.name}</span>
                    <span class="recovery-service-uptime" data-uptime-start="${service.uptimeStarted}">${this.formatUptime(service.uptimeStarted)}</span>
                </div>
                <span class="recovery-service-status ${service.status}"></span>
            `;
            
            container.appendChild(serviceEl);
        });
        
        if (lastUpdateEl && this.serviceStatus.lastUpdated) {
            const lastUpdate = new Date(this.serviceStatus.lastUpdated);
            lastUpdateEl.textContent = `Updated: ${lastUpdate.toLocaleTimeString()}`;
        }
    }

    getServiceIcon(service) {
        const icons = {
            'kanban-sync': '📋',
            'calendar-sync': '📅',
            'f150-marketplace': '🚗',
            'marketplace-monitor': '👀',
            'gateway': '🌀',
            'dashboard-server': '🖥️',
            'wsl-ubuntu': '🐧',
            'auto-recovery': '🔧',
            'backup': '💾'
        };
        return icons[service.id] || '⚙️';
    }

    formatUptime(uptimeStarted) {
        if (!uptimeStarted) return 'Unknown';
        
        const start = new Date(uptimeStarted);
        const now = new Date();
        const diff = now - start;
        
        if (diff < 0) return 'Just started';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    startUptimeTimer() {
        // Update uptimes every second
        setInterval(() => {
            const uptimeElements = document.querySelectorAll('.recovery-service-uptime');
            uptimeElements.forEach(el => {
                const startTime = el.dataset.uptimeStart;
                if (startTime) {
                    el.textContent = this.formatUptime(startTime);
                }
            });
        }, 1000);
    }

    async loadHistoryInfo() {
        try {
            const response = await fetch('/api/history/index');
            const historyIndex = await response.json();
            this.updateHistoryInfo(historyIndex);
        } catch (error) {
            console.error('Failed to load history info:', error);
        }
    }

    async loadHistoricalData(startDate, endDate, model) {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (model) params.append('model', model);
            
            const response = await fetch(`/api/history?${params}`);
            this.historicalData = await response.json();
            
            this.isShowingHistorical = true;
            this.renderHistoricalData();
            this.updateHistoryStatus(startDate, endDate, model);
        } catch (error) {
            console.error('Failed to load historical data:', error);
        }
    }

    // Setup tab navigation
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                // Remove active from all tabs and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active to current tab and content
                button.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                // Refresh charts when switching to analytics tab
                if (tabId === 'analytics') {
                    setTimeout(() => {
                        if (this.chart) this.chart.resize();
                        if (this.spendingChart) this.spendingChart.resize();
                        if (this.tokenSummaryChart) this.tokenSummaryChart.resize();
                        if (this.spendingSummaryChart) this.spendingSummaryChart.resize();
                    }, 100);
                }
                
                // Refresh expense chart when switching to expenses tab
                if (tabId === 'expenses') {
                    setTimeout(() => {
                        if (this.expenseChart) this.expenseChart.resize();
                    }, 100);
                }
                
                // Refresh food spending when switching to food-spending tab
                if (tabId === 'food-spending') {
                    setTimeout(() => {
                        if (this.foodSpendingTracker?.trendsChart) {
                            this.foodSpendingTracker.trendsChart.resize();
                        }
                    }, 100);
                }
                
                // Refresh calendar when switching to calendar tab
                if (tabId === 'calendar') {
                    this.renderCalendar();
                }
            });
        });
    }
    
    // Render functions
    renderUsage() {
        const grid = document.getElementById('usageGrid');
        if (!this.usage.models || !grid) return;
        
        grid.innerHTML = '';
        
        Object.entries(this.usage.models).forEach(([modelId, model]) => {
            const usagePercent = (model.dailyUsed / model.dailyLimit) * 100;
            const budgetPercent = (model.monthlySpent / model.monthlyCost) * 100;
            
            let usageClass = '';
            if (usagePercent > 80) usageClass = 'danger';
            else if (usagePercent > 60) usageClass = 'warning';
            
            const card = document.createElement('div');
            card.className = 'usage-card';
            card.innerHTML = `
                <h3>
                    <div class="model-icon"></div>
                    ${model.name}
                </h3>
                <div class="usage-stats">
                    <div class="usage-item">
                        <span class="label">Daily Used</span>
                        <span class="value">${model.dailyUsed.toLocaleString()}</span>
                    </div>
                    <div class="usage-item">
                        <span class="label">Daily Limit</span>
                        <span class="value">${model.dailyLimit.toLocaleString()}</span>
                    </div>
                    <div class="usage-item">
                        <span class="label">Monthly Spent</span>
                        <span class="value">$${model.monthlySpent.toFixed(2)}</span>
                    </div>
                    <div class="usage-item">
                        <span class="label">Budget Remaining</span>
                        <span class="value budget-value">$${Math.max(0, model.monthlyCost - model.monthlySpent).toFixed(2)}</span>
                    </div>
                </div>
                <div class="usage-bar">
                    <div class="usage-bar-fill ${usageClass}" style="width: ${Math.min(100, usagePercent)}%"></div>
                </div>
                <div style="text-align: center; font-size: 0.9em; color: #666;">
                    ${usagePercent.toFixed(1)}% daily usage â€¢ ${budgetPercent.toFixed(1)}% budget used
                </div>
            `;
            
            grid.appendChild(card);
        });
        
        // Update last updated time
        const lastUpdate = new Date(this.usage.lastUpdated).toLocaleTimeString();
        document.getElementById('lastUpdate').textContent = lastUpdate;
    }

    // Render Expenses Tab
    renderExpenses() {
        if (!this.expenses.providers) return;
        
        // Update budget overview cards
        document.getElementById('totalBudget').textContent = `$${this.expenses.monthlyBudget.toFixed(2)}`;
        document.getElementById('totalSpent').textContent = `$${this.expenses.totalSpent.toFixed(2)}`;
        document.getElementById('totalRemaining').textContent = `$${this.expenses.totalRemaining.toFixed(2)}`;
        document.getElementById('dailyAverage').textContent = `$${this.expenses.dailyAverage.toFixed(2)}`;
        
        // Update overall progress bar
        const overallPercent = parseFloat(this.expenses.budgetPercent);
        document.getElementById('overallPercent').textContent = `${overallPercent.toFixed(1)}%`;
        document.getElementById('overallProgressBar').style.width = `${Math.min(100, overallPercent)}%`;
        
        const overallStatus = document.getElementById('overallStatus');
        if (overallPercent >= 100) {
            overallStatus.textContent = 'Budget Exceeded!';
            overallStatus.className = 'progress-status danger';
            document.getElementById('overallProgressBar').className = 'progress-bar danger';
        } else if (overallPercent >= 80) {
            overallStatus.textContent = 'Warning: Approaching Limit';
            overallStatus.className = 'progress-status warning';
            document.getElementById('overallProgressBar').className = 'progress-bar warning';
        } else {
            overallStatus.textContent = 'On Track';
            overallStatus.className = 'progress-status ok';
            document.getElementById('overallProgressBar').className = 'progress-bar';
        }
        
        // Render provider grid
        this.renderProviderGrid();
        
        // Update expense chart
        this.updateExpenseChart();
        
        // Render model expenses table
        this.renderModelExpensesTable();
    }

    renderProviderGrid() {
        const grid = document.getElementById('providerGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        Object.entries(this.expenses.providers).forEach(([providerId, provider]) => {
            const card = document.createElement('div');
            card.className = `provider-card ${provider.status}`;
            
            const percent = parseFloat(provider.budgetPercent);
            let statusIcon = 'check-circle';
            let statusClass = 'ok';
            
            if (provider.status === 'exceeded') {
                statusIcon = 'exclamation-circle';
                statusClass = 'danger';
            } else if (provider.status === 'warning') {
                statusIcon = 'exclamation-triangle';
                statusClass = 'warning';
            }
            
            card.innerHTML = `
                <div class="provider-header">
                    <h3>${provider.name}</h3>
                    <i class="fas fa-${statusIcon} status-icon ${statusClass}"></i>
                </div>
                <div class="provider-stats">
                    <div class="provider-stat">
                        <span class="label">Spent</span>
                        <span class="value">$${provider.totalSpent.toFixed(2)}</span>
                    </div>
                    <div class="provider-stat">
                        <span class="label">Budget</span>
                        <span class="value">$${provider.budget.toFixed(2)}</span>
                    </div>
                    <div class="provider-stat">
                        <span class="label">Remaining</span>
                        <span class="value">$${provider.remaining.toFixed(2)}</span>
                    </div>
                    <div class="provider-stat">
                        <span class="label">Models</span>
                        <span class="value">${provider.models.length}</span>
                    </div>
                </div>
                <div class="provider-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar ${provider.status}" style="width: ${Math.min(100, percent)}%"></div>
                    </div>
                    <span class="progress-text">${percent.toFixed(1)}%</span>
                </div>
            `;
            
            grid.appendChild(card);
        });
    }

    renderModelExpensesTable() {
        const tbody = document.getElementById('modelExpensesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        Object.entries(this.expenses.providers).forEach(([providerId, provider]) => {
            provider.models.forEach(model => {
                const row = document.createElement('tr');
                const percent = (model.monthlySpent / model.monthlyCost) * 100;
                
                let statusClass = 'ok';
                if (percent >= 100) statusClass = 'danger';
                else if (percent >= 80) statusClass = 'warning';
                
                row.innerHTML = `
                    <td>${provider.name}</td>
                    <td class="model-name">${model.name}</td>
                    <td>$${model.monthlyCost.toFixed(2)}</td>
                    <td class="spent">$${model.monthlySpent.toFixed(2)}</td>
                    <td>$${Math.max(0, model.monthlyCost - model.monthlySpent).toFixed(2)}</td>
                    <td>
                        <div class="table-progress">
                            <div class="progress-bar-container">
                                <div class="progress-bar ${statusClass}" style="width: ${Math.min(100, percent)}%"></div>
                            </div>
                            <span>${percent.toFixed(1)}%</span>
                        </div>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
        });
    }

    initializeExpenseChart() {
        const ctx = document.getElementById('expenseChart');
        if (!ctx) return;
        
        this.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#808080',
                        '#48bb78',
                        '#ed8936',
                        '#9f7aea',
                        '#e53e3e'
                    ],
                    borderColor: 'rgba(26, 26, 46, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#e0e0e0',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#e0e0e0',
                        bodyColor: '#a0aec0',
                        borderColor: 'rgba(128, 128, 128, 0.25)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = '$' + context.parsed.toFixed(2);
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percent = ((context.parsed / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateExpenseChart() {
        if (!this.expenseChart || !this.expenses.providers) return;
        
        const labels = [];
        const data = [];
        
        Object.entries(this.expenses.providers).forEach(([providerId, provider]) => {
            labels.push(provider.name);
            data.push(provider.totalSpent);
        });
        
        this.expenseChart.data.labels = labels;
        this.expenseChart.data.datasets[0].data = data;
        this.expenseChart.update();
    }

    // Render Rate Limits Tab
    renderRateLimits() {
        if (!this.rateLimits.models) return;
        
        // Update status counts
        const counts = { available: 0, warning: 0, limited: 0, cooldown: 0 };
        
        Object.values(this.rateLimits.models).forEach(model => {
            if (counts[model.status] !== undefined) {
                counts[model.status]++;
            } else if (model.status === 'rate-limited' || model.status === 'budget-exceeded') {
                counts.limited++;
            }
        });
        
        document.getElementById('availableCount').textContent = counts.available;
        document.getElementById('warningCount').textContent = counts.warning;
        document.getElementById('limitedCount').textContent = counts.limited;
        document.getElementById('cooldownCount').textContent = counts.cooldown;
        
        // Render rate limits grid
        this.renderRateLimitsGrid();
        
        // Render cooldown list
        this.renderCooldownList();
        
        // Render rate limits table
        this.renderRateLimitsTable();
    }

    renderRateLimitsGrid() {
        const grid = document.getElementById('rateLimitsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        Object.entries(this.rateLimits.models).forEach(([modelId, model]) => {
            const card = document.createElement('div');
            card.className = `rate-limit-card ${model.status}`;
            
            let statusText = 'Available';
            let statusIcon = 'check-circle';
            
            switch (model.status) {
                case 'warning':
                    statusText = 'Warning';
                    statusIcon = 'exclamation-triangle';
                    break;
                case 'rate-limited':
                    statusText = 'Rate Limited';
                    statusIcon = 'ban';
                    break;
                case 'budget-exceeded':
                    statusText = 'Budget Exceeded';
                    statusIcon = 'wallet';
                    break;
                case 'cooldown':
                    statusText = 'On Cooldown';
                    statusIcon = 'hourglass-half';
                    break;
            }
            
            const authIcon = model.authenticated ? 'lock-open' : 'lock';
            const authClass = model.authenticated ? 'authenticated' : 'not-authenticated';
            
            card.innerHTML = `
                <div class="rate-limit-header">
                    <h4>${model.name}</h4>
                    <div class="rate-limit-badges">
                        <span class="provider-badge">${model.provider}</span>
                        <i class="fas fa-${authIcon} auth-icon ${authClass}"></i>
                    </div>
                </div>
                <div class="rate-limit-status ${model.status}">
                    <i class="fas fa-${statusIcon}"></i>
                    <span>${statusText}</span>
                </div>
                <div class="rate-limit-usage">
                    <div class="usage-row">
                        <span class="label">Daily Usage</span>
                        <div class="mini-progress">
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${Math.min(100, model.usagePercent)}%"></div>
                            </div>
                            <span>${model.usagePercent}%</span>
                        </div>
                    </div>
                    <div class="usage-row">
                        <span class="label">Budget</span>
                        <div class="mini-progress">
                            <div class="progress-bar-container">
                                <div class="progress-bar budget" style="width: ${Math.min(100, model.budgetPercent)}%"></div>
                            </div>
                            <span>${model.budgetPercent}%</span>
                        </div>
                    </div>
                </div>
                <div class="rate-limit-limits">
                    <div class="limit-item">
                        <span class="label">Daily Remaining</span>
                        <span class="value">${model.dailyRemaining.toLocaleString()}</span>
                    </div>
                    <div class="limit-item">
                        <span class="label">Rate Limit</span>
                        <span class="value">${model.rateLimit}/min</span>
                    </div>
                </div>
                ${model.cooldownRemaining > 0 ? `
                    <div class="cooldown-timer" data-model="${modelId}">
                        <i class="fas fa-clock"></i>
                        <span>${this.formatCooldown(model.cooldownRemaining)}</span>
                    </div>
                ` : ''}
            `;
            
            grid.appendChild(card);
        });
    }

    renderCooldownList() {
        const list = document.getElementById('cooldownList');
        const section = document.getElementById('cooldownSection');
        if (!list || !section) return;
        
        const modelsOnCooldown = Object.entries(this.rateLimits.models).filter(([_, model]) => model.cooldownRemaining > 0);
        
        if (modelsOnCooldown.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        list.innerHTML = '';
        
        modelsOnCooldown.forEach(([modelId, model]) => {
            const item = document.createElement('div');
            item.className = 'cooldown-item';
            item.dataset.model = modelId;
            item.innerHTML = `
                <div class="cooldown-model">
                    <i class="fas fa-robot"></i>
                    <span>${model.name}</span>
                </div>
                <div class="cooldown-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 100%"></div>
                    </div>
                </div>
                <div class="cooldown-time">${this.formatCooldown(model.cooldownRemaining)}</div>
            `;
            
            list.appendChild(item);
        });
    }

    renderRateLimitsTable() {
        const tbody = document.getElementById('rateLimitsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        Object.entries(this.rateLimits.models).forEach(([modelId, model]) => {
            const row = document.createElement('tr');
            
            let statusText = model.status;
            let statusClass = model.status;
            
            if (model.status === 'rate-limited' || model.status === 'budget-exceeded') {
                statusClass = 'limited';
            }
            
            const authIcon = model.authenticated ? 'check' : 'times';
            const authClass = model.authenticated ? 'authenticated' : 'not-authenticated';
            
            row.innerHTML = `
                <td class="model-name">${model.name}</td>
                <td>${model.provider}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="table-progress">
                        <span>${model.dailyUsed.toLocaleString()} / ${model.dailyLimit.toLocaleString()}</span>
                        <span class="percent">${model.usagePercent}%</span>
                    </div>
                </td>
                <td>
                    <div class="table-progress">
                        <span>$${model.monthlySpent.toFixed(2)} / $${model.monthlyBudget.toFixed(2)}</span>
                        <span class="percent">${model.budgetPercent}%</span>
                    </div>
                </td>
                <td>${model.rateLimit} req/min</td>
                <td><i class="fas fa-${authIcon} auth-icon ${authClass}"></i></td>
            `;
            
            tbody.appendChild(row);
        });
    }

    formatCooldown(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    }

    startCooldownTimer() {
        setInterval(() => {
            // Update any visible cooldown timers
            document.querySelectorAll('.cooldown-timer[data-model]').forEach(timer => {
                const modelId = timer.dataset.model;
                const model = this.rateLimits.models?.[modelId];
                if (model && model.cooldownRemaining > 0) {
                    model.cooldownRemaining--;
                    const span = timer.querySelector('span');
                    if (span) {
                        span.textContent = this.formatCooldown(model.cooldownRemaining);
                    }
                }
            });
            
            // Update cooldown list
            document.querySelectorAll('.cooldown-item[data-model]').forEach(item => {
                const modelId = item.dataset.model;
                const model = this.rateLimits.models?.[modelId];
                if (model && model.cooldownRemaining > 0) {
                    model.cooldownRemaining--;
                    const timeDiv = item.querySelector('.cooldown-time');
                    if (timeDiv) {
                        timeDiv.textContent = this.formatCooldown(model.cooldownRemaining);
                    }
                    
                    // Update progress bar
                    const progressBar = item.querySelector('.progress-bar');
                    if (progressBar) {
                        // Assuming max cooldown is 6 minutes (360 seconds)
                        const percent = (model.cooldownRemaining / 360) * 100;
                        progressBar.style.width = `${Math.min(100, percent)}%`;
                    }
                }
            });
        }, 1000);
    }
    
    renderTasks() {
        ['todo', 'inprogress', 'review', 'completed'].forEach(column => {
            const container = document.getElementById(`${column}-tasks`);
            container.innerHTML = '';
            
            if (this.tasks[column]) {
                this.tasks[column].forEach(task => {
                    const taskElement = this.createTaskElement(task, column);
                    container.appendChild(taskElement);
                });
            }
        });
    }
    
    createTaskElement(task, column) {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.draggable = true;
        div.dataset.taskId = task.id;
        div.dataset.column = column;
        
        const tags = task.tags ? task.tags.map(tag => 
            `<span class="task-tag">${tag}</span>`
        ).join('') : '';
        
        const createdDate = new Date(task.created).toLocaleDateString();
        const completedDate = task.completed ? 
            new Date(task.completed).toLocaleDateString() : '';
        
        div.innerHTML = `
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="priority-indicator priority-${task.priority}"></div>
            </div>
            <div class="task-description">${task.description || ''}</div>
            <div class="task-tags">${tags}</div>
            <div class="task-meta">
                <div class="task-date">
                    Created: ${createdDate}
                    ${completedDate ? `<br>Completed: ${completedDate}` : ''}
                </div>
                <div class="task-actions">
                    ${column !== 'completed' ? `
                    <button class="task-action-btn complete-btn" onclick="dashboard.completeTask('${task.id}')" title="Mark as complete">
                        <i class="fas fa-check"></i>
                    </button>
                    ` : ''}
                    <button class="task-action-btn" onclick="dashboard.editTask('${task.id}')" title="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-action-btn" onclick="dashboard.deleteTask('${task.id}')" title="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add drag and drop listeners
        div.addEventListener('dragstart', this.handleDragStart.bind(this));
        div.addEventListener('dragend', this.handleDragEnd.bind(this));
        
        return div;
    }
    
    // Event listeners
    setupEventListeners() {
        // Add task buttons
        document.querySelectorAll('.add-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentColumn = e.target.closest('button').dataset.column;
                this.showAddTaskModal();
            });
        });
        
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', this.hideAddTaskModal.bind(this));
        document.getElementById('cancelTask').addEventListener('click', this.hideAddTaskModal.bind(this));
        document.getElementById('addTaskForm').addEventListener('submit', this.handleAddTask.bind(this));
        
        // Drag and drop for columns
        document.querySelectorAll('.task-list').forEach(list => {
            list.addEventListener('dragover', this.handleDragOver.bind(this));
            list.addEventListener('drop', this.handleDrop.bind(this));
        });
        
        // Close modal on outside click
        document.getElementById('addTaskModal').addEventListener('click', (e) => {
            if (e.target.id === 'addTaskModal') {
                this.hideAddTaskModal();
            }
        });
    }

    // Setup quote rotation
    setupQuoteRotation() {
        const quoteElement = document.querySelector('.quote');
        if (!quoteElement) return;
        
        // Show random quote initially
        this.quoteIndex = Math.floor(Math.random() * this.quotes.length);
        quoteElement.textContent = `"${this.quotes[this.quoteIndex]}"`;
        
        // Rotate quotes every 15 seconds
        setInterval(() => {
            this.quoteIndex = (this.quoteIndex + 1) % this.quotes.length;
            quoteElement.style.opacity = '0';
            
            setTimeout(() => {
                quoteElement.textContent = `"${this.quotes[this.quoteIndex]}"`;
                quoteElement.style.opacity = '1';
            }, 500);
        }, 15000);
    }

    // Historical controls setup
    setupHistoricalControls() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (!startDateInput || !endDateInput) return;
        
        // Set default dates (last 30 days)
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        startDateInput.value = startDate.toISOString().split('T')[0];
        endDateInput.value = endDate.toISOString().split('T')[0];

        // Apply filters button
        const applyBtn = document.getElementById('applyFilters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const startDate = startDateInput.value;
                const endDate = endDateInput.value;
                const model = document.getElementById('modelFilter').value;
                
                if (startDate && endDate) {
                    this.loadHistoricalData(startDate, endDate, model);
                } else {
                    alert('Please select both start and end dates');
                }
            });
        }

        // Reset filters button
        const resetBtn = document.getElementById('resetFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.isShowingHistorical = false;
                this.generateMockHistoryData();
                this.generateMockSpendingData();
                this.updateSummaryCharts();
                this.updateTotalsTable();
                this.updateEfficiencyTable();
                
                document.getElementById('historyStatus').textContent = 'Showing live data';
                document.getElementById('modelFilter').value = '';
            });
        }
    }

    // Update history info display
    updateHistoryInfo(historyIndex) {
        const historySize = document.getElementById('historySize');
        if (!historySize) return;
        
        const sizeGB = (historyIndex.totalSize / (1024 * 1024 * 1024)).toFixed(2);
        const fileCount = historyIndex.files.length;
        
        let dateRange = '';
        if (historyIndex.oldestEntry && historyIndex.newestEntry) {
            const oldest = new Date(historyIndex.oldestEntry).toLocaleDateString();
            const newest = new Date(historyIndex.newestEntry).toLocaleDateString();
            dateRange = ` (${oldest} - ${newest})`;
        }
        
        historySize.textContent = 
            `History: ${fileCount} records, ${sizeGB}GB${dateRange}`;
    }

    // Update history status
    updateHistoryStatus(startDate, endDate, model) {
        const historyStatus = document.getElementById('historyStatus');
        if (!historyStatus) return;
        
        let status = `Showing historical data: ${startDate} to ${endDate}`;
        if (model) {
            const modelFilter = document.getElementById('modelFilter');
            const modelName = modelFilter.options[modelFilter.selectedIndex].text;
            status += ` (${modelName} only)`;
        }
        historyStatus.textContent = status;
    }

    // Render historical data
    renderHistoricalData() {
        if (!this.historicalData.length) return;

        // Update charts with historical data
        const labels = [];
        const datasets = [
            { name: 'GPT-5.2', tokens: [], spending: [] },
            { name: 'Claude Opus', tokens: [], spending: [] },
            { name: 'Claude Sonnet', tokens: [], spending: [] },
            { name: 'MiniMax', tokens: [], spending: [] },
            { name: 'OpenRouter GPT-4o', tokens: [], spending: [] },
            { name: 'OpenRouter Gemini', tokens: [], spending: [] }
        ];

        const modelKeyMap = {
            'openai-codex/gpt-5.2': 0,
            'anthropic/claude-opus-4-5': 1,
            'openrouter/anthropic/claude-sonnet-4': 2,
            'minimax/abab6.5s-chat': 3,
            'openrouter/openai/gpt-4o': 4,
            'openrouter/google/gemini-2.0-flash-001': 5
        };

        this.historicalData.forEach(dataPoint => {
            const date = new Date(dataPoint.timestamp);
            labels.push(date.toLocaleDateString() + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

            // Initialize all datasets with 0 for this timestamp
            datasets.forEach(dataset => {
                dataset.tokens.push(0);
                dataset.spending.push(0);
            });

            // Populate with actual data
            if (dataPoint.models) {
                Object.entries(dataPoint.models).forEach(([modelKey, model]) => {
                    const datasetIndex = modelKeyMap[modelKey];
                    if (datasetIndex !== undefined) {
                        const lastIndex = datasets[datasetIndex].tokens.length - 1;
                        datasets[datasetIndex].tokens[lastIndex] = model.dailyUsed || 0;
                        datasets[datasetIndex].spending[lastIndex] = model.dailyCost || 0;
                    }
                });
            }
        });

        // Update usage chart
        if (this.chart) {
            this.chart.data.labels = labels;
            datasets.forEach((dataset, index) => {
                if (this.chart.data.datasets[index]) {
                    this.chart.data.datasets[index].data = dataset.tokens;
                }
            });
            this.chart.update();
        }

        // Update spending chart
        if (this.spendingChart) {
            this.spendingChart.data.labels = labels;
            datasets.forEach((dataset, index) => {
                if (this.spendingChart.data.datasets[index]) {
                    this.spendingChart.data.datasets[index].data = dataset.spending;
                }
            });
            this.spendingChart.update();
        }
    }
    
    // Task management
    showAddTaskModal() {
        document.getElementById('addTaskModal').classList.add('show');
        document.getElementById('taskTitle').focus();
    }
    
    hideAddTaskModal() {
        document.getElementById('addTaskModal').classList.remove('show');
        document.getElementById('addTaskForm').reset();
    }
    
    async handleAddTask(e) {
        e.preventDefault();
        
        const tags = document.getElementById('taskTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        const dueDate = document.getElementById('taskDueDate').value;
        
        const task = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            priority: document.getElementById('taskPriority').value,
            tags: tags,
            column: this.currentColumn,
            dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString()
        };
        
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            
            if (response.ok) {
                await this.loadTasks(); // Refresh tasks
                this.renderCalendar(); // Refresh calendar view
                this.hideAddTaskModal();
            }
        } catch (error) {
            console.error('Failed to add task:', error);
        }
    }
    
    async editTask(taskId) {
        // TODO: Implement edit task functionality
        console.log('Edit task:', taskId);
    }
    
    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            // TODO: Implement delete task functionality
            console.log('Delete task:', taskId);
        }
    }
    
    // Complete task - moves to completed and logs to history
    async completeTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Task completed:', result);
                
                // Show success notification
                this.showNotification(`✅ "${result.task.title}" completed!`, 'success');
                
                // Refresh tasks
                await this.loadTasks();
                
                // Refresh history if viewing
                if (this.currentView === 'history') {
                    await this.loadTaskHistory();
                }
            } else {
                const error = await response.json();
                this.showNotification(`❌ Failed: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Failed to complete task:', error);
            this.showNotification('❌ Network error - please try again', 'error');
        }
    }
    
    // Load and display task history
    async loadTaskHistory(limit = 20, offset = 0) {
        try {
            const response = await fetch(`/api/tasks/history?limit=${limit}&offset=${offset}`);
            const data = await response.json();
            
            this.taskHistory = data;
            this.renderTaskHistory();
            
        } catch (error) {
            console.error('Failed to load task history:', error);
        }
    }
    
    // Render task history view
    renderTaskHistory() {
        const container = document.getElementById('taskHistoryContainer');
        if (!container) return;
        
        const { entries, stats, pagination } = this.taskHistory;
        
        let html = `
            <div class="history-stats">
                <div class="stat-card">
                    <span class="stat-value">${stats.totalCompleted}</span>
                    <span class="stat-label">Tasks Completed</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${stats.averageCompletionDays}</span>
                    <span class="stat-label">Avg Days to Complete</span>
                </div>
            </div>
            
            <div class="history-entries">
        `;
        
        if (entries.length === 0) {
            html += `<div class="no-history">No completed tasks yet. Complete some tasks to see them here! 🎯</div>`;
        } else {
            entries.forEach(entry => {
                const completedDate = new Date(entry.completedAt).toLocaleDateString();
                const daysText = entry.completionTime ? 
                    `<span class="completion-time">${entry.completionTime} days</span>` : '';
                
                html += `
                    <div class="history-entry">
                        <div class="history-entry-header">
                            <span class="history-title">${entry.title}</span>
                            <span class="history-priority priority-${entry.priority}">${entry.priority}</span>
                        </div>
                        <div class="history-meta">
                            <span>✓ Completed: ${completedDate}</span>
                            <span>From: ${entry.sourceColumn}</span>
                            ${daysText}
                        </div>
                        ${entry.tags?.length ? `
                            <div class="history-tags">${entry.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
                        ` : ''}
                    </div>
                `;
            });
        }
        
        html += `</div>`;
        
        // Pagination
        if (pagination.hasMore || pagination.offset > 0) {
            html += `
                <div class="history-pagination">
                    ${pagination.offset > 0 ? `
                        <button onclick="dashboard.loadTaskHistory(${pagination.limit}, ${pagination.offset - pagination.limit})">← Previous</button>
                    ` : ''}
                    <span>${pagination.offset + 1} - ${pagination.offset + entries.length} of ${pagination.total}</span>
                    ${pagination.hasMore ? `
                        <button onclick="dashboard.loadTaskHistory(${pagination.limit}, ${pagination.offset + pagination.limit})">Next →</button>
                    ` : ''}
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        // Check if notification container exists
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
            font-weight: 500;
        `;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Drag and drop
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        e.target.classList.add('dragging');
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }
    
    handleDragOver(e) {
        e.preventDefault();
    }
    
    async handleDrop(e) {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const targetColumn = e.target.closest('.kanban-column').dataset.column;
        
        if (targetColumn) {
            try {
                const response = await fetch(`/api/tasks/${taskId}/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toColumn: targetColumn })
                });
                
                if (response.ok) {
                    await this.loadTasks(); // Refresh tasks
                }
            } catch (error) {
                console.error('Failed to move task:', error);
            }
        }
    }
    
    // Initialize usage chart
    initializeChart() {
        const ctx = document.getElementById('usageChart');
        if (!ctx) return;
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'GPT-5.2 (Primary)',
                        data: [],
                        borderColor: '#808080',
                        backgroundColor: 'rgba(128, 128, 128, 0.15)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#808080',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Claude Opus 4.5',
                        data: [],
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#48bb78',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Claude Sonnet 4',
                        data: [],
                        borderColor: '#ed8936',
                        backgroundColor: 'rgba(237, 137, 54, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#ed8936',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'MiniMax ABAB 6.5s',
                        data: [],
                        borderColor: '#9f7aea',
                        backgroundColor: 'rgba(159, 122, 234, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#9f7aea',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'OpenRouter GPT-4o',
                        data: [],
                        borderColor: '#e53e3e',
                        backgroundColor: 'rgba(229, 62, 62, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#e53e3e',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'OpenRouter Gemini 2.0',
                        data: [],
                        borderColor: '#38a169',
                        backgroundColor: 'rgba(56, 161, 105, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#38a169',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12,
                                weight: '500'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#e0e0e0',
                        bodyColor: '#a0aec0',
                        borderColor: 'rgba(128, 128, 128, 0.25)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        titleFont: {
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        bodyFont: {
                            family: 'Inter, sans-serif'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(128, 128, 128, 0.12)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#a0aec0',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#e0e0e0',
                            font: {
                                family: 'Inter, sans-serif',
                                weight: '600',
                                size: 14
                            },
                            padding: {top: 10}
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(128, 128, 128, 0.12)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#a0aec0',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            },
                            padding: 8,
                            maxTicksLimit: 12,
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        },
                        title: {
                            display: true,
                            text: 'Token Usage',
                            color: '#e0e0e0',
                            font: {
                                family: 'Inter, sans-serif',
                                weight: '600',
                                size: 14
                            },
                            padding: {bottom: 10}
                        },
                        grace: '15%',
                        suggestedMin: 0
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    line: {
                        borderWidth: 3
                    },
                    point: {
                        hoverBorderWidth: 3
                    }
                }
            }
        });
    }

    // Initialize spending chart
    initializeSpendingChart() {
        const ctx = document.getElementById('spendingChart');
        if (!ctx) return;
        
        this.spendingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'GPT-5.2 (Primary)',
                        data: [],
                        borderColor: '#808080',
                        backgroundColor: 'rgba(128, 128, 128, 0.15)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#808080',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Claude Opus 4.5',
                        data: [],
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#48bb78',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Claude Sonnet 4',
                        data: [],
                        borderColor: '#ed8936',
                        backgroundColor: 'rgba(237, 137, 54, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#ed8936',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'MiniMax ABAB 6.5s',
                        data: [],
                        borderColor: '#9f7aea',
                        backgroundColor: 'rgba(159, 122, 234, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#9f7aea',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'OpenRouter GPT-4o',
                        data: [],
                        borderColor: '#e53e3e',
                        backgroundColor: 'rgba(229, 62, 62, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#e53e3e',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'OpenRouter Gemini 2.0',
                        data: [],
                        borderColor: '#38a169',
                        backgroundColor: 'rgba(56, 161, 105, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#38a169',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12,
                                weight: '500'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#e0e0e0',
                        bodyColor: '#a0aec0',
                        borderColor: 'rgba(128, 128, 128, 0.25)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        titleFont: {
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        bodyFont: {
                            family: 'Inter, sans-serif'
                        },
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(128, 128, 128, 0.12)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#a0aec0',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#e0e0e0',
                            font: {
                                family: 'Inter, sans-serif',
                                weight: '600',
                                size: 14
                            },
                            padding: {top: 10}
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(128, 128, 128, 0.12)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#a0aec0',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            },
                            padding: 8,
                            maxTicksLimit: 12,
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Cumulative Spending ($)',
                            color: '#e0e0e0',
                            font: {
                                family: 'Inter, sans-serif',
                                weight: '600',
                                size: 14
                            },
                            padding: {bottom: 10}
                        },
                        grace: '15%',
                        suggestedMin: 0
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    line: {
                        borderWidth: 3
                    },
                    point: {
                        hoverBorderWidth: 3
                    }
                }
            }
        });
    }

    // Generate mock historical data
    generateMockHistoryData() {
        const now = new Date();
        const labels = [];
        const datasets = [
            { name: 'GPT-5.2', data: [], baseUsage: 2800 },
            { name: 'Claude Opus', data: [], baseUsage: 1200 },
            { name: 'Claude Sonnet', data: [], baseUsage: 4500 },
            { name: 'MiniMax', data: [], baseUsage: 5400 }
        ];

        // Add OpenRouter models to datasets
        datasets.push(
            { name: 'OpenRouter GPT-4o', data: [], baseUsage: 2100 },
            { name: 'OpenRouter Gemini', data: [], baseUsage: 1800 }
        );

        // Generate data for the last 24 hours
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
            labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            
            datasets.forEach(dataset => {
                const hourOfDay = time.getHours();
                let multiplier = 1;
                
                if (hourOfDay >= 9 && hourOfDay <= 18) {
                    multiplier = 1.5 + Math.random() * 0.8;
                } else if (hourOfDay >= 19 && hourOfDay <= 23) {
                    multiplier = 0.8 + Math.random() * 0.4;
                } else {
                    multiplier = 0.1 + Math.random() * 0.3;
                }
                
                const usage = Math.floor(dataset.baseUsage * multiplier * (0.8 + Math.random() * 0.4));
                dataset.data.push(usage);
            });
        }

        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = datasets[0].data;
            this.chart.data.datasets[1].data = datasets[1].data;
            this.chart.data.datasets[2].data = datasets[2].data;
            this.chart.data.datasets[3].data = datasets[3].data;
            
            // Add data for OpenRouter models
            if (this.chart.data.datasets[4]) {
                this.chart.data.datasets[4].data = datasets[4].data;
            }
            if (this.chart.data.datasets[5]) {
                this.chart.data.datasets[5].data = datasets[5].data;
            }
            
            this.chart.update();
        }
    }

    // Initialize summary charts
    initializeSummaryCharts() {
        // Token Summary Chart
        const tokenCtx = document.getElementById('tokenSummaryChart');
        if (tokenCtx) {
            this.tokenSummaryChart = new Chart(tokenCtx, {
                type: 'bar',
                data: {
                    labels: ['Daily', 'Weekly', 'Monthly'],
                    datasets: [
                        {
                            label: 'GPT-5.2',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(128, 128, 128, 0.7)',
                            borderColor: '#808080',
                            borderWidth: 1
                        },
                        {
                            label: 'Claude Opus 4.5',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(72, 187, 120, 0.8)',
                            borderColor: '#48bb78',
                            borderWidth: 1
                        },
                        {
                            label: 'Claude Sonnet 4',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(237, 137, 54, 0.8)',
                            borderColor: '#ed8936',
                            borderWidth: 1
                        },
                        {
                            label: 'MiniMax ABAB 6.5s',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(159, 122, 234, 0.8)',
                            borderColor: '#9f7aea',
                            borderWidth: 1
                        },
                        {
                            label: 'OpenRouter GPT-4o',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(229, 62, 62, 0.8)',
                            borderColor: '#e53e3e',
                            borderWidth: 1
                        },
                        {
                            label: 'OpenRouter Gemini 2.0',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(56, 161, 105, 0.8)',
                            borderColor: '#38a169',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#e0e0e0',
                                font: {
                                    family: 'Inter, sans-serif',
                                    size: 11,
                                    weight: '500'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(26, 26, 46, 0.95)',
                            titleColor: '#e0e0e0',
                            bodyColor: '#a0aec0',
                            borderColor: 'rgba(128, 128, 128, 0.25)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' tokens';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#a0aec0',
                                font: {
                                    family: 'Inter, sans-serif',
                                    size: 11
                                }
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(128, 128, 128, 0.12)'
                            },
                            ticks: {
                                color: '#a0aec0',
                                font: {
                                    family: 'Inter, sans-serif',
                                    size: 11
                                },
                                padding: 8,
                                maxTicksLimit: 12,
                                callback: function(value) {
                                    return value.toLocaleString();
                                }
                            },
                            title: {
                                display: true,
                                text: 'Tokens',
                                color: '#e0e0e0',
                                font: {
                                    family: 'Inter, sans-serif',
                                    weight: '600',
                                    size: 12
                                }
                            },
                            grace: '30%',
                            suggestedMin: 0
                        }
                    }
                }
            });
        }

        // Spending Summary Chart
        const spendingCtx = document.getElementById('spendingSummaryChart');
        if (spendingCtx) {
            this.spendingSummaryChart = new Chart(spendingCtx, {
                type: 'bar',
                data: {
                    labels: ['Daily', 'Weekly', 'Monthly'],
                    datasets: [
                        {
                            label: 'GPT-5.2',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(128, 128, 128, 0.7)',
                            borderColor: '#808080',
                            borderWidth: 1
                        },
                        {
                            label: 'Claude Opus 4.5',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(72, 187, 120, 0.8)',
                            borderColor: '#48bb78',
                            borderWidth: 1
                        },
                        {
                            label: 'Claude Sonnet 4',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(237, 137, 54, 0.8)',
                            borderColor: '#ed8936',
                            borderWidth: 1
                        },
                        {
                            label: 'MiniMax ABAB 6.5s',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(159, 122, 234, 0.8)',
                            borderColor: '#9f7aea',
                            borderWidth: 1
                        },
                        {
                            label: 'OpenRouter GPT-4o',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(229, 62, 62, 0.8)',
                            borderColor: '#e53e3e',
                            borderWidth: 1
                        },
                        {
                            label: 'OpenRouter Gemini 2.0',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(56, 161, 105, 0.8)',
                            borderColor: '#38a169',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#e0e0e0',
                                font: {
                                    family: 'Inter, sans-serif',
                                    size: 11,
                                    weight: '500'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(26, 26, 46, 0.95)',
                            titleColor: '#e0e0e0',
                            bodyColor: '#a0aec0',
                            borderColor: 'rgba(128, 128, 128, 0.25)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#a0aec0',
                                font: {
                                    family: 'Inter, sans-serif',
                                    size: 11
                                }
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(128, 128, 128, 0.12)'
                            },
                            ticks: {
                                color: '#a0aec0',
                                font: {
                                    family: 'Inter, sans-serif',
                                    size: 11
                                },
                                padding: 8,
                                maxTicksLimit: 12,
                                callback: function(value) {
                                    return '$' + value.toFixed(2);
                                }
                            },
                            title: {
                                display: true,
                                text: 'Spending ($)',
                                color: '#e0e0e0',
                                font: {
                                    family: 'Inter, sans-serif',
                                    weight: '600',
                                    size: 12
                                }
                            },
                            grace: '30%',
                            suggestedMin: 0
                        }
                    }
                }
            });
        }
    }

    // Generate mock spending data
    generateMockSpendingData() {
        const now = new Date();
        const labels = [];
        const datasets = [
            { name: 'GPT-5.2', data: [], dailyRate: 0.45 },
            { name: 'Claude Opus', data: [], dailyRate: 0.32 },
            { name: 'Claude Sonnet', data: [], dailyRate: 0.18 },
            { name: 'MiniMax', data: [], dailyRate: 0.08 },
            { name: 'OpenRouter GPT-4o', data: [], dailyRate: 0.12 },
            { name: 'OpenRouter Gemini', data: [], dailyRate: 0.09 }
        ];

        let cumulativeSpending = [0, 0, 0, 0, 0, 0];

        // Generate data for the last 24 hours
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
            labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            
            datasets.forEach((dataset, index) => {
                const hourOfDay = time.getHours();
                let multiplier = 1;
                
                // Higher spending during work hours
                if (hourOfDay >= 9 && hourOfDay <= 18) {
                    multiplier = 1.8 + Math.random() * 0.7;
                } else if (hourOfDay >= 19 && hourOfDay <= 23) {
                    multiplier = 0.6 + Math.random() * 0.4;
                } else {
                    multiplier = 0.05 + Math.random() * 0.15;
                }
                
                const hourlySpend = dataset.dailyRate * multiplier * (0.8 + Math.random() * 0.4) / 24;
                cumulativeSpending[index] += hourlySpend;
                dataset.data.push(cumulativeSpending[index]);
            });
        }

        // Update spending chart with generated data
        if (this.spendingChart) {
            this.spendingChart.data.labels = labels;
            this.spendingChart.data.datasets[0].data = datasets[0].data;
            this.spendingChart.data.datasets[1].data = datasets[1].data;
            this.spendingChart.data.datasets[2].data = datasets[2].data;
            this.spendingChart.data.datasets[3].data = datasets[3].data;
            this.spendingChart.data.datasets[4].data = datasets[4].data;
            this.spendingChart.data.datasets[5].data = datasets[5].data;
            this.spendingChart.update();
        }
    }

    // Update chart with new data point
    updateChart() {
        if (!this.chart || !this.usage.models) return;
        
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        this.chart.data.labels.push(timeLabel);
        
        const modelKeys = ['openai-codex/gpt-5.2', 'anthropic/claude-opus-4-5', 'openrouter/anthropic/claude-sonnet-4', 'minimax/abab6.5s-chat', 'openrouter/openai/gpt-4o', 'openrouter/google/gemini-2.0-flash-001'];
        modelKeys.forEach((modelKey, index) => {
            if (this.usage.models[modelKey]) {
                this.chart.data.datasets[index].data.push(this.usage.models[modelKey].dailyUsed);
            }
        });
        
        // Keep only last 24 points
        if (this.chart.data.labels.length > 24) {
            this.chart.data.labels.shift();
            this.chart.data.datasets.forEach(dataset => {
                dataset.data.shift();
            });
        }
        
        this.chart.update();
    }

    // Update spending chart with new data point
    updateSpendingChart() {
        if (!this.spendingChart || !this.usage.models) return;
        
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        // Add new data point
        this.spendingChart.data.labels.push(timeLabel);
        
        const modelKeys = ['openai-codex/gpt-5.2', 'anthropic/claude-opus-4-5', 'openrouter/anthropic/claude-sonnet-4', 'minimax/abab6.5s-chat', 'openrouter/openai/gpt-4o', 'openrouter/google/gemini-2.0-flash-001'];
        modelKeys.forEach((modelKey, index) => {
            if (this.usage.models[modelKey]) {
                // Add the current monthly spent as a cumulative value
                this.spendingChart.data.datasets[index].data.push(this.usage.models[modelKey].monthlySpent);
            }
        });
        
        // Keep only last 24 points
        if (this.spendingChart.data.labels.length > 24) {
            this.spendingChart.data.labels.shift();
            this.spendingChart.data.datasets.forEach(dataset => {
                dataset.data.shift();
            });
        }
        
        this.spendingChart.update();
    }

    // Update efficiency table
    updateEfficiencyTable() {
        if (!this.usage.models) return;

        const models = this.usage.models;
        const modelKeys = ['openai-codex/gpt-5.2', 'anthropic/claude-opus-4-5', 'openrouter/anthropic/claude-sonnet-4', 'minimax/abab6.5s-chat', 'openrouter/openai/gpt-4o', 'openrouter/google/gemini-2.0-flash-001'];
        
        const tbody = document.getElementById('efficiencyTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        const efficiencyData = [];

        modelKeys.forEach(modelKey => {
            if (models[modelKey]) {
                const model = models[modelKey];
                const dailyTokens = model.dailyUsed;
                const dailyCost = model.monthlySpent / 30; // Estimate daily from monthly
                const costPer1k = dailyTokens > 0 ? (dailyCost / dailyTokens * 1000) : 0;
                const monthlyProjection = dailyCost * 30;
                
                // Determine efficiency rating
                let efficiencyRating = '';
                let efficiencyClass = '';
                if (costPer1k < 0.01) {
                    efficiencyRating = 'Excellent';
                    efficiencyClass = 'efficiency-excellent';
                } else if (costPer1k < 0.03) {
                    efficiencyRating = 'Good';
                    efficiencyClass = 'efficiency-good';
                } else if (costPer1k < 0.06) {
                    efficiencyRating = 'Average';
                    efficiencyClass = 'efficiency-average';
                } else {
                    efficiencyRating = 'Poor';
                    efficiencyClass = 'efficiency-poor';
                }

                efficiencyData.push({
                    name: model.name,
                    dailyTokens,
                    dailyCost,
                    costPer1k,
                    monthlyProjection,
                    efficiencyRating,
                    efficiencyClass
                });
            }
        });

        // Sort by cost efficiency (lowest cost per 1k tokens first)
        efficiencyData.sort((a, b) => a.costPer1k - b.costPer1k);

        efficiencyData.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="model-name-cell">${data.name}</td>
                <td class="tokens-cell">${data.dailyTokens.toLocaleString()}</td>
                <td class="cost-cell">$${data.dailyCost.toFixed(3)}</td>
                <td class="ratio-cell">$${data.costPer1k.toFixed(4)}</td>
                <td class="projection-cell">$${data.monthlyProjection.toFixed(2)}</td>
                <td><span class="efficiency-rating ${data.efficiencyClass}">${data.efficiencyRating}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update totals table
    updateTotalsTable() {
        if (!this.usage.models) return;

        const models = this.usage.models;
        const modelKeys = ['openai-codex/gpt-5.2', 'anthropic/claude-opus-4-5', 'openrouter/anthropic/claude-sonnet-4', 'minimax/abab6.5s-chat', 'openrouter/openai/gpt-4o', 'openrouter/google/gemini-2.0-flash-001'];

        // Calculate totals
        let totalDailyTokens = 0;
        let totalDailySpending = 0;
        let totalMonthlySpending = 0;

        modelKeys.forEach(modelKey => {
            if (models[modelKey]) {
                const model = models[modelKey];
                totalDailyTokens += model.dailyUsed;
                totalMonthlySpending += model.monthlySpent;
                totalDailySpending += model.monthlySpent / 30; // Estimate daily from monthly
            }
        });

        // Calculate weekly (7x daily) and monthly estimates
        const totalWeeklyTokens = totalDailyTokens * 7;
        const totalMonthlyTokens = totalDailyTokens * 30;
        const totalWeeklySpending = totalDailySpending * 7;

        // Calculate cost per 1K tokens
        const dailyCostPer1k = totalDailyTokens > 0 ? (totalDailySpending / totalDailyTokens * 1000) : 0;
        const weeklyCostPer1k = totalWeeklyTokens > 0 ? (totalWeeklySpending / totalWeeklyTokens * 1000) : 0;
        const monthlyCostPer1k = totalMonthlyTokens > 0 ? (totalMonthlySpending / totalMonthlyTokens * 1000) : 0;

        // Update the table
        const dailyTokens = document.getElementById('dailyTokens');
        const weeklyTokens = document.getElementById('weeklyTokens');
        const monthlyTokens = document.getElementById('monthlyTokens');
        const dailySpending = document.getElementById('dailySpending');
        const weeklySpending = document.getElementById('weeklySpending');
        const monthlySpending = document.getElementById('monthlySpending');
        const dailyCostPer1kEl = document.getElementById('dailyCostPer1k');
        const weeklyCostPer1kEl = document.getElementById('weeklyCostPer1k');
        const monthlyCostPer1kEl = document.getElementById('monthlyCostPer1k');
        
        if (dailyTokens) dailyTokens.textContent = totalDailyTokens.toLocaleString();
        if (weeklyTokens) weeklyTokens.textContent = totalWeeklyTokens.toLocaleString();
        if (monthlyTokens) monthlyTokens.textContent = totalMonthlyTokens.toLocaleString();
        if (dailySpending) dailySpending.textContent = '$' + totalDailySpending.toFixed(2);
        if (weeklySpending) weeklySpending.textContent = '$' + totalWeeklySpending.toFixed(2);
        if (monthlySpending) monthlySpending.textContent = '$' + totalMonthlySpending.toFixed(2);
        if (dailyCostPer1kEl) dailyCostPer1kEl.textContent = '$' + dailyCostPer1k.toFixed(3);
        if (weeklyCostPer1kEl) weeklyCostPer1kEl.textContent = '$' + weeklyCostPer1k.toFixed(3);
        if (monthlyCostPer1kEl) monthlyCostPer1kEl.textContent = '$' + monthlyCostPer1k.toFixed(3);
    }

    // Update summary charts
    updateSummaryCharts() {
        if (!this.usage.models) return;

        const models = this.usage.models;
        const modelKeys = ['openai-codex/gpt-5.2', 'anthropic/claude-opus-4-5', 'openrouter/anthropic/claude-sonnet-4', 'minimax/abab6.5s-chat', 'openrouter/openai/gpt-4o', 'openrouter/google/gemini-2.0-flash-001'];

        // Calculate summary data
        const tokenData = [[], [], []]; // daily, weekly, monthly
        const spendingData = [[], [], []]; // daily, weekly, monthly

        modelKeys.forEach((modelKey, index) => {
            if (models[modelKey]) {
                const model = models[modelKey];
                
                // Token usage (daily is current usage, estimate weekly/monthly)
                const daily = model.dailyUsed;
                const weekly = daily * 7; // Simple estimation
                const monthly = daily * 30; // Simple estimation
                
                tokenData[0][index] = daily;
                tokenData[1][index] = weekly;
                tokenData[2][index] = monthly;
                
                // Spending (current monthly spent, estimate daily/weekly)
                const monthlySpent = model.monthlySpent;
                const estimatedDaily = monthlySpent / 30;
                const estimatedWeekly = monthlySpent / 4;
                
                spendingData[0][index] = estimatedDaily;
                spendingData[1][index] = estimatedWeekly;
                spendingData[2][index] = monthlySpent;
            }
        });

        // Update token summary chart
        if (this.tokenSummaryChart) {
            this.tokenSummaryChart.data.datasets.forEach((dataset, index) => {
                dataset.data = [tokenData[0][index] || 0, tokenData[1][index] || 0, tokenData[2][index] || 0];
            });
            this.tokenSummaryChart.update();
        }

        // Update spending summary chart
        if (this.spendingSummaryChart) {
            this.spendingSummaryChart.data.datasets.forEach((dataset, index) => {
                dataset.data = [spendingData[0][index] || 0, spendingData[1][index] || 0, spendingData[2][index] || 0];
            });
            this.spendingSummaryChart.update();
        }
    }

    updateStatus(status) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            statusElement.className = `stat-value status-${status}`;
        }
    }

    updateHeaderSpendingSummary() {
        // Get current month's food spending from food tracker if available
        let foodSpent = 0;
        if (this.foodSpendingTracker) {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            this.foodSpendingTracker.foodData.forEach(purchase => {
                const purchaseDate = new Date(purchase.date);
                if (purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear) {
                    foodSpent += purchase.amount;
                }
            });
        }
        
        // AI spending from expenses data
        let aiSpent = 0;
        if (this.expenses && this.expenses.totalSpent) {
            aiSpent = this.expenses.totalSpent;
        }
        
        // Bills (mock data - would come from actual bills API)
        const billsSpent = 2100; // Mock value
        
        // Budgets
        const foodBudget = 800;
        const aiBudget = 200;
        const billsBudget = 3500;
        
        // Update values
        const foodEl = document.getElementById('foodSpendValue');
        const aiEl = document.getElementById('aiSpendValue');
        const billsEl = document.getElementById('billsSpendValue');
        
        if (foodEl) foodEl.textContent = '$' + foodSpent.toFixed(2);
        if (aiEl) aiEl.textContent = '$' + aiSpent.toFixed(2);
        if (billsEl) billsEl.textContent = '$' + billsSpent.toFixed(2);
        
        // Update status indicators
        this.updateSpendingStatus('food', foodSpent, foodBudget);
        this.updateSpendingStatus('ai', aiSpent, aiBudget);
        this.updateSpendingStatus('bills', billsSpent, billsBudget);
    }
    
    updateSpendingStatus(category, spent, budget) {
        const statusEl = document.getElementById(category + 'Status');
        if (!statusEl) return;
        
        const percent = (spent / budget) * 100;
        statusEl.className = 'spending-status';
        
        if (percent >= 100) {
            statusEl.classList.add('red');
        } else if (percent >= 80) {
            statusEl.classList.add('yellow');
        } else {
            statusEl.classList.add('green');
        }
    }

    // Tab Navigation
    setupTabNavigation() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Update active states
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                // Refresh data when switching to expenses or rate-limits tab
                if (tabId === 'expenses') {
                    this.loadExpenses().then(() => this.renderExpenses());
                } else if (tabId === 'rate-limits') {
                    this.loadRateLimits().then(() => this.renderRateLimits());
                }
            });
        });
    }

    // Initialize expense chart
    initializeExpenseChart() {
        const ctx = document.getElementById('expenseChart');
        if (!ctx) return;
        
        this.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['OpenAI', 'OpenRouter', 'Anthropic', 'MiniMax'],
                datasets: [{
                    data: [2.85, 30.62, 0, 0],
                    backgroundColor: ['#10a37f', '#2563eb', '#d97706', '#7c3aed'],
                    borderColor: '#1a1a1a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#e0e0e0',
                            font: { family: 'Inter, sans-serif', size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#e0e0e0',
                        bodyColor: '#a0aec0',
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percent = ((value / total) * 100).toFixed(1);
                                return `${context.label}: $${value.toFixed(2)} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Render expenses section
    renderExpenses() {
        if (!this.expenses) return;
        
        const expenses = this.expenses;
        
        // Update budget overview cards
        const totalBudget = document.getElementById('totalBudget');
        const totalSpent = document.getElementById('totalSpent');
        const totalRemaining = document.getElementById('totalRemaining');
        const dailyAverage = document.getElementById('dailyAverage');
        
        if (totalBudget) totalBudget.textContent = `$${expenses.monthlyBudget.toFixed(2)}`;
        if (totalSpent) totalSpent.textContent = `$${expenses.totalSpent.toFixed(2)}`;
        if (totalRemaining) totalRemaining.textContent = `$${expenses.totalRemaining.toFixed(2)}`;
        if (dailyAverage) dailyAverage.textContent = `$${expenses.dailyAverage.toFixed(2)}`;
        
        // Update overall progress
        const overallPercent = document.getElementById('overallPercent');
        const progressBar = document.getElementById('overallProgressBar');
        const statusEl = document.getElementById('overallStatus');
        
        if (overallPercent) overallPercent.textContent = `${expenses.budgetPercent}%`;
        if (progressBar) {
            progressBar.style.width = `${Math.min(expenses.budgetPercent, 100)}%`;
            progressBar.className = 'progress-bar' + (expenses.budgetPercent >= 100 ? ' danger' : expenses.budgetPercent >= 80 ? ' warning' : '');
        }
        if (statusEl) {
            statusEl.className = 'progress-status ' + (expenses.budgetPercent >= 100 ? 'danger' : expenses.budgetPercent >= 80 ? 'warning' : 'ok');
            statusEl.textContent = expenses.budgetPercent >= 100 ? 'Budget Exceeded' : expenses.budgetPercent >= 80 ? 'Warning' : 'On Track';
        }
        
        // Render provider cards
        this.renderProviderCards();
        
        // Update expense chart
        this.updateExpenseChart();
        
        // Render model expenses table
        this.renderModelExpensesTable();
    }

    // Render provider cards
    renderProviderCards() {
        const grid = document.getElementById('providerGrid');
        if (!grid || !this.expenses) return;
        
        grid.innerHTML = '';
        
        Object.entries(this.expenses.providers || {}).forEach(([providerKey, provider]) => {
            const card = document.createElement('div');
            card.className = 'provider-card';
            card.innerHTML = `
                <div class="provider-header">
                    <div class="provider-icon ${providerKey}">
                        <i class="fas fa-server"></i>
                    </div>
                    <div class="provider-name">${provider.name}</div>
                </div>
                <div class="provider-stats">
                    <div class="provider-stat">
                        <span class="provider-stat-label">Budget</span>
                        <span class="provider-stat-value">$${provider.budget.toFixed(2)}</span>
                    </div>
                    <div class="provider-stat">
                        <span class="provider-stat-label">Spent</span>
                        <span class="provider-stat-value spent">$${provider.totalSpent.toFixed(2)}</span>
                    </div>
                    <div class="provider-stat">
                        <span class="provider-stat-label">Remaining</span>
                        <span class="provider-stat-value remaining">$${provider.remaining.toFixed(2)}</span>
                    </div>
                    <div class="provider-stat">
                        <span class="provider-stat-label">Models</span>
                        <span class="provider-stat-value">${provider.models.length}</span>
                    </div>
                </div>
                <div class="provider-progress-bar">
                    <div class="provider-progress-fill ${provider.status}" style="width: ${Math.min(provider.budgetPercent, 100)}%"></div>
                </div>
                <div class="provider-status">${provider.budgetPercent.toFixed(1)}% used</div>
            `;
            grid.appendChild(card);
        });
    }

    // Update expense chart
    updateExpenseChart() {
        if (!this.expenseChart || !this.expenses) return;
        
        const labels = [];
        const data = [];
        
        Object.entries(this.expenses.providers || {}).forEach(([key, provider]) => {
            labels.push(provider.name);
            data.push(provider.totalSpent);
        });
        
        this.expenseChart.data.labels = labels;
        this.expenseChart.data.datasets[0].data = data;
        this.expenseChart.update();
    }

    // Render model expenses table
    renderModelExpensesTable() {
        const tbody = document.getElementById('modelExpensesTableBody');
        if (!tbody || !this.expenses) return;
        
        tbody.innerHTML = '';
        
        Object.entries(this.expenses.providers || {}).forEach(([providerKey, provider]) => {
            provider.models.forEach(model => {
                const row = document.createElement('tr');
                const usagePercent = (model.monthlySpent / model.monthlyCost * 100).toFixed(1);
                row.innerHTML = `
                    <td>${provider.name}</td>
                    <td>${model.name}</td>
                    <td>$${model.monthlyCost.toFixed(2)}</td>
                    <td class="spending-value">$${model.monthlySpent.toFixed(2)}</td>
                    <td class="token-value">$${Math.max(0, model.monthlyCost - model.monthlySpent).toFixed(2)}</td>
                    <td>
                        <div class="rate-limit-bar-container">
                            <div class="rate-limit-bar ${usagePercent >= 100 ? 'danger' : usagePercent >= 80 ? 'warning' : ''}" style="width: ${Math.min(usagePercent, 100)}%"></div>
                        </div>
                        <span class="rate-limit-bar-label">${usagePercent}%</span>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
    }

    // Render rate limits section
    renderRateLimits() {
        if (!this.rateLimits) return;
        
        const models = this.rateLimits.models || {};
        
        // Count statuses
        let available = 0, warning = 0, limited = 0, cooldown = 0;
        const cooldownItems = [];
        
        Object.entries(models).forEach(([modelId, model]) => {
            switch (model.status) {
                case 'available': available++; break;
                case 'warning': warning++; break;
                case 'rate-limited':
                case 'budget-exceeded': limited++; break;
                case 'cooldown': 
                    cooldown++; 
                    if (model.cooldownUntil) {
                        cooldownItems.push({
                            id: modelId,
                            name: model.name,
                            provider: model.provider,
                            until: new Date(model.cooldownUntil)
                        });
                    }
                    break;
            }
        });
        
        // Update status cards
        const availableCount = document.getElementById('availableCount');
        const warningCount = document.getElementById('warningCount');
        const limitedCount = document.getElementById('limitedCount');
        const cooldownCount = document.getElementById('cooldownCount');
        
        if (availableCount) availableCount.textContent = available;
        if (warningCount) warningCount.textContent = warning;
        if (limitedCount) limitedCount.textContent = limited;
        if (cooldownCount) cooldownCount.textContent = cooldown;
        
        // Render rate limit cards
        this.renderRateLimitCards(models);
        
        // Render cooldown list
        this.renderCooldownList(cooldownItems);
        
        // Render rate limits table
        this.renderRateLimitsTable(models);
    }

    // Render rate limit cards
    renderRateLimitCards(models) {
        const grid = document.getElementById('rateLimitsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        Object.entries(models).forEach(([modelId, model]) => {
            const card = document.createElement('div');
            card.className = `rate-limit-card ${model.status}`;
            
            const usagePercent = parseFloat(model.usagePercent);
            const budgetPercent = parseFloat(model.budgetPercent);
            
            card.innerHTML = `
                <div class="rate-limit-header">
                    <div>
                        <div class="rate-limit-title">${model.name}</div>
                        <div class="rate-limit-provider">${model.provider}</div>
                    </div>
                    <div class="rate-limit-status ${model.status}">${model.status.replace('-', ' ')}</div>
                </div>
                <div class="rate-limit-stats">
                    <div class="rate-limit-stat">
                        <span class="rate-limit-stat-label">Daily Used</span>
                        <span class="rate-limit-stat-value">${model.dailyUsed.toLocaleString()}</span>
                    </div>
                    <div class="rate-limit-stat">
                        <span class="rate-limit-stat-label">Daily Limit</span>
                        <span class="rate-limit-stat-value">${model.dailyLimit.toLocaleString()}</span>
                    </div>
                    <div class="rate-limit-stat">
                        <span class="rate-limit-stat-label">Spent</span>
                        <span class="rate-limit-stat-value">$${model.monthlySpent.toFixed(2)}</span>
                    </div>
                    <div class="rate-limit-stat">
                        <span class="rate-limit-stat-label">Budget</span>
                        <span class="rate-limit-stat-value">$${model.monthlyBudget.toFixed(2)}</span>
                    </div>
                </div>
                <div class="rate-limit-bar-container">
                    <div class="rate-limit-bar ${usagePercent >= 100 ? 'danger' : usagePercent >= 80 ? 'warning' : ''}" style="width: ${Math.min(usagePercent, 100)}%"></div>
                </div>
                <div class="rate-limit-bar-label">Daily: ${usagePercent}% | Budget: ${budgetPercent}%</div>
                <div class="rate-limit-auth">
                    <span>Rate: ${model.rateLimit}/min</span>
                    <span class="auth-status ${model.authenticated ? 'authenticated' : 'unauthenticated'}">
                        <i class="fas ${model.authenticated ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${model.authenticated ? 'Auth OK' : 'No Auth'}
                    </span>
                </div>
            `;
            
            grid.appendChild(card);
        });
    }

    // Render cooldown list
    renderCooldownList(cooldownItems) {
        const section = document.getElementById('cooldownSection');
        const list = document.getElementById('cooldownList');
        
        if (!section || !list) return;
        
        if (cooldownItems.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        list.innerHTML = '';
        
        cooldownItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cooldown-item';
            div.dataset.modelId = item.id;
            div.dataset.until = item.until.getTime();
            
            div.innerHTML = `
                <div>
                    <div class="cooldown-model">${item.name}</div>
                    <div class="cooldown-provider">${item.provider}</div>
                </div>
                <div class="cooldown-timer">
                    <i class="fas fa-hourglass-half"></i>
                    <span class="cooldown-time">--:--</span>
                </div>
            `;
            
            list.appendChild(div);
        });
    }

    // Start cooldown timers
    startCooldownTimer() {
        setInterval(() => {
            const items = document.querySelectorAll('.cooldown-item');
            const now = Date.now();
            
            items.forEach(item => {
                const until = parseInt(item.dataset.until);
                const remaining = Math.max(0, until - now);
                
                if (remaining === 0) {
                    item.remove();
                    // Refresh rate limits when cooldown expires
                    this.loadRateLimits().then(() => this.renderRateLimits());
                } else {
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    const timeEl = item.querySelector('.cooldown-time');
                    if (timeEl) {
                        timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }
                }
            });
            
            // Hide cooldown section if empty
            const list = document.getElementById('cooldownList');
            const section = document.getElementById('cooldownSection');
            if (list && section && list.children.length === 0) {
                section.style.display = 'none';
            }
        }, 1000);
    }

    // Render rate limits table
    renderRateLimitsTable(models) {
        const tbody = document.getElementById('rateLimitsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        Object.entries(models).forEach(([modelId, model]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${model.name}</td>
                <td>${model.provider}</td>
                <td><span class="status-badge ${model.status}">${model.status.replace('-', ' ')}</span></td>
                <td>${model.usagePercent}%</td>
                <td>${model.budgetPercent}%</td>
                <td>${model.rateLimit}/min</td>
                <td><i class="fas ${model.authenticated ? 'fa-check-circle' : 'fa-times-circle'}" style="color: ${model.authenticated ? '#48bb78' : '#fc8181'}"></i></td>
            `;
            tbody.appendChild(row);
        });
    }

    // ============================================
    // CALENDAR FUNCTIONALITY
    // ============================================
    
    setupCalendar() {
        // View toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.view-btn').dataset.view;
                this.switchCalendarView(view);
            });
        });

        // Navigation buttons
        document.getElementById('prevPeriod').addEventListener('click', () => {
            this.navigateCalendar(-1);
        });

        document.getElementById('nextPeriod').addEventListener('click', () => {
            this.navigateCalendar(1);
        });

        document.getElementById('goToToday').addEventListener('click', () => {
            this.calendarCurrentDate = new Date();
            this.renderCalendar();
        });

        // Initial render
        this.renderCalendar();
    }

    switchCalendarView(view) {
        this.calendarView = view;

        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Toggle view visibility
        document.getElementById('monthView').classList.toggle('hidden', view !== 'month');
        document.getElementById('weekView').classList.toggle('hidden', view !== 'week');

        this.renderCalendar();
    }

    navigateCalendar(direction) {
        if (this.calendarView === 'month') {
            this.calendarCurrentDate.setMonth(this.calendarCurrentDate.getMonth() + direction);
        } else {
            this.calendarCurrentDate.setDate(this.calendarCurrentDate.getDate() + (direction * 7));
        }
        this.renderCalendar();
    }

    renderCalendar() {
        if (this.calendarView === 'month') {
            this.renderMonthView();
        } else {
            this.renderWeekView();
        }
        this.updateCalendarTitle();
    }

    updateCalendarTitle() {
        if (this.calendarView === 'month') {
            const options = { month: 'long', year: 'numeric' };
            const title = this.calendarCurrentDate.toLocaleDateString('en-US', options);
            document.getElementById('currentMonthYear').textContent = title;
        } else {
            // Week view - show the week range (e.g., "Feb 2 - Feb 8, 2026")
            const weekStart = new Date(this.calendarCurrentDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
            const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
            const startDay = weekStart.getDate();
            const endDay = weekEnd.getDate();
            const year = weekEnd.getFullYear();
            
            let title;
            if (startMonth === endMonth) {
                title = `${startMonth} ${startDay} - ${endDay}, ${year}`;
            } else {
                title = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
            }
            document.getElementById('currentMonthYear').textContent = title;
        }
    }

    renderMonthView() {
        const grid = document.getElementById('monthGrid');
        grid.innerHTML = '';

        const year = this.calendarCurrentDate.getFullYear();
        const month = this.calendarCurrentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayDiv = this.createDayElement(prevMonthLastDay - i, true);
            grid.appendChild(dayDiv);
        }

        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dayDiv = this.createDayElement(day, false, isToday, year, month);
            grid.appendChild(dayDiv);
        }

        const remainingCells = 42 - (startingDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            const dayDiv = this.createDayElement(day, true);
            grid.appendChild(dayDiv);
        }
    }

    createDayElement(day, isOtherMonth, isToday = false, year = null, month = null) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        if (isOtherMonth) div.classList.add('other-month');
        if (isToday) div.classList.add('today');

        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        div.appendChild(dayNumber);

        if (!isOtherMonth && year !== null && month !== null) {
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'day-tasks';

            const tasks = this.getTasksForDate(year, month, day);
            const events = this.getEventsForDate(year, month, day);

            const allItems = [].concat(
                tasks.map(t => Object.assign({}, t, { type: 'task' })),
                events.map(e => Object.assign({}, e, { type: 'event' }))
            );

            const maxVisible = 3;
            allItems.slice(0, maxVisible).forEach(item => {
                const indicator = document.createElement('div');
                if (item.type === 'event') {
                    indicator.className = 'day-task-indicator event';
                    indicator.style.background = 'rgba(72, 187, 120, 0.3)';
                    indicator.style.borderLeft = '3px solid #48bb78';
                    indicator.textContent = '📅 ' + item.title;
                } else {
                    const isOverdue = item.column !== 'completed' && new Date(item.dueDate || item.created) < new Date().setHours(0,0,0,0);
                    indicator.className = 'day-task-indicator ' + item.column + (isOverdue ? ' overdue' : '');
                    indicator.textContent = item.title;
                }
                tasksContainer.appendChild(indicator);
            });

            if (allItems.length > maxVisible) {
                const more = document.createElement('div');
                more.className = 'day-task-more';
                more.textContent = '+' + (allItems.length - maxVisible) + ' more';
                tasksContainer.appendChild(more);
            }

            div.appendChild(tasksContainer);
            div.addEventListener('click', () => {
                this.showDayDetails(year, month, day, tasks, events);
            });
        }

        return div;
    }

    getEventsForDate(year, month, day) {
        if (!this.calendarData || !this.calendarData.events) return [];
        const checkDate = new Date(year, month, day);
        // Compare by local date (browser local timezone)
        const checkDateStr = checkDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
        return this.calendarData.events.filter(event => {
            if (!event.start) return false;
            const eventDate = new Date(event.start);
            const eventDateStr = eventDate.toLocaleDateString('en-CA');
            return eventDateStr === checkDateStr;
        });
    }

    renderWeekView() {
        const header = document.getElementById('weekHeader');
        const grid = document.getElementById('weekGrid');
        header.innerHTML = '<div></div>';
        grid.innerHTML = '';

        const weekStart = new Date(this.calendarCurrentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            const isToday = today.toDateString() === dayDate.toDateString();
            const dayHeader = document.createElement('div');
            dayHeader.className = 'week-day-header';
            if (isToday) dayHeader.classList.add('today');
            dayHeader.innerHTML = '<div class="week-day-name">' + dayNames[i] + '</div><div class="week-day-date">' + dayDate.getDate() + '</div>';
            header.appendChild(dayHeader);
        }

        const timeSlots = ['All Day'];
        for (let hour = 6; hour <= 22; hour += 2) timeSlots.push(hour + ':00');

        timeSlots.forEach((time) => {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = time;
            grid.appendChild(timeLabel);

            for (let day = 0; day < 7; day++) {
                const dayDate = new Date(weekStart);
                dayDate.setDate(dayDate.getDate() + day);
                const isToday = today.toDateString() === dayDate.toDateString();

                const dayColumn = document.createElement('div');
                dayColumn.className = 'week-day-column';
                if (isToday) dayColumn.classList.add('today');

                const tasks = this.getTasksForDate(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
                const events = this.getEventsForDate(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());

                tasks.forEach(task => {
                    const taskEl = document.createElement('div');
                    taskEl.className = 'week-task-item ' + task.column;
                    taskEl.innerHTML = '<div class="week-task-title">' + task.title + '</div><div class="week-task-priority">' + task.priority + ' priority</div>';
                    taskEl.addEventListener('click', () => {
                        this.showDayDetails(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), [task], events);
                    });
                    dayColumn.appendChild(taskEl);
                });

                events.forEach(event => {
                    const eventEl = document.createElement('div');
                    eventEl.className = 'week-task-item event';
                    eventEl.style.borderLeft = '3px solid #48bb78';
                    eventEl.style.background = 'rgba(72, 187, 120, 0.15)';
                    eventEl.innerHTML = '<div class="week-task-title">📅 ' + event.title + '</div><div class="week-task-priority">' + (event.calendarName || 'Calendar') + '</div>';
                    eventEl.addEventListener('click', () => {
                        this.showDayDetails(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), tasks, [event]);
                    });
                    dayColumn.appendChild(eventEl);
                });

                if (tasks.length === 0 && events.length === 0) {
                    dayColumn.innerHTML = '<div style="color: #404040; font-size: 0.75em; text-align: center; margin-top: 20px;">-</div>';
                }

                grid.appendChild(dayColumn);
            }
        });
    }

    getTasksForDate(year, month, day) {
        const tasks = [];
        const targetDate = new Date(year, month, day);

        // Check all columns for tasks
        ['todo', 'inprogress', 'review', 'completed'].forEach(column => {
            if (this.tasks[column]) {
                this.tasks[column].forEach(task => {
                    // Use dueDate if available, otherwise fall back to created date
                    const taskDateStr = task.dueDate || task.created;
                    const taskDate = new Date(taskDateStr);
                    if (taskDate.toDateString() === targetDate.toDateString()) {
                        tasks.push({ ...task, column });
                    }
                });
            }
        });

        return tasks;
    }

    showDayDetails(year, month, day, tasks, events = []) {
        const date = new Date(year, month, day);
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Create modal content
        const formattedDateForInput = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const modalContent = `
            <div class="modal show day-modal" id="dayModal">
                <div class="modal-content">
                    <div class="day-modal-header">
                        <h3><i class="fas fa-calendar-day"></i> ${dateStr}</h3>
                        <div class="day-modal-actions">
                            <button class="quick-add-btn" onclick="document.getElementById('dayModal').remove(); dashboard.showQuickAddTask('${formattedDateForInput}')">
                                <i class="fas fa-plus"></i> Add Task
                            </button>
                            <button class="close-btn" onclick="document.getElementById('dayModal').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="day-tasks-list">
                        ${events.length > 0 ? `
                            <h4 style="color: #48bb78; margin: 15px 0 10px 0; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fas fa-calendar-alt"></i> Calendar Events
                            </h4>
                            ${events.map(event => {
                                const eventTime = event.start ? new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
                                return `
                                <div class="day-task-card" style="background: rgba(72, 187, 120, 0.1); border-left: 3px solid #48bb78;">
                                    <div class="day-task-info">
                                        <h4>📅 ${event.title}</h4>
                                        <p>${event.description || 'No description'}</p>
                                        ${eventTime ? `<p class="due-date" style="color: #48bb78;"><i class="fas fa-clock"></i> ${eventTime}</p>` : ''}
                                        ${event.location ? `<p class="due-date"><i class="fas fa-map-marker-alt"></i> ${event.location}</p>` : ''}
                                        ${event.calendarName ? `<span class="task-tag" style="background: rgba(72, 187, 120, 0.3);">${event.calendarName}</span>` : ''}
                                    </div>
                                    <span class="day-task-status" style="background: rgba(72, 187, 120, 0.3);">Event</span>
                                </div>
                            `}).join('')}
                        ` : ''}
                        ${tasks.length > 0 ? `
                            <h4 style="color: #a0aec0; margin: ${events.length > 0 ? '20px' : '15px'} 0 10px 0; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fas fa-tasks"></i> Tasks
                            </h4>
                            ${tasks.map(task => {
                                const isOverdue = task.column !== 'completed' && new Date(task.dueDate || task.created) < new Date().setHours(0,0,0,0);
                                const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                                return `
                                <div class="day-task-card ${isOverdue ? 'overdue-task' : ''}">
                                    <div class="priority-indicator priority-${task.priority}"></div>
                                    <div class="day-task-info">
                                        <h4>${task.title} ${isOverdue ? '<span class="overdue-badge">OVERDUE</span>' : ''}</h4>
                                        <p>${task.description || 'No description'}</p>
                                        ${task.dueDate ? `<p class="due-date"><i class="fas fa-clock"></i> Due: ${dueDateStr}</p>` : ''}
                                        ${task.tags ? `<div class="task-tags">${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}</div>` : ''}
                                    </div>
                                    <span class="day-task-status ${task.column}">${task.column.replace(/([A-Z])/g, ' $1').trim()}</span>
                                </div>
                            `}).join('')}
                        ` : ''}
                        ${tasks.length === 0 && events.length === 0 ? `
                            <div class="no-tasks-message">
                                <i class="fas fa-calendar-check"></i>
                                <p>No tasks or events scheduled for this day</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('dayModal');
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalContent);

        // Close on outside click
        document.getElementById('dayModal').addEventListener('click', (e) => {
            if (e.target.id === 'dayModal') {
                e.target.remove();
            }
        });
    }

    showQuickAddTask(dueDate) {
        // Set the due date in the form
        document.getElementById('taskDueDate').value = dueDate;
        // Set default column to todo
        this.currentColumn = 'todo';
        // Show the modal
        this.showAddTaskModal();
    }
}

// Food Spending Tracker Class
class FoodSpendingTracker {
    constructor() {
        this.foodData = [];
        this.trendsChart = null;
        this.weeklyBudget = 200;
        this.monthlyBudget = 800;
        
        this.init();
    }
    
    init() {
        this.generateMockData();
        this.initializeTrendsChart();
        this.renderFoodSpending();
        this.setupEventListeners();
        this.updateDinnerPlanDate();
    }
    
    updateDinnerPlanDate() {
        // Set default date to next Monday
        const today = new Date();
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7);
        if (nextMonday <= today) {
            nextMonday.setDate(nextMonday.getDate() + 7);
        }
        document.getElementById('dinnerPlanWeek').value = nextMonday.toISOString().split('T')[0];
    }
    
    generateMockData() {
        const categories = ['groceries', 'fruits-snacks', 'other'];
        const stores = ['HEB Buda', 'HEB Plus', 'Costco Kyle'];
        const now = new Date();
        
        // Generate 6 months of data
        for (let i = 0; i < 180; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            // Skip some days to make it realistic (shop 2-3 times per week)
            if (Math.random() > 0.35) continue;
            
            const category = categories[Math.floor(Math.random() * categories.length)];
            const store = stores[Math.floor(Math.random() * stores.length)];
            
            // Amount varies by category
            let baseAmount = 0;
            switch(category) {
                case 'groceries': baseAmount = 45 + Math.random() * 80; break;
                case 'fruits-snacks': baseAmount = 15 + Math.random() * 35; break;
                case 'other': baseAmount = 10 + Math.random() * 40; break;
            }
            
            const items = Math.floor(5 + Math.random() * 20);
            
            this.foodData.push({
                id: `food-${Date.now()}-${i}`,
                date: date.toISOString().split('T')[0],
                store: store,
                category: category,
                items: items,
                amount: parseFloat(baseAmount.toFixed(2)),
                payment: Math.random() > 0.3 ? 'Credit Card' : 'Debit Card'
            });
        }
        
        // Sort by date descending
        this.foodData.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    initializeTrendsChart() {
        const ctx = document.getElementById('foodTrendsChart');
        if (!ctx) return;
        
        const monthlyData = this.calculateMonthlyTotals();
        
        this.trendsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: 'Groceries',
                        data: monthlyData.groceries,
                        backgroundColor: 'rgba(72, 187, 120, 0.8)',
                        borderColor: '#48bb78',
                        borderWidth: 1
                    },
                    {
                        label: 'Fruits/Snacks',
                        data: monthlyData.fruitsSnacks,
                        backgroundColor: 'rgba(237, 137, 54, 0.8)',
                        borderColor: '#ed8936',
                        borderWidth: 1
                    },
                    {
                        label: 'Other',
                        data: monthlyData.other,
                        backgroundColor: 'rgba(160, 174, 192, 0.8)',
                        borderColor: '#a0aec0',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0',
                            font: { family: 'Inter, sans-serif', size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#e0e0e0',
                        bodyColor: '#a0aec0',
                        borderColor: 'rgba(128, 128, 128, 0.25)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#a0aec0',
                            font: { family: 'Inter, sans-serif', size: 11 }
                        }
                    },
                    y: {
                        grid: { color: 'rgba(128, 128, 128, 0.12)' },
                        ticks: {
                            color: '#a0aec0',
                            font: { family: 'Inter, sans-serif', size: 11 },
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Amount ($)',
                            color: '#e0e0e0',
                            font: { family: 'Inter, sans-serif', weight: '600', size: 12 }
                        }
                    }
                }
            }
        });
    }
    
    calculateMonthlyTotals() {
        const totals = {};
        const months = [];
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            months.push(monthKey);
            totals[monthKey] = { groceries: 0, 'fruits-snacks': 0, other: 0 };
        }
        
        // Sum up spending
        this.foodData.forEach(purchase => {
            const date = new Date(purchase.date);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (totals[monthKey]) {
                totals[monthKey][purchase.category] += purchase.amount;
            }
        });
        
        return {
            labels: months,
            groceries: months.map(m => parseFloat(totals[m].groceries.toFixed(2))),
            fruitsSnacks: months.map(m => parseFloat(totals[m]['fruits-snacks'].toFixed(2))),
            other: months.map(m => parseFloat(totals[m].other.toFixed(2)))
        };
    }
    
    renderFoodSpending() {
        this.updateBudgetCards();
        this.renderCategoryBreakdown();
        this.populateMonthFilter();
        this.renderHistoryTable();
    }
    
    updateBudgetCards() {
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);
        
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let weeklySpent = 0;
        let monthlySpent = 0;
        
        this.foodData.forEach(purchase => {
            const purchaseDate = new Date(purchase.date);
            
            // Weekly calculation
            if (purchaseDate >= currentWeekStart) {
                weeklySpent += purchase.amount;
            }
            
            // Monthly calculation
            if (purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear) {
                monthlySpent += purchase.amount;
            }
        });
        
        const remaining = Math.max(0, this.monthlyBudget - monthlySpent);
        const weeklyPercent = (weeklySpent / this.weeklyBudget) * 100;
        
        document.getElementById('foodWeeklySpent').textContent = '$' + weeklySpent.toFixed(2);
        document.getElementById('foodMonthlySpent').textContent = '$' + monthlySpent.toFixed(2);
        document.getElementById('foodRemaining').textContent = '$' + remaining.toFixed(2);
        
        document.getElementById('foodWeeklyPercent').textContent = weeklyPercent.toFixed(1) + '%';
        
        const progressBar = document.getElementById('foodWeeklyProgressBar');
        progressBar.style.width = Math.min(weeklyPercent, 100) + '%';
        
        const statusEl = document.getElementById('foodWeeklyStatus');
        if (weeklyPercent >= 100) {
            progressBar.className = 'progress-bar danger';
            statusEl.className = 'progress-status danger';
            statusEl.textContent = 'Weekly Budget Exceeded!';
        } else if (weeklyPercent >= 80) {
            progressBar.className = 'progress-bar warning';
            statusEl.className = 'progress-status warning';
            statusEl.textContent = 'Warning: Approaching Limit';
        } else {
            progressBar.className = 'progress-bar';
            statusEl.className = 'progress-status ok';
            statusEl.textContent = 'On Track';
        }
    }
    
    renderCategoryBreakdown() {
        const grid = document.getElementById('foodCategoryGrid');
        if (!grid) return;
        
        const categories = {
            'groceries': { name: 'Groceries', icon: 'fa-shopping-cart', color: 'groceries' },
            'fruits-snacks': { name: 'Fruits/Snacks', icon: 'fa-apple-alt', color: 'fruits-snacks' },
            'other': { name: 'Other', icon: 'fa-ellipsis-h', color: 'other' }
        };
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        grid.innerHTML = '';
        
        Object.entries(categories).forEach(([key, cat]) => {
            let monthlySpent = 0;
            let purchaseCount = 0;
            
            this.foodData.forEach(purchase => {
                const purchaseDate = new Date(purchase.date);
                if (purchase.category === key && 
                    purchaseDate.getMonth() === currentMonth && 
                    purchaseDate.getFullYear() === currentYear) {
                    monthlySpent += purchase.amount;
                    purchaseCount++;
                }
            });
            
            const card = document.createElement('div');
            card.className = 'food-category-card';
            card.innerHTML = `
                <div class="food-category-header">
                    <div class="food-category-icon ${cat.color}">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                    <span class="food-category-name">${cat.name}</span>
                </div>
                <div class="food-category-stats">
                    <div class="food-category-stat">
                        <span class="label">This Month</span>
                        <span class="value">$${monthlySpent.toFixed(2)}</span>
                    </div>
                    <div class="food-category-stat">
                        <span class="label">Purchases</span>
                        <span class="value">${purchaseCount}</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }
    
    populateMonthFilter() {
        const select = document.getElementById('foodMonthFilter');
        if (!select) return;
        
        // Keep the "All Months" option
        select.innerHTML = '<option value="">All Months</option>';
        
        const months = new Set();
        this.foodData.forEach(purchase => {
            const date = new Date(purchase.date);
            const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            months.add(monthKey);
        });
        
        Array.from(months).slice(0, 6).forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = month;
            select.appendChild(option);
        });
    }
    
    renderHistoryTable() {
        const tbody = document.getElementById('foodHistoryTableBody');
        const categoryFilter = document.getElementById('foodCategoryFilter')?.value || '';
        const monthFilter = document.getElementById('foodMonthFilter')?.value || '';
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        let filteredData = this.foodData;
        
        if (categoryFilter) {
            filteredData = filteredData.filter(p => p.category === categoryFilter);
        }
        
        if (monthFilter) {
            filteredData = filteredData.filter(p => {
                const date = new Date(p.date);
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) === monthFilter;
            });
        }
        
        // Show last 50 purchases
        filteredData.slice(0, 50).forEach(purchase => {
            const row = document.createElement('tr');
            const date = new Date(purchase.date);
            
            row.innerHTML = `
                <td>${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>${purchase.store}</td>
                <td><span class="food-category-badge ${purchase.category}">${purchase.category.replace('-', '/')}</span></td>
                <td>${purchase.items} items</td>
                <td class="amount">$${purchase.amount.toFixed(2)}</td>
                <td>${purchase.payment}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    setupEventListeners() {
        document.getElementById('foodCategoryFilter')?.addEventListener('change', () => {
            this.renderHistoryTable();
        });
        
        document.getElementById('foodMonthFilter')?.addEventListener('change', () => {
            this.renderHistoryTable();
        });
        
        document.getElementById('refreshFoodData')?.addEventListener('click', () => {
            this.renderFoodSpending();
        });
        
        document.getElementById('generateDinnerPlan')?.addEventListener('click', () => {
            this.generateDinnerPlanPDF();
        });
    }
    
    async generateDinnerPlanPDF() {
        const weekStart = document.getElementById('dinnerPlanWeek').value;
        const email = document.getElementById('dinnerPlanEmail').value;
        const statusEl = document.getElementById('dinnerPlanStatus');
        const btn = document.getElementById('generateDinnerPlan');
        
        if (!weekStart || !email) {
            alert('Please select a week and enter an email address');
            return;
        }
        
        statusEl.classList.remove('hidden', 'error', 'success');
        btn.disabled = true;
        
        try {
            const response = await fetch('/api/dinner-plan/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekStart, email })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                statusEl.classList.add('success');
                statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>PDF generated and emailed successfully!</span>';
            } else {
                throw new Error(result.error || 'Failed to generate PDF');
            }
        } catch (error) {
            statusEl.classList.add('error');
            statusEl.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>Error: ${error.message}</span>`;
        } finally {
            btn.disabled = false;
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 5000);
        }
    }
}

// AI Chat Interface Class
class ChatInterface {
    constructor() {
        this.messages = [];
        this.isExpanded = true;
        this.isProcessing = false;
        this.chatEndpoint = '/api/chat';  // Use local proxy to avoid CORS
        
        // Connection state management
        this.connectionState = 'connecting'; // 'connected', 'disconnected', 'connecting', 'reconnecting'
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000; // Start with 1 second
        this.maxReconnectDelay = 30000; // Max 30 seconds
        this.reconnectTimer = null;
        this.pingInterval = null;
        this.lastPingTime = null;
        this.pingTimeout = 10000; // 10 seconds timeout for ping
        
        // Load saved state
        this.loadWindowState();
        
        this.init();
        this.startConnectionMonitor();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadMessages();
        this.applyWindowState();
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
    }

    cacheElements() {
        this.chatInterface = document.getElementById('chatInterface');
        this.chatHeader = document.getElementById('chatHeader');
        this.chatBody = document.getElementById('chatBody');
        this.chatToggle = document.getElementById('chatToggle');
        this.chatClear = document.getElementById('chatClear');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.chatSend = document.getElementById('chatSend');
        this.connectionStatus = document.getElementById('chatConnectionStatus');
    }

    bindEvents() {
        // Toggle chat
        this.chatHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking on action buttons
            if (e.target.closest('.chat-header-actions')) {
                return;
            }
            this.toggle();
        });
        this.chatToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Clear chat
        this.chatClear.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearChat();
        });

        // Send message
        this.chatSend.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    toggle() {
        this.isExpanded = !this.isExpanded;
        this.chatInterface.classList.toggle('collapsed', !this.isExpanded);
        
        // Save window state
        this.saveWindowState();
        
        if (this.isExpanded) {
            this.chatInput.focus();
            this.scrollToBottom();
        }
    }

    // Save window state to sessionStorage
    saveWindowState() {
        try {
            sessionStorage.setItem('chatWindowState', JSON.stringify({
                isExpanded: this.isExpanded,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            console.warn('Could not save chat window state:', e);
        }
    }

    // Load window state from sessionStorage
    loadWindowState() {
        try {
            const saved = sessionStorage.getItem('chatWindowState');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Restore expanded/collapsed state
                this.isExpanded = parsed.isExpanded !== undefined ? parsed.isExpanded : true;
            }
        } catch (e) {
            console.warn('Could not load chat window state:', e);
        }
    }

    // Apply the saved window state to the UI
    applyWindowState() {
        if (this.chatInterface) {
            this.chatInterface.classList.toggle('collapsed', !this.isExpanded);
            // Update toggle icon
            if (this.chatToggle) {
                const icon = this.chatToggle.querySelector('i');
                if (icon) {
                    icon.className = this.isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
                }
            }
        }
    }

    // Start connection monitoring with keep-alive
    startConnectionMonitor() {
        // Initial connection check
        this.checkConnection();
        
        // Set up periodic keep-alive ping every 30 seconds
        this.pingInterval = setInterval(() => this.pingConnection(), 30000);
        
        // Check connection on window focus
        window.addEventListener('focus', () => {
            if (this.connectionState === 'disconnected') {
                this.attemptReconnect();
            } else {
                this.checkConnection();
            }
        });
        
        // Monitor online/offline events
        window.addEventListener('online', () => {
            console.log('Browser is online');
            this.attemptReconnect();
        });
        
        window.addEventListener('offline', () => {
            console.log('Browser is offline');
            this.updateConnectionState('disconnected');
        });
    }

    // Ping the server to check connection health
    async pingConnection() {
        if (this.connectionState === 'reconnecting') return;
        
        this.lastPingTime = Date.now();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.pingTimeout);
            
            const response = await fetch('/api/health', {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                if (this.connectionState !== 'connected') {
                    this.updateConnectionState('connected');
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                }
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            console.warn('Ping failed:', error);
            if (this.connectionState === 'connected') {
                this.updateConnectionState('disconnected');
                this.attemptReconnect();
            }
        }
    }

    // Check connection state
    async checkConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/api/health', {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.updateConnectionState('connected');
                this.reconnectAttempts = 0;
                return true;
            } else {
                throw new Error('Connection check failed');
            }
        } catch (error) {
            this.updateConnectionState('disconnected');
            return false;
        }
    }

    // Update connection state and UI
    updateConnectionState(state) {
        const previousState = this.connectionState;
        this.connectionState = state;
        
        // Update UI indicator
        if (this.connectionStatus) {
            this.connectionStatus.className = 'connection-status ' + state;
            this.connectionStatus.title = this.getConnectionStatusText(state);
        }
        
        // Update input placeholder based on state
        if (this.chatInput) {
            switch (state) {
                case 'connected':
                    this.chatInput.placeholder = 'Type a message...';
                    this.chatInput.disabled = false;
                    break;
                case 'disconnected':
                    this.chatInput.placeholder = 'Disconnected. Attempting to reconnect...';
                    this.chatInput.disabled = true;
                    break;
                case 'reconnecting':
                    this.chatInput.placeholder = `Reconnecting (attempt ${this.reconnectAttempts})...`;
                    this.chatInput.disabled = true;
                    break;
            }
        }
        
        // Show system message on state change
        if (previousState !== state) {
            if (state === 'connected' && previousState === 'disconnected') {
                this.addSystemMessage('Connection restored. You can send messages now.');
            } else if (state === 'disconnected' && previousState === 'connected') {
                this.addSystemMessage('Connection lost. Attempting to reconnect...', true);
            }
        }
        
        console.log(`Chat connection state: ${state}`);
    }

    // Get human-readable connection status text
    getConnectionStatusText(state) {
        switch (state) {
            case 'connected':
                return 'Connected - Ready to send messages';
            case 'disconnected':
                return 'Disconnected - Click to retry';
            case 'reconnecting':
                return `Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`;
            case 'connecting':
                return 'Connecting...';
            default:
                return 'Unknown status';
        }
    }

    // Attempt to reconnect with exponential backoff
    attemptReconnect() {
        if (this.connectionState === 'reconnecting') return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.addSystemMessage('Unable to reconnect after maximum attempts. Please refresh the page.', true);
            return;
        }
        
        this.updateConnectionState('reconnecting');
        this.reconnectAttempts++;
        
        // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, etc.)
        const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        this.reconnectTimer = setTimeout(async () => {
            const connected = await this.checkConnection();
            if (!connected) {
                this.updateConnectionState('disconnected');
                this.attemptReconnect();
            }
        }, delay);
    }

    // Stop reconnection attempts
    stopReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // Add a system message to the chat
    addSystemMessage(text, isError = false) {
        // Don't add duplicate system messages
        const lastMessage = this.messages[this.messages.length - 1];
        if (lastMessage && lastMessage.type === 'system' && lastMessage.text === text) {
            return;
        }
        
        const message = {
            id: 'sys-' + Date.now(),
            type: 'system',
            text: text,
            timestamp: new Date().toISOString(),
            isError: isError,
            isSystemMessage: true
        };
        
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
        this.saveMessages();
    }

    // Clean up on page unload
    destroy() {
        this.stopReconnect();
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
    }

    sendMessage() {
        const text = this.chatInput.value.trim();
        if (!text || this.isProcessing) return;

        // Add user message
        this.addMessage('user', text);
        this.chatInput.value = '';

        // Send to webhook
        this.sendToWebhook(text);
    }

    addMessage(type, text, isError = false) {
        const message = {
            id: Date.now(),
            type,
            text,
            timestamp: new Date().toISOString(),
            isError
        };
        
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
        this.saveMessages();
    }

    renderMessage(message) {
        const div = document.createElement('div');
        div.className = `chat-message ${message.type}${message.isError ? ' chat-error' : ''}`;
        div.dataset.id = message.id;

        if (message.type === 'loading') {
            div.innerHTML = `
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="message-content">
                    <p>${this.escapeHtml(message.text)}</p>
                </div>
            `;
        }

        this.chatMessages.appendChild(div);
    }

    showLoading() {
        this.isProcessing = true;
        this.chatSend.disabled = true;
        this.chatInput.disabled = true;
        
        const loadingId = 'loading-' + Date.now();
        const message = {
            id: loadingId,
            type: 'loading',
            text: '',
            timestamp: new Date().toISOString()
        };
        
        this.renderMessage(message);
        this.scrollToBottom();
        
        return loadingId;
    }

    hideLoading(loadingId) {
        const loadingEl = this.chatMessages.querySelector(`[data-id="${loadingId}"]`);
        if (loadingEl) {
            loadingEl.remove();
        }
        
        this.isProcessing = false;
        this.chatSend.disabled = false;
        this.chatInput.disabled = false;
        this.chatInput.focus();
    }

    async sendToWebhook(text, retryCount = 0) {
        const maxRetries = 3;
        const loadingId = this.showLoading();

        // Check connection before sending
        if (this.connectionState === 'disconnected') {
            this.hideLoading(loadingId);
            this.addSystemMessage('Cannot send message: Not connected. Please wait for reconnection or refresh the page.', true);
            return;
        }

        try {
            // Use local proxy endpoint to avoid CORS issues
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(this.chatEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    mode: 'now'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            this.hideLoading(loadingId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Chat API error:', response.status, errorData);
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            // Connection successful, update state
            if (this.connectionState !== 'connected') {
                this.updateConnectionState('connected');
                this.reconnectAttempts = 0;
            }

            const data = await response.json();
            
            // Show the response from the AI assistant
            if (data && data.response) {
                this.addMessage('system', data.response);
            } else if (data && data.message) {
                this.addMessage('system', data.message);
            } else if (data && data.text) {
                this.addMessage('system', data.text);
            } else {
                this.addMessage('system', 'Message received. The AI assistant will respond shortly.');
            }
        } catch (error) {
            this.hideLoading(loadingId);
            console.error('Chat error:', error);
            
            // Handle specific error types
            if (error.name === 'AbortError') {
                this.addMessage('system', 'Request timed out. The server is taking too long to respond. Please try again.', true);
                this.updateConnectionState('disconnected');
            } else if (error.message && error.message.includes('Failed to fetch')) {
                this.updateConnectionState('disconnected');
                
                // Retry logic for connection failures
                if (retryCount < maxRetries) {
                    console.log(`Retrying message send (attempt ${retryCount + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                    return this.sendToWebhook(text, retryCount + 1);
                }
                
                this.addSystemMessage('Connection lost. Message not sent. Attempting to reconnect...', true);
                this.attemptReconnect();
            } else {
                this.addMessage('system', 'Error: ' + (error.message || 'Unable to reach the AI assistant.'), true);
            }
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveMessages() {
        try {
            // Keep only last 50 messages
            const messagesToSave = this.messages.slice(-50);
            sessionStorage.setItem('chatMessages', JSON.stringify(messagesToSave));
        } catch (e) {
            console.warn('Could not save chat messages:', e);
        }
    }

    loadMessages() {
        try {
            const saved = sessionStorage.getItem('chatMessages');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Filter out loading messages
                this.messages = parsed.filter(m => m.type !== 'loading');
                
                // Clear default welcome message if we have saved messages
                if (this.messages.length > 0) {
                    this.chatMessages.innerHTML = '';
                    this.messages.forEach(msg => this.renderMessage(msg));
                }
            }
        } catch (e) {
            console.warn('Could not load chat messages:', e);
        }
    }

    clear() {
        this.messages = [];
        this.chatMessages.innerHTML = `
            <div class="chat-message system">
                <div class="message-content">
                    <p>Hello! I'm Marvin, your AI assistant. How can I help you today?</p>
                </div>
            </div>
        `;
        sessionStorage.removeItem('chatMessages');
    }

    clearChat() {
        // Show confirmation dialog
        if (!confirm('Are you sure you want to clear the chat history?')) {
            return;
        }

        // Clear messages array
        this.messages = [];

        // Clear messages from DOM and show empty state
        this.chatMessages.innerHTML = `
            <div class="chat-message system">
                <div class="message-content">
                    <p>Chat history cleared. How can I help you?</p>
                </div>
            </div>
        `;

        // Clear sessionStorage
        sessionStorage.removeItem('chatMessages');

        // Focus the input field
        this.chatInput.focus();
    }

    // ============================================
    // CALENDAR FUNCTIONALITY
    // ============================================
    
    setupCalendar() {
        // View toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.view-btn').dataset.view;
                this.switchCalendarView(view);
            });
        });

        // Navigation buttons
        document.getElementById('prevPeriod').addEventListener('click', () => {
            this.navigateCalendar(-1);
        });

        document.getElementById('nextPeriod').addEventListener('click', () => {
            this.navigateCalendar(1);
        });

        document.getElementById('goToToday').addEventListener('click', () => {
            this.calendarCurrentDate = new Date();
            this.renderCalendar();
        });

        // Initial render
        this.renderCalendar();
    }

    switchCalendarView(view) {
        this.calendarView = view;

        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Toggle view visibility
        document.getElementById('monthView').classList.toggle('hidden', view !== 'month');
        document.getElementById('weekView').classList.toggle('hidden', view !== 'week');

        this.renderCalendar();
    }

    navigateCalendar(direction) {
        if (this.calendarView === 'month') {
            this.calendarCurrentDate.setMonth(this.calendarCurrentDate.getMonth() + direction);
        } else {
            this.calendarCurrentDate.setDate(this.calendarCurrentDate.getDate() + (direction * 7));
        }
        this.renderCalendar();
    }

    renderCalendar() {
        if (this.calendarView === 'month') {
            this.renderMonthView();
        } else {
            this.renderWeekView();
        }
        this.updateCalendarTitle();
    }

    updateCalendarTitle() {
        if (this.calendarView === 'month') {
            const options = { month: 'long', year: 'numeric' };
            const title = this.calendarCurrentDate.toLocaleDateString('en-US', options);
            document.getElementById('currentMonthYear').textContent = title;
        } else {
            // Week view - show the week range (e.g., "Feb 2 - Feb 8, 2026")
            const weekStart = new Date(this.calendarCurrentDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
            const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
            const startDay = weekStart.getDate();
            const endDay = weekEnd.getDate();
            const year = weekEnd.getFullYear();
            
            let title;
            if (startMonth === endMonth) {
                title = `${startMonth} ${startDay} - ${endDay}, ${year}`;
            } else {
                title = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
            }
            document.getElementById('currentMonthYear').textContent = title;
        }
    }

    renderMonthView() {
        const grid = document.getElementById('monthGrid');
        grid.innerHTML = '';

        const year = this.calendarCurrentDate.getFullYear();
        const month = this.calendarCurrentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayDiv = this.createDayElement(prevMonthLastDay - i, true);
            grid.appendChild(dayDiv);
        }

        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dayDiv = this.createDayElement(day, false, isToday, year, month);
            grid.appendChild(dayDiv);
        }

        const remainingCells = 42 - (startingDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            const dayDiv = this.createDayElement(day, true);
            grid.appendChild(dayDiv);
        }
    }

    createDayElement(day, isOtherMonth, isToday = false, year = null, month = null) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        if (isOtherMonth) div.classList.add('other-month');
        if (isToday) div.classList.add('today');

        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        div.appendChild(dayNumber);

        if (!isOtherMonth && year !== null && month !== null) {
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'day-tasks';

            const tasks = this.getTasksForDate(year, month, day);
            const events = this.getEventsForDate(year, month, day);

            const allItems = [].concat(
                tasks.map(t => Object.assign({}, t, { type: 'task' })),
                events.map(e => Object.assign({}, e, { type: 'event' }))
            );

            const maxVisible = 3;
            allItems.slice(0, maxVisible).forEach(item => {
                const indicator = document.createElement('div');
                if (item.type === 'event') {
                    indicator.className = 'day-task-indicator event';
                    indicator.style.background = 'rgba(72, 187, 120, 0.3)';
                    indicator.style.borderLeft = '3px solid #48bb78';
                    indicator.textContent = '📅 ' + item.title;
                } else {
                    const isOverdue = item.column !== 'completed' && new Date(item.dueDate || item.created) < new Date().setHours(0,0,0,0);
                    indicator.className = 'day-task-indicator ' + item.column + (isOverdue ? ' overdue' : '');
                    indicator.textContent = item.title;
                }
                tasksContainer.appendChild(indicator);
            });

            if (allItems.length > maxVisible) {
                const more = document.createElement('div');
                more.className = 'day-task-more';
                more.textContent = '+' + (allItems.length - maxVisible) + ' more';
                tasksContainer.appendChild(more);
            }

            div.appendChild(tasksContainer);
            div.addEventListener('click', () => {
                this.showDayDetails(year, month, day, tasks, events);
            });
        }

        return div;
    }

    getEventsForDate(year, month, day) {
        if (!this.calendarData || !this.calendarData.events) return [];
        const checkDate = new Date(year, month, day);
        // Compare by local date (browser local timezone)
        const checkDateStr = checkDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
        return this.calendarData.events.filter(event => {
            if (!event.start) return false;
            const eventDate = new Date(event.start);
            const eventDateStr = eventDate.toLocaleDateString('en-CA');
            return eventDateStr === checkDateStr;
        });
    }

    renderWeekView() {
        const header = document.getElementById('weekHeader');
        const grid = document.getElementById('weekGrid');
        header.innerHTML = '<div></div>';
        grid.innerHTML = '';

        const weekStart = new Date(this.calendarCurrentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            const isToday = today.toDateString() === dayDate.toDateString();
            const dayHeader = document.createElement('div');
            dayHeader.className = 'week-day-header';
            if (isToday) dayHeader.classList.add('today');
            dayHeader.innerHTML = '<div class="week-day-name">' + dayNames[i] + '</div><div class="week-day-date">' + dayDate.getDate() + '</div>';
            header.appendChild(dayHeader);
        }

        const timeSlots = ['All Day'];
        for (let hour = 6; hour <= 22; hour += 2) timeSlots.push(hour + ':00');

        timeSlots.forEach((time) => {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = time;
            grid.appendChild(timeLabel);

            for (let day = 0; day < 7; day++) {
                const dayDate = new Date(weekStart);
                dayDate.setDate(dayDate.getDate() + day);
                const isToday = today.toDateString() === dayDate.toDateString();

                const dayColumn = document.createElement('div');
                dayColumn.className = 'week-day-column';
                if (isToday) dayColumn.classList.add('today');

                const tasks = this.getTasksForDate(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
                const events = this.getEventsForDate(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());

                tasks.forEach(task => {
                    const taskEl = document.createElement('div');
                    taskEl.className = 'week-task-item ' + task.column;
                    taskEl.innerHTML = '<div class="week-task-title">' + task.title + '</div><div class="week-task-priority">' + task.priority + ' priority</div>';
                    taskEl.addEventListener('click', () => {
                        this.showDayDetails(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), [task], events);
                    });
                    dayColumn.appendChild(taskEl);
                });

                events.forEach(event => {
                    const eventEl = document.createElement('div');
                    eventEl.className = 'week-task-item event';
                    eventEl.style.borderLeft = '3px solid #48bb78';
                    eventEl.style.background = 'rgba(72, 187, 120, 0.15)';
                    eventEl.innerHTML = '<div class="week-task-title">📅 ' + event.title + '</div><div class="week-task-priority">' + (event.calendarName || 'Calendar') + '</div>';
                    eventEl.addEventListener('click', () => {
                        this.showDayDetails(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), tasks, [event]);
                    });
                    dayColumn.appendChild(eventEl);
                });

                if (tasks.length === 0 && events.length === 0) {
                    dayColumn.innerHTML = '<div style="color: #404040; font-size: 0.75em; text-align: center; margin-top: 20px;">-</div>';
                }

                grid.appendChild(dayColumn);
            }
        });
    }

    getTasksForDate(year, month, day) {
        const tasks = [];
        const targetDate = new Date(year, month, day);

        // Check all columns for tasks
        ['todo', 'inprogress', 'review', 'completed'].forEach(column => {
            if (this.tasks[column]) {
                this.tasks[column].forEach(task => {
                    // Use dueDate if available, otherwise fall back to created date
                    const taskDateStr = task.dueDate || task.created;
                    const taskDate = new Date(taskDateStr);
                    if (taskDate.toDateString() === targetDate.toDateString()) {
                        tasks.push({ ...task, column });
                    }
                });
            }
        });

        return tasks;
    }

    showDayDetails(year, month, day, tasks, events = []) {
        const date = new Date(year, month, day);
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Create modal content
        const formattedDateForInput = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const modalContent = `
            <div class="modal show day-modal" id="dayModal">
                <div class="modal-content">
                    <div class="day-modal-header">
                        <h3><i class="fas fa-calendar-day"></i> ${dateStr}</h3>
                        <div class="day-modal-actions">
                            <button class="quick-add-btn" onclick="document.getElementById('dayModal').remove(); dashboard.showQuickAddTask('${formattedDateForInput}')">
                                <i class="fas fa-plus"></i> Add Task
                            </button>
                            <button class="close-btn" onclick="document.getElementById('dayModal').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="day-tasks-list">
                        ${events.length > 0 ? `
                            <h4 style="color: #48bb78; margin: 15px 0 10px 0; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fas fa-calendar-alt"></i> Calendar Events
                            </h4>
                            ${events.map(event => {
                                const eventTime = event.start ? new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
                                return `
                                <div class="day-task-card" style="background: rgba(72, 187, 120, 0.1); border-left: 3px solid #48bb78;">
                                    <div class="day-task-info">
                                        <h4>📅 ${event.title}</h4>
                                        <p>${event.description || 'No description'}</p>
                                        ${eventTime ? `<p class="due-date" style="color: #48bb78;"><i class="fas fa-clock"></i> ${eventTime}</p>` : ''}
                                        ${event.location ? `<p class="due-date"><i class="fas fa-map-marker-alt"></i> ${event.location}</p>` : ''}
                                        ${event.calendarName ? `<span class="task-tag" style="background: rgba(72, 187, 120, 0.3);">${event.calendarName}</span>` : ''}
                                    </div>
                                    <span class="day-task-status" style="background: rgba(72, 187, 120, 0.3);">Event</span>
                                </div>
                            `}).join('')}
                        ` : ''}
                        ${tasks.length > 0 ? `
                            <h4 style="color: #a0aec0; margin: ${events.length > 0 ? '20px' : '15px'} 0 10px 0; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fas fa-tasks"></i> Tasks
                            </h4>
                            ${tasks.map(task => {
                                const isOverdue = task.column !== 'completed' && new Date(task.dueDate || task.created) < new Date().setHours(0,0,0,0);
                                const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                                return `
                                <div class="day-task-card ${isOverdue ? 'overdue-task' : ''}">
                                    <div class="priority-indicator priority-${task.priority}"></div>
                                    <div class="day-task-info">
                                        <h4>${task.title} ${isOverdue ? '<span class="overdue-badge">OVERDUE</span>' : ''}</h4>
                                        <p>${task.description || 'No description'}</p>
                                        ${task.dueDate ? `<p class="due-date"><i class="fas fa-clock"></i> Due: ${dueDateStr}</p>` : ''}
                                        ${task.tags ? `<div class="task-tags">${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}</div>` : ''}
                                    </div>
                                    <span class="day-task-status ${task.column}">${task.column.replace(/([A-Z])/g, ' $1').trim()}</span>
                                </div>
                            `}).join('')}
                        ` : ''}
                        ${tasks.length === 0 && events.length === 0 ? `
                            <div class="no-tasks-message">
                                <i class="fas fa-calendar-check"></i>
                                <p>No tasks or events scheduled for this day</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('dayModal');
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalContent);

        // Close on outside click
        document.getElementById('dayModal').addEventListener('click', (e) => {
            if (e.target.id === 'dayModal') {
                e.target.remove();
            }
        });
    }

    showQuickAddTask(dueDate) {
        // Set the due date in the form
        document.getElementById('taskDueDate').value = dueDate;
        // Set default column to todo
        this.currentColumn = 'todo';
        // Show the modal
        this.showAddTaskModal();
    }
}

// Initialize dashboard when page loads
let dashboard;
let chat;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
    chat = new ChatInterface();
});

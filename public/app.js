class HackerNewsValidator {
    constructor() {
        this.ws = null;
        this.articles = [];
        this.init();
    }

    init() {
        this.connectWebSocket();
        this.setupEventListeners();
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        this.ws = new WebSocket(`${protocol}://${window.location.host}`);

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
    }

    setupEventListeners() {
        const startBtn = document.getElementById('startTest');
        startBtn.addEventListener('click', () => {
            this.startTest()
        });
    }

    async startTest() {
        const startBtn = document.getElementById('startTest');
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Test...';

        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('statsSection').style.display = 'grid';

        this.resetUI();

        try {
            await fetch('/start-test', {method: 'POST'});
        } catch (error) {
            console.error('Error starting test: ', error);
        }
    }

    resetUI() {
        this.articles = [];
        document.getElementById('totalArticles').textContent = '0';
        document.getElementById('sortingErrors').textContent = '-';
        document.getElementById('testStatus').textContent = '-';

    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'status':
                this.updateProgress(data.message, data.progress);
                break;
            case 'progress':
                this.updateArticles(data);
                break;
            case 'results':
                this.showResults(data);
                break;
            case 'error':
                this.showError(data.message);
                break;
        }
    }

    updateProgress(message, progress) {
        document.getElementById('progressText').textContent = message;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }

    updateArticles(data) {
        document.getElementById('totalArticles').textContent = data.collected;

        if (data.articles) {
            this.articles.push(...data.articles);
        }

        this.updateProgress(`Collected ${data.collected}/${data.total} articles`,
            5 + (data.collected / data.total) * 70);
    }

    showResults(data) {
        const startBtn = document.getElementById('startTest');
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start Validation Test';

        // Update stats
        document.getElementById('totalArticles').textContent = data.totalArticles;
        document.getElementById('sortingErrors').textContent = data.sortingErrors;
        document.getElementById('testStatus').textContent = data.success ? 'PASS' : 'FAIL';

        // Update badge
        const badge = document.getElementById('resultsBadge');
        if (data.success) {
            badge.className = 'results-badge success';
            badge.innerHTML = '<i class="fas fa-check-circle"></i> Test Passed';
        } else {
            badge.className = 'results-badge error';
            badge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Test Failed';
        }

        this.renderResults(data);
        this.updateProgress(
            data.success ? ' All articles correctly sorted!' : ' Sorting violations detected!',
            100
        );
    }


    renderResults(data) {
        const container = document.getElementById('resultsContent');
        let html = '';

        // Show the first 10 articles
        html += '<h3 style="margin-bottom: 20px;">Articles Sample (First 10 of 100)</h3>';

        data.articles.forEach((article, index) => {
            const timeAgo = this.getTimeAgo(article.age);
            html += `
                        <div class="article-item">
                            <div class="article-number">#${index + 1}</div>
                            <div class="article-content">
                                <div class="article-title">
                                    <a href="${article.url || '#'}" target="_blank">${article.title}</a>
                                </div>
                                <div class="article-meta">
                                    <span><i class="fas fa-user"></i> ${article.author}</span>
                                    <span><i class="fas fa-arrow-up"></i> ${article.score}</span>
                                    <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                                </div>
                            </div>
                        </div>
                    `;
        });

        // Show errors if any
        if (data.errors.length > 0) {
            html += `
                        <div class="error-section">
                            <div class="error-header">
                                <i class="fas fa-exclamation-triangle"></i>
                                Found ${data.errors.length} Sorting Violation${data.errors.length > 1 ? 's' : ''}
                            </div>
                    `;
            data.errors.forEach((error, index) => {
                html += `
                            <div class="error-item">
                                <strong>Violation #${index + 1} at position ${error.position}:</strong><br>
                                Current: "${error.current.title.substring(0, 60)}..." (${error.current.age})<br>
                                Next: "${error.next.title.substring(0, 60)}..." (${error.next.age})
                            </div>
                        `;
            });
            html += '</div>';
        }

        container.innerHTML = html;
    }


    getTimeAgo(dateString) {
        const cleanDateString = dateString.split(' ')[0];

        // Parse as UTC to avoid timezone issues
        const date = new Date(cleanDateString + 'Z'); // Add 'Z' to force UTC parsing
        const now = new Date();

        if (isNaN(date.getTime())) {
            return dateString;
        }

        const diffMs = now - date;
        const diffMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60)); // Use absolute value
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    showError(message) {
        const startBtn = document.getElementById('startTest');
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start Validation Test';

        this.updateProgress(` ${message}`, 0);
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HackerNewsValidator();
});
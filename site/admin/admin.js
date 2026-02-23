/* ── RE-EVOLVE Admin Panel — JavaScript (API-backed) ── */
(function () {
    'use strict';

    var ADMIN_PASSWORD = 'RAJDEEP07';
    var API_URL = '';
    var AUTH_KEY = 're_evolve_admin_auth';

    // ── DOM Refs ──
    var loginScreen = document.getElementById('loginScreen');
    var dashboard = document.getElementById('dashboard');
    var loginForm = document.getElementById('loginForm');
    var loginPassword = document.getElementById('loginPassword');
    var loginError = document.getElementById('loginError');
    var togglePassword = document.getElementById('togglePassword');
    var logoutBtn = document.getElementById('logoutBtn');
    var menuToggle = document.getElementById('menuToggle');
    var sidebar = document.querySelector('.sidebar');
    var pageTitle = document.getElementById('pageTitle');
    var topbarTime = document.getElementById('topbarTime');

    var totalAppsEl = document.getElementById('totalApps');
    var todayAppsEl = document.getElementById('todayApps');
    var topGoalEl = document.getElementById('topGoal');
    var lastAppTimeEl = document.getElementById('lastAppTime');

    var recentTableBody = document.getElementById('recentTableBody');
    var fullTableBody = document.getElementById('fullTableBody');
    var recentEmpty = document.getElementById('recentEmpty');
    var fullEmpty = document.getElementById('fullEmpty');

    var searchInput = document.getElementById('searchInput');
    var filterGoal = document.getElementById('filterGoal');
    var filterLevel = document.getElementById('filterLevel');
    var exportBtn = document.getElementById('exportBtn');
    var clearAllBtn = document.getElementById('clearAllBtn');

    var detailModal = document.getElementById('detailModal');
    var modalClose = document.getElementById('modalClose');
    var modalName = document.getElementById('modalName');
    var modalBody = document.getElementById('modalBody');

    var navItems = document.querySelectorAll('.nav-item');
    var views = document.querySelectorAll('.view');

    // Cache
    var cachedApps = [];

    // ── Auth ──
    function checkAuth() {
        if (sessionStorage.getItem(AUTH_KEY) === 'true') {
            showDashboard();
        }
    }

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (loginPassword.value === ADMIN_PASSWORD) {
            sessionStorage.setItem(AUTH_KEY, 'true');
            showDashboard();
        } else {
            loginError.style.display = 'block';
            loginPassword.value = '';
            loginPassword.focus();
        }
    });

    togglePassword.addEventListener('click', function () {
        loginPassword.type = loginPassword.type === 'password' ? 'text' : 'password';
    });

    logoutBtn.addEventListener('click', function () {
        sessionStorage.removeItem(AUTH_KEY);
        location.reload();
    });

    function showDashboard() {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'flex';
        loadData();
        startClock();
        // Poll every 3 seconds for real-time updates
        setInterval(loadData, 3000);
    }

    // ── Navigation ──
    navItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            var viewName = item.dataset.view;
            navItems.forEach(function (n) { n.classList.remove('active'); });
            item.classList.add('active');
            views.forEach(function (v) { v.classList.remove('active'); });
            document.getElementById(viewName + 'View').classList.add('active');
            pageTitle.textContent = viewName === 'overview' ? 'Overview' : 'Applications';
            if (window.innerWidth <= 768) sidebar.classList.remove('open');
        });
    });

    menuToggle.addEventListener('click', function () {
        sidebar.classList.toggle('open');
    });

    // ── Clock ──
    function startClock() {
        function update() {
            topbarTime.textContent = new Date().toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true
            });
        }
        update();
        setInterval(update, 1000);
    }

    // ── Data ──
    function loadData() {
        fetch(API_URL + '/api/applications')
            .then(function (res) { return res.json(); })
            .then(function (apps) {
                cachedApps = apps;
                updateStats(apps);
                renderRecentTable(apps);
                renderFullTable(apps);
            })
            .catch(function (err) {
                console.error('Failed to load data:', err);
            });
    }

    function updateStats(apps) {
        totalAppsEl.textContent = apps.length;

        var today = new Date().toISOString().slice(0, 10);
        var todayCount = apps.filter(function (a) { return a.timestamp && a.timestamp.startsWith(today); }).length;
        todayAppsEl.textContent = todayCount;

        if (apps.length > 0) {
            var goalCounts = {};
            apps.forEach(function (a) {
                goalCounts[a.primaryGoal] = (goalCounts[a.primaryGoal] || 0) + 1;
            });
            var topGoal = Object.keys(goalCounts).reduce(function (a, b) { return goalCounts[a] > goalCounts[b] ? a : b; });
            topGoalEl.textContent = formatGoal(topGoal);
        } else {
            topGoalEl.textContent = '—';
        }

        if (apps.length > 0) {
            lastAppTimeEl.textContent = formatTimeAgo(new Date(apps[0].timestamp));
        } else {
            lastAppTimeEl.textContent = '—';
        }
    }

    function renderRecentTable(apps) {
        var recent = apps.slice(0, 5);
        if (recent.length === 0) {
            recentTableBody.innerHTML = '';
            recentEmpty.style.display = 'block';
            return;
        }
        recentEmpty.style.display = 'none';
        recentTableBody.innerHTML = recent.map(function (app) {
            return '<tr>' +
                '<td class="cell-name">' + esc(app.fullName) + '</td>' +
                '<td class="cell-email">' + esc(app.email) + '</td>' +
                '<td>' + esc(app.phone) + '</td>' +
                '<td><span class="badge badge-level">' + esc(app.fitnessLevel) + '</span></td>' +
                '<td><span class="badge badge-goal">' + formatGoal(app.primaryGoal) + '</span></td>' +
                '<td class="cell-date">' + formatDate(app.timestamp) + '</td>' +
                '</tr>';
        }).join('');
    }

    function renderFullTable(apps) {
        var search = (searchInput.value || '').toLowerCase();
        var goalFilter = filterGoal.value;
        var levelFilter = filterLevel.value;

        var filtered = apps.filter(function (app) {
            var matchSearch = !search || app.fullName.toLowerCase().indexOf(search) !== -1 ||
                app.email.toLowerCase().indexOf(search) !== -1 || app.phone.indexOf(search) !== -1;
            var matchGoal = !goalFilter || app.primaryGoal === goalFilter;
            var matchLevel = !levelFilter || app.fitnessLevel === levelFilter;
            return matchSearch && matchGoal && matchLevel;
        });

        if (filtered.length === 0) {
            fullTableBody.innerHTML = '';
            fullEmpty.style.display = 'block';
            return;
        }
        fullEmpty.style.display = 'none';

        fullTableBody.innerHTML = filtered.map(function (app, i) {
            return '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td class="cell-name">' + esc(app.fullName) + '</td>' +
                '<td class="cell-email">' + esc(app.email) + '</td>' +
                '<td>' + esc(app.phone) + '</td>' +
                '<td><span class="badge badge-level">' + esc(app.fitnessLevel) + '</span></td>' +
                '<td><span class="badge badge-goal">' + formatGoal(app.primaryGoal) + '</span></td>' +
                '<td class="cell-reason">' + esc(app.whyCoaching) + '</td>' +
                '<td class="cell-date">' + formatDate(app.timestamp) + '</td>' +
                '<td><div class="row-actions">' +
                '<button class="btn-icon" data-action="view" data-id="' + app.id + '" title="View details">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
                '</button>' +
                '<button class="btn-icon danger" data-action="delete" data-id="' + app.id + '" data-name="' + esc(app.fullName) + '" title="Delete">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                '</button>' +
                '</div></td>' +
                '</tr>';
        }).join('');
    }

    // Table action delegation
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.dataset.action;
        var id = btn.dataset.id;

        if (action === 'view') {
            var app = cachedApps.find(function (a) { return String(a.id) === String(id); });
            if (app) openModal(app);
        } else if (action === 'delete') {
            var name = btn.dataset.name || 'this applicant';
            if (confirm('Delete application from ' + name + '?')) {
                fetch(API_URL + '/api/applications/' + id, { method: 'DELETE' })
                    .then(function () { loadData(); })
                    .catch(function () { alert('Failed to delete.'); });
            }
        }
    });

    // ── Toolbar Events ──
    searchInput.addEventListener('input', function () { renderFullTable(cachedApps); });
    filterGoal.addEventListener('change', function () { renderFullTable(cachedApps); });
    filterLevel.addEventListener('change', function () { renderFullTable(cachedApps); });

    exportBtn.addEventListener('click', function () {
        if (cachedApps.length === 0) { alert('No data to export.'); return; }

        var headers = ['Full Name', 'Email', 'Phone', 'Fitness Level', 'Primary Goal', 'Why Coaching', 'Date & Time'];
        var rows = cachedApps.map(function (a) {
            return [a.fullName, a.email, a.phone, a.fitnessLevel, a.primaryGoal, '"' + (a.whyCoaching || '').replace(/"/g, '""') + '"', formatDate(a.timestamp)];
        });
        var csv = [headers.join(',')].concat(rows.map(function (r) { return r.join(','); })).join('\n');

        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'RE-EVOLVE_Applications_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    clearAllBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to delete ALL applications? This cannot be undone.')) {
            fetch(API_URL + '/api/applications', { method: 'DELETE' })
                .then(function () { loadData(); })
                .catch(function () { alert('Failed to clear data.'); });
        }
    });

    // ── Modal ──
    function openModal(app) {
        modalName.textContent = app.fullName;
        modalBody.innerHTML =
            modalRow('Email', '<a href="mailto:' + esc(app.email) + '" style="color:#667eea;text-decoration:none;">' + esc(app.email) + '</a>') +
            modalRow('Phone', '<a href="tel:' + esc(app.phone) + '" style="color:#667eea;text-decoration:none;">' + esc(app.phone) + '</a>') +
            modalRow('Fitness Level', '<span class="badge badge-level">' + esc(app.fitnessLevel) + '</span>') +
            modalRow('Primary Goal', '<span class="badge badge-goal">' + formatGoal(app.primaryGoal) + '</span>') +
            modalRow('Reason', esc(app.whyCoaching || '—')) +
            modalRow('Applied On', formatDate(app.timestamp));
        detailModal.style.display = 'flex';
    }

    function modalRow(label, value) {
        return '<div class="modal-row"><span class="modal-label">' + label + '</span><span class="modal-value">' + value + '</span></div>';
    }

    modalClose.addEventListener('click', function () { detailModal.style.display = 'none'; });
    detailModal.addEventListener('click', function (e) {
        if (e.target === detailModal) detailModal.style.display = 'none';
    });

    // ── Helpers ──
    function formatGoal(goal) {
        var map = {
            'fat-loss': 'Fat Loss',
            'muscle-gain': 'Muscle Gain',
            'recomposition': 'Recomposition',
            'strength': 'Strength',
            'general': 'General Health'
        };
        return map[goal] || goal || '—';
    }

    function formatDate(ts) {
        if (!ts) return '—';
        return new Date(ts).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    }

    function formatTimeAgo(date) {
        var diff = Math.floor((new Date() - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    }

    function esc(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Init
    checkAuth();
})();

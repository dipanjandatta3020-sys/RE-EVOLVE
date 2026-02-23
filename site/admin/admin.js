/* ── RE-EVOLVE Admin Panel — JavaScript ── */
(function () {
    'use strict';

    const ADMIN_PASSWORD = 'RAJDEEP07';
    const STORAGE_KEY = 're_evolve_applications';
    const AUTH_KEY = 're_evolve_admin_auth';

    // ── DOM Refs ──
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    const togglePassword = document.getElementById('togglePassword');
    const logoutBtn = document.getElementById('logoutBtn');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const pageTitle = document.getElementById('pageTitle');
    const topbarTime = document.getElementById('topbarTime');

    // Stats
    const totalAppsEl = document.getElementById('totalApps');
    const todayAppsEl = document.getElementById('todayApps');
    const topGoalEl = document.getElementById('topGoal');
    const lastAppTimeEl = document.getElementById('lastAppTime');

    // Tables
    const recentTableBody = document.getElementById('recentTableBody');
    const fullTableBody = document.getElementById('fullTableBody');
    const recentEmpty = document.getElementById('recentEmpty');
    const fullEmpty = document.getElementById('fullEmpty');

    // Toolbar
    const searchInput = document.getElementById('searchInput');
    const filterGoal = document.getElementById('filterGoal');
    const filterLevel = document.getElementById('filterLevel');
    const exportBtn = document.getElementById('exportBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // Modal
    const detailModal = document.getElementById('detailModal');
    const modalClose = document.getElementById('modalClose');
    const modalName = document.getElementById('modalName');
    const modalBody = document.getElementById('modalBody');

    // Nav
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

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
        const type = loginPassword.type === 'password' ? 'text' : 'password';
        loginPassword.type = type;
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
        startLivePolling();
    }

    // ── Navigation ──
    navItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const viewName = item.dataset.view;
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
            const now = new Date();
            topbarTime.textContent = now.toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true
            });
        }
        update();
        setInterval(update, 1000);
    }

    // ── Data ──
    function getApplications() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveApplications(apps) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    }

    function deleteApplication(index) {
        const apps = getApplications();
        apps.splice(index, 1);
        saveApplications(apps);
        loadData();
    }

    // ── Live polling for real-time ──
    let lastCount = 0;
    function startLivePolling() {
        lastCount = getApplications().length;
        setInterval(function () {
            const apps = getApplications();
            if (apps.length !== lastCount) {
                lastCount = apps.length;
                loadData();
            }
        }, 1000);
    }

    // ── Load & Render ──
    function loadData() {
        const apps = getApplications();
        updateStats(apps);
        renderRecentTable(apps);
        renderFullTable(apps);
    }

    function updateStats(apps) {
        totalAppsEl.textContent = apps.length;

        // Today's apps
        const today = new Date().toDateString();
        const todayCount = apps.filter(function (a) { return new Date(a.timestamp).toDateString() === today; }).length;
        todayAppsEl.textContent = todayCount;

        // Top goal
        if (apps.length > 0) {
            const goalCounts = {};
            apps.forEach(function (a) {
                goalCounts[a.primaryGoal] = (goalCounts[a.primaryGoal] || 0) + 1;
            });
            const topGoal = Object.keys(goalCounts).reduce(function (a, b) { return goalCounts[a] > goalCounts[b] ? a : b; });
            topGoalEl.textContent = formatGoal(topGoal);
        } else {
            topGoalEl.textContent = '—';
        }

        // Latest app time
        if (apps.length > 0) {
            const latest = new Date(apps[0].timestamp);
            lastAppTimeEl.textContent = formatTimeAgo(latest);
        } else {
            lastAppTimeEl.textContent = '—';
        }
    }

    function renderRecentTable(apps) {
        const recent = apps.slice(0, 5);
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
        const search = (searchInput.value || '').toLowerCase();
        const goalFilter = filterGoal.value;
        const levelFilter = filterLevel.value;

        let filtered = apps.filter(function (app) {
            const matchSearch = !search || app.fullName.toLowerCase().includes(search) ||
                app.email.toLowerCase().includes(search) || app.phone.includes(search);
            const matchGoal = !goalFilter || app.primaryGoal === goalFilter;
            const matchLevel = !levelFilter || app.fitnessLevel === levelFilter;
            return matchSearch && matchGoal && matchLevel;
        });

        if (filtered.length === 0) {
            fullTableBody.innerHTML = '';
            fullEmpty.style.display = 'block';
            return;
        }
        fullEmpty.style.display = 'none';

        fullTableBody.innerHTML = filtered.map(function (app, i) {
            const origIndex = apps.indexOf(app);
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
                '<button class="btn-icon" data-action="view" data-index="' + origIndex + '" title="View details">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
                '</button>' +
                '<button class="btn-icon danger" data-action="delete" data-index="' + origIndex + '" title="Delete">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                '</button>' +
                '</div></td>' +
                '</tr>';
        }).join('');
    }

    // Table action delegation
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index, 10);
        const apps = getApplications();

        if (action === 'view' && apps[index]) {
            openModal(apps[index]);
        } else if (action === 'delete' && apps[index]) {
            if (confirm('Delete application from ' + apps[index].fullName + '?')) {
                deleteApplication(index);
            }
        }
    });

    // ── Toolbar Events ──
    searchInput.addEventListener('input', function () { renderFullTable(getApplications()); });
    filterGoal.addEventListener('change', function () { renderFullTable(getApplications()); });
    filterLevel.addEventListener('change', function () { renderFullTable(getApplications()); });

    exportBtn.addEventListener('click', function () {
        const apps = getApplications();
        if (apps.length === 0) { alert('No data to export.'); return; }

        const headers = ['Full Name', 'Email', 'Phone', 'Fitness Level', 'Primary Goal', 'Why Coaching', 'Date & Time'];
        const rows = apps.map(function (a) {
            return [a.fullName, a.email, a.phone, a.fitnessLevel, a.primaryGoal, '"' + (a.whyCoaching || '').replace(/"/g, '""') + '"', formatDate(a.timestamp)];
        });
        const csv = [headers.join(',')].concat(rows.map(function (r) { return r.join(','); })).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'RE-EVOLVE_Applications_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    clearAllBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to delete ALL applications? This cannot be undone.')) {
            localStorage.removeItem(STORAGE_KEY);
            loadData();
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
        const map = {
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
        const d = new Date(ts);
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            hour12: true
        });
    }

    function formatTimeAgo(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    }

    function esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Init
    checkAuth();
})();

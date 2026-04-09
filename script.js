const DATA_URL = 'data.json?v=' + Date.now();

async function loadData() {
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        const records = await response.json();
        renderCards(records);
        renderTable(records);
    } catch (err) {
        document.getElementById('cards-container').innerHTML = '<div class="error">❌ Ошибка загрузки данных</div>';
        document.getElementById('table-body').innerHTML = '<tr><td colspan="3">Проверьте, что плагин отправил data.json</td></tr>';
        console.error(err);
    }
}

function formatTime(sec) {
    if (!sec || sec <= 0) return '—';
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = Math.floor(sec % 60);
    const ms = Math.floor((sec - Math.floor(sec)) * 1000);
    if (hours > 0) return `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
    if (minutes > 0) return `${minutes}:${String(seconds).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
    return `${seconds}.${String(ms).padStart(3,'0')}`;
}

function renderCards(records) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    records.forEach(r => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${escapeHtml(r.mapName)}</h3>
            <p>🏅 Время: ${formatTime(r.bestTimeSec)}</p>
            <p>🔄 Телепортов: ${r.teleports}</p>
        `;
        container.appendChild(card);
    });
}

function renderTable(records) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    records.forEach(r => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = r.mapName;
        row.insertCell(1).textContent = formatTime(r.bestTimeSec);
        row.insertCell(2).textContent = r.teleports;
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

loadData();

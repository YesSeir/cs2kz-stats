// Конфигурация
const DATA_URL = 'data.json?v=' + Date.now();
const TIERS_URL = 'tiers.json?v=' + Date.now();
const MAPS_FOLDER = 'maps/';

let allMaps = [];
let allRecords = [];

// Загрузка данных
async function loadAllData() {
    try {
        const [tiersResp, dataResp] = await Promise.all([
            fetch(TIERS_URL),
            fetch(DATA_URL)
        ]);
        
        if (!tiersResp.ok) throw new Error('Failed to load tiers.json');
        if (!dataResp.ok) throw new Error('Failed to load data.json');
        
        const tiersList = await tiersResp.json();
        allRecords = await dataResp.json();
        
        // Создаём карту лучших рекордов для карточек (courseid=1, mode=CKZ)
        const bestRecordMap = new Map();
        for (const rec of allRecords) {
            if (rec.courseid === 1 && rec.mode === "CKZ") {
                const existing = bestRecordMap.get(rec.mapname);
                if (!existing || rec.time < existing.time || 
                    (Math.abs(rec.time - existing.time) < 0.0001 && rec.created > existing.created)) {
                    bestRecordMap.set(rec.mapname, rec);
                }
            }
        }
        
        // Создаём карту Tier
        const tierMap = new Map();
        for (const item of tiersList) {
            tierMap.set(item.map, parseInt(item.ckz.nub));
        }
        
        // Все уникальные карты
        const allMapNames = new Set([...tierMap.keys(), ...bestRecordMap.keys()]);
        
        allMaps = Array.from(allMapNames).map(mapName => ({
            name: mapName,
            tier: tierMap.get(mapName) || null,
            record: bestRecordMap.get(mapName) || null
        }));
        
        allMaps.sort((a, b) => a.name.localeCompare(b.name));
        applyFilters();
        
    } catch (err) {
        console.error(err);
        document.getElementById('cards-container').innerHTML = '<div class="error">❌ Error loading data. Check that tiers.json and data.json exist.</div>';
    }
}

// Рендер карточек
function renderCards(maps) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    if (maps.length === 0) {
        container.innerHTML = '<div class="error">😕 No maps match the filter</div>';
        return;
    }
    
    for (const map of maps) {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-mapname', map.name);
        const imgPath = `${MAPS_FOLDER}${map.name}.jpg`;
        
        const bestTime = map.record ? map.record.runtime : '—';
        const playerName = map.record ? map.record.playername : '—';
        const steamId = map.record ? map.record.steamid : null;
        
        const playerHtml = steamId 
            ? `<a href="https://steamcommunity.com/profiles/${steamId}" target="_blank" rel="noopener noreferrer" class="player-link" onclick="event.stopPropagation()">${escapeHtml(playerName)}</a>`
            : `<span class="player-name">${escapeHtml(playerName)}</span>`;
        
        card.innerHTML = `
            <div class="card-img">
                <img src="${imgPath}" alt="${map.name}" onerror="this.src='https://via.placeholder.com/300x170?text=No+Image'">
            </div>
            <h3 title="${map.name}">${escapeHtml(map.name)}</h3>
            <div class="card-info">
                <span class="tier">${map.tier ? `Tier ${map.tier}` : '—'}</span>
                <span class="time">🏅 ${bestTime}</span>
            </div>
            <div class="card-player">
                ${playerHtml}
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            openLeaderboard(map.name);
        });
        
        container.appendChild(card);
    }
}

// Открыть модальное окно с лидербордом для карты (объединяя телепорты)
function openLeaderboard(mapName) {
    const records = allRecords.filter(rec => 
        rec.mapname === mapName && rec.courseid === 1 && rec.mode === "CKZ"
    );
    
    // Группируем по steamid, оставляем лучшую запись (min time, then max created)
    const bestPerPlayer = new Map();
    for (const rec of records) {
        const existing = bestPerPlayer.get(rec.steamid);
        if (!existing || rec.time < existing.time || 
            (Math.abs(rec.time - existing.time) < 0.0001 && rec.created > existing.created)) {
            bestPerPlayer.set(rec.steamid, rec);
        }
    }
    
    const leaderboard = Array.from(bestPerPlayer.values());
    leaderboard.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        return b.created.localeCompare(a.created);
    });
    
    const modal = document.getElementById('leaderboardModal');
    const modalTitle = document.getElementById('modalMapName');
    const tbody = document.getElementById('leaderboardBody');
    
    modalTitle.textContent = mapName;
    
    if (leaderboard.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Нет рекордов для этой карты</td></tr>';
    } else {
        tbody.innerHTML = leaderboard.map(rec => `
            <tr>
                <td><a href="https://steamcommunity.com/profiles/${rec.steamid}" target="_blank" class="player-link">${escapeHtml(rec.playername)}</a></td>
                <td>${rec.runtime}</td>
                <td>${rec.teleports}</td>
                <td>${rec.data}</td>
            </tr>
        `).join('');
    }
    
    modal.style.display = 'block';
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('leaderboardModal');
    modal.style.display = 'none';
}

// Фильтрация и поиск
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const tierFilter = document.getElementById('tierFilter').value;
    
    let filtered = allMaps.filter(map => {
        if (searchTerm && !map.name.toLowerCase().includes(searchTerm)) return false;
        if (tierFilter !== 'all') {
            const tierNum = parseInt(tierFilter);
            if (map.tier !== tierNum) return false;
        }
        return true;
    });
    
    renderCards(filtered);
}

// Экранирование HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Обработчики событий
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('tierFilter').addEventListener('change', applyFilters);
document.querySelector('.close').addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    const modal = document.getElementById('leaderboardModal');
    if (e.target === modal) closeModal();
});

// Запуск
loadAllData();

// Конфигурация
const DATA_URL = 'data.json?v=' + Date.now();
const TIERS_URL = 'tiers.json?v=' + Date.now();
const MAPS_FOLDER = 'maps/';

let allMaps = [];        // массив карт из tiers.json
let recordsByMap = new Map(); // mapname -> { bestTime, bestPlayer, bestRuntime, created }

// Загрузка всех данных
async function loadAllData() {
    try {
        // Загружаем рекорды
        const dataResp = await fetch(DATA_URL);
        if (!dataResp.ok) throw new Error('Failed to load data.json');
        const records = await dataResp.json();
        
        // Фильтруем: courseid = 1, mode = "CKZ"
        const filtered = records.filter(r => r.courseid === 1 && r.mode === "CKZ");
        
        // Для каждой карты находим лучший результат (минимальный time)
        recordsByMap.clear();
        for (const rec of filtered) {
            const mapName = rec.mapname;
            if (!recordsByMap.has(mapName) || rec.time < recordsByMap.get(mapName).bestTime) {
                recordsByMap.set(mapName, {
                    bestTime: rec.time,
                    bestPlayer: rec.playername,
                    bestRuntime: rec.runtime,
                    created: rec.created
                });
            }
        }
        
        // Загружаем tiers.json
        const tiersResp = await fetch(TIERS_URL);
        if (!tiersResp.ok) throw new Error('Failed to load tiers.json');
        const tiersList = await tiersResp.json();
        
        // Формируем массив карт из tiers.json
        allMaps = tiersList.map(item => ({
            name: item.map,
            tier: parseInt(item.ckz.nub) || null
        }));
        
        // Сортируем по имени
        allMaps.sort((a, b) => a.name.localeCompare(b.name));
        
        // Применяем фильтры и поиск
        applyFilters();
        
    } catch (err) {
        console.error(err);
        document.getElementById('cards-container').innerHTML = '<div class="error">❌ Error loading data. Make sure data.json and tiers.json exist.</div>';
        document.getElementById('table-body').innerHTML = '<tr><td colspan="4">Error loading data</td></tr>';
    }
}

// Форматирование времени (если нужно отдельно, но у нас уже есть runtime)
// function formatTime(sec) { ... } // можно не использовать, так как runtime уже готов

// Рендер карточек
function renderCards(maps) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    if (maps.length === 0) {
        container.innerHTML = '<div class="error">😕 No maps match the filter</div>';
        return;
    }
    
    for (const map of maps) {
        const record = recordsByMap.get(map.name);
        const bestRuntime = record ? record.bestRuntime : '—';
        const bestPlayer = record ? record.bestPlayer : '—';
        
        const card = document.createElement('div');
        card.className = 'card';
        
        const imgPath = `${MAPS_FOLDER}${map.name}.jpg`;
        
        card.innerHTML = `
            <div class="card-img">
                <img src="${imgPath}" alt="${map.name}" onerror="this.src='https://via.placeholder.com/300x170?text=No+Image'">
            </div>
            <h3 title="${map.name}">${escapeHtml(map.name)}</h3>
            <div class="card-info">
                <span class="tier">${map.tier ? `Tier ${map.tier}` : '—'}</span>
                <span class="record">
                    <span class="time">🏅 ${bestRuntime}</span>
                    <span class="player">by ${escapeHtml(bestPlayer)}</span>
                </span>
            </div>
        `;
        container.appendChild(card);
    }
}

// Рендер таблицы (опционально, можно показать все рекорды)
function renderTable(maps) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    for (const map of maps) {
        const record = recordsByMap.get(map.name);
        const bestRuntime = record ? record.bestRuntime : '—';
        const bestPlayer = record ? record.bestPlayer : '—';
        const row = tbody.insertRow();
        row.insertCell(0).textContent = map.name;
        row.insertCell(1).textContent = map.tier ? `Tier ${map.tier}` : '—';
        row.insertCell(2).textContent = bestRuntime;
        row.insertCell(3).textContent = bestPlayer;
    }
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
    renderTable(filtered);
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

// Запуск
loadAllData();

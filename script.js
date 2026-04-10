// Конфигурация
const DATA_URL = 'data.json?v=' + Date.now();
const TIERS_URL = 'tiers.json?v=' + Date.now();
const MAPS_FOLDER = 'maps/';

let allMaps = [];        // массив объектов { map, tier, bestTime, teleports }
let recordsMap = new Map();
let tiersMap = new Map();

// Загрузка всех данных
async function loadAllData() {
    try {
        const [recordsResp, tiersResp] = await Promise.all([
            fetch(DATA_URL),
            fetch(TIERS_URL)
        ]);
        
        if (!recordsResp.ok) throw new Error('Ошибка загрузки рекордов');
        if (!tiersResp.ok) throw new Error('Ошибка загрузки tiers');
        
        const records = await recordsResp.json();
        const tiersList = await tiersResp.json();
        
        // Строим map рекордов
        records.forEach(r => {
            recordsMap.set(r.mapName, { time: r.bestTimeSec, teleports: r.teleports });
        });
        
        // Строим map tiers
        tiersList.forEach(item => {
            tiersMap.set(item.map, parseInt(item.ckz.nub));
        });
        
        // Собираем все карты из tiers + возможно из рекордов, которых нет в tiers
        const allMapNames = new Set(tiersMap.keys());
        recordsMap.forEach((_, mapName) => {
            if (!allMapNames.has(mapName)) allMapNames.add(mapName);
        });
        
        // Формируем массив allMaps
        allMaps = Array.from(allMapNames).map(mapName => ({
            name: mapName,
            tier: tiersMap.get(mapName) || null,
            bestTime: recordsMap.get(mapName)?.time || null,
            teleports: recordsMap.get(mapName)?.teleports || 0
        }));
        
        // Сортировка по имени
        allMaps.sort((a, b) => a.name.localeCompare(b.name));
        
        // Применяем фильтры и поиск
        applyFilters();
        
    } catch (err) {
        console.error(err);
        document.getElementById('cards-container').innerHTML = '<div class="error">❌ Ошибка загрузки данных. Проверьте, что файлы data.json и tiers.json существуют.</div>';
        document.getElementById('table-body').innerHTML = '<tr><td colspan="4">Ошибка загрузки</td></tr>';
    }
}

// Форматирование времени
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

// Рендер карточек
function renderCards(maps) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    if (maps.length === 0) {
        container.innerHTML = '<div class="error">😕 Нет карт, соответствующих фильтру</div>';
        return;
    }
    
    for (const map of maps) {
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
                <span class="time">🏅 ${formatTime(map.bestTime)}</span>
                ${map.teleports > 0 ? `<span class="teleports">🔄 ${map.teleports}</span>` : ''}
            </div>
        `;
        container.appendChild(card);
    }
}

// Рендер таблицы
function renderTable(maps) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    for (const map of maps) {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = map.name;
        row.insertCell(1).textContent = map.tier ? `Tier ${map.tier}` : '—';
        row.insertCell(2).textContent = formatTime(map.bestTime);
        row.insertCell(3).textContent = map.teleports > 0 ? map.teleports : '—';
    }
}

// Фильтрация и поиск
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const tierFilter = document.getElementById('tierFilter').value;
    
    let filtered = allMaps.filter(map => {
        // Поиск по названию
        if (searchTerm && !map.name.toLowerCase().includes(searchTerm)) return false;
        // Фильтр по тиру
        if (tierFilter !== 'all') {
            const tierNum = parseInt(tierFilter);
            if (map.tier !== tierNum) return false;
        }
        return true;
    });
    
    renderCards(filtered);
    renderTable(filtered);
}

// Функция для экранирования HTML
function escapeHtml(str) {
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

// Конфигурация
const DATA_URL = 'data.json?v=' + Date.now();
const TIERS_URL = 'tiers.json?v=' + Date.now();
const MAPS_FOLDER = 'maps/';

let allCards = [];      // массив объектов { name, tier, bestRecord }
let allRecords = [];    // все записи из data.json
let recordsByMap = new Map(); // mapname -> массив записей (courseid=1, mode=CKZ)

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
        
        // Строим recordsByMap для быстрого доступа к рекордам карты (courseid=1, mode=CKZ)
        recordsByMap.clear();
        for (const rec of allRecords) {
            if (rec.courseid === 1 && rec.mode === "CKZ") {
                if (!recordsByMap.has(rec.mapname)) recordsByMap.set(rec.mapname, []);
                recordsByMap.get(rec.mapname).push(rec);
            }
        }
        
        // Для каждой карты из tiersList вычисляем лучший рекорд (минимальное время)
        // Если рекорда нет, bestRecord = null
        allCards = tiersList.map(item => {
            const mapName = item.map;
            const tier = parseInt(item.ckz.nub);
            const mapRecords = recordsByMap.get(mapName) || [];
            
            // Находим лучший рекорд (минимальное время, при равных - максимальный created)
            let bestRecord = null;
            for (const rec of mapRecords) {
                if (!bestRecord || rec.time < bestRecord.time || 
                    (Math.abs(rec.time - bestRecord.time) < 0.0001 && rec.created > bestRecord.created)) {
                    bestRecord = rec;
                }
            }
            
            return {
                name: mapName,
                tier: tier,
                bestRecord: bestRecord
            };
        });
        
        // Сортируем по названию
        allCards.sort((a, b) => a.name.localeCompare(b.name));
        
        applyFilters();
        
    } catch (err) {
        console.error(err);
        document.getElementById('cards-container').innerHTML = '<div class="error">❌ Error loading data. Check that tiers.json and data.json exist.</div>';
    }
}

// Рендер карточек
function renderCards(cards) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    if (cards.length === 0) {
        container.innerHTML = '<div class="error">😕 No maps match the filter</div>';
        return;
    }
    
    for (const cardData of cards) {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-mapname', cardData.name);
        const imgPath = `${MAPS_FOLDER}${cardData.name}.jpg`;
        
        const bestTime = cardData.bestRecord ? cardData.bestRecord.runtime : '—';
        const playerName = cardData.bestRecord ? cardData.bestRecord.playername : '—';
        const steamId = cardData.bestRecord ? cardData.bestRecord.steamid : null;
        
        const playerHtml = steamId 
            ? `<a href="https://steamcommunity.com/profiles/${steamId}" target="_blank" rel="noopener noreferrer" class="player-link" onclick="event.stopPropagation()">${escapeHtml(playerName)}</a>`
            : `<span class="player-name">${escapeHtml(playerName)}</span>`;
        
        card.innerHTML = `
            <div class="card-img">
                <img src="${imgPath}" alt="${cardData.name}" onerror="this.src='https://via.placeholder.com/300x170?text=No+Image'">
            </div>
            <h3 title="${cardData.name}">${escapeHtml(cardData.name)}</h3>
            <div class="card-info">
                <span class="tier">Tier ${cardData.tier}</span>
                <span class="time">🏅 ${bestTime}</span>
            </div>
            <div class="card-player">
                ${playerHtml}
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            openLeaderboard(cardData.name);
        });
        
        container.appendChild(card);
    }
}

// Открыть модальное окно с лидербордом для карты
function openLeaderboard(mapName) {
    const records = recordsByMap.get(mapName) || [];
    
    // Группировка по steamid: оставляем лучший результат каждого игрока (минимальное время)
    const bestPerPlayer = new Map();
    for (const rec of records) {
        const existing = bestPerPlayer.get(rec.steamid);
        if (!existing || rec.time < existing.time || 
            (Math.abs(rec.time - existing.time) < 0.0001 && rec.created > existing.created)) {
            bestPerPlayer.set(rec.steamid, rec);
        }
    }
    
    // Преобразуем в массив и сортируем по времени (лучшие сверху)
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
    
    let filtered = allCards.filter(card => {
        if (searchTerm && !card.name.toLowerCase().includes(searchTerm)) return false;
        if (tierFilter !== 'all') {
            const tierNum = parseInt(tierFilter);
            if (card.tier !== tierNum) return false;
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

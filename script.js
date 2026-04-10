// Конфигурация
const TIERS_URL = 'tiers.json?v=' + Date.now();
const MAPS_FOLDER = 'maps/';

let allMaps = [];        // массив объектов { name, tier }

// Загрузка данных
async function loadAllData() {
    try {
        const tiersResp = await fetch(TIERS_URL);
        if (!tiersResp.ok) throw new Error('Ошибка загрузки tiers.json');
        
        const tiersList = await tiersResp.json();
        
        // Извлекаем map и tier из ckz.nub
        allMaps = tiersList.map(item => ({
            name: item.map,
            tier: parseInt(item.ckz.nub) || null
        }));
        
        // Сортировка по имени
        allMaps.sort((a, b) => a.name.localeCompare(b.name));
        
        // Применяем фильтры
        applyFilters();
        
    } catch (err) {
        console.error(err);
        document.getElementById('cards-container').innerHTML = '<div class="error">❌ Ошибка загрузки карт. Убедитесь, что файл tiers.json существует.</div>';
    }
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
            </div>
        `;
        container.appendChild(card);
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
}

// Экранирование HTML
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

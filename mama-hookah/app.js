// 0. Supabase Initialization
const SUPABASE_URL = "https://piukdhvjshkrikapvnbn.supabase.co";
// Paste your JWT anon key (starts with eyJ...) here:
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdWtkaHZqc2hrcmlrYXB2bmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODk4NDksImV4cCI6MjEwNTA2NTg0OX0.1xrBJ8ni3U6qGp3_Q245qT9ddRL9dcG-2L_OYRvQWAs"; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Telegram SDK Initialization
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const user = tg.initDataUnsafe?.user || { first_name: "Гость", id: null };
document.getElementById('userName').innerText = user.first_name;

// 2. Silent Admin Tracker (Direct to Telegram)
function trackGuestAction(actionDescription) {
    const guestName = user.first_name || "Гость";
    const guestHandle = user.username ? `(@${user.username})` : "";
    const tableNum = document.getElementById('mixTableNum')?.value || "Неизвестно";
    
    const message = `👀 Активность: ${guestName} ${guestHandle} (Стол: ${tableNum})\nДействие: ${actionDescription}`;
    const botToken = "8275821967:AAGpG0A79SsYU5bGT3itRmo0iUGMaYhSd9o"; 
    const myChatId = "8062455176"; 
    
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: myChatId, text: message })
    }).catch(err => console.log("Tracker ping failed silently"));
}

// 3. Tab Navigation Logic
const tabs = ['shelf', 'mixlab', 'passport', 'history'];
function switchTab(activeTab) {
    tabs.forEach(tab => {
        document.getElementById(`view-${tab}`)?.classList.add('hidden');
        const tabBtn = document.getElementById(`tab-${tab}`);
        if (tabBtn) {
            tabBtn.classList.remove('text-mama');
            tabBtn.classList.add('text-gray-300');
        }
    });

    document.getElementById(`view-${activeTab}`)?.classList.remove('hidden');
    const activeBtn = document.getElementById(`tab-${activeTab}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-300');
        activeBtn.classList.add('text-mama');
    }
}

// 4. Table Detection & Deep Linking
function initTableNumber() {
    const urlParams = new URLSearchParams(window.location.search);
    let tableNum = urlParams.get('table');

    if (!tableNum && tg.initDataUnsafe?.start_param) {
        tableNum = tg.initDataUnsafe.start_param.replace('table_', '');
    }

    if (tableNum) {
        document.getElementById('tableDisplay').innerText = tableNum;
        const tableInput = document.getElementById('mixTableNum');
        if (tableInput) {
            tableInput.value = tableNum;
            tableInput.readOnly = true;
            tableInput.classList.add('bg-gray-100', 'text-gray-500');
        }
    }
}

// 5. Tobacco Catalog & Live Database Loading
let liveCatalog = [];

function renderCatalog(items) {
    const container = document.getElementById('catalogContainer');
    if (!container) return;
    container.innerHTML = items.map(item => `
        <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <div class="flex justify-between items-start mb-1">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${item.brand}</span>
                <span class="bg-gray-50 border border-gray-100 text-gray-500 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    Крепость: ${item.strength}/10
                </span>
            </div>
            <h3 class="text-base font-extrabold text-gray-900 leading-tight mb-1">${item.name}</h3>
            <p class="text-xs text-gray-500 mb-3">${item.flavor_notes || item.profile || ''}</p>
            <div class="inline-block bg-mama/10 text-mama text-[10px] font-bold px-2 py-1 rounded w-max mt-auto">
                ${item.tag || item.type || 'Микс'}
            </div>
        </div>
    `).join('');
}

function filterMenu(brandName, buttonElement) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('bg-mama', 'text-white', 'shadow-md', 'shadow-mama/20', 'border-transparent');
        btn.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
    });
    
    buttonElement.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
    buttonElement.classList.add('bg-mama', 'text-white', 'shadow-md', 'shadow-mama/20', 'border-transparent');

    if (brandName === 'All') {
        renderCatalog(liveCatalog);
    } else {
        renderCatalog(liveCatalog.filter(item => item.brand.toLowerCase() === brandName.toLowerCase()));
    }
}

// Default offline catalog if database connection fails
const defaultCatalog = [
    { brand: "Must Have", name: "Pinkman", strength: 5, flavor_notes: "Малина, грейпфрут, клубника. Кисло-сладкий.", tag: "Ягодный" },
    { brand: "Must Have", name: "Mango Sling", strength: 5, flavor_notes: "Пряный сочный манго с холодком.", tag: "Тропический" },
    { brand: "Black Burn", name: "Apple Shock", strength: 7, flavor_notes: "Экстремально кислое зеленое яблоко.", tag: "Кислый" },
    { brand: "Black Burn", name: "Ananas Shock", strength: 7, flavor_notes: "Кислый ананасовый леденец.", tag: "Кислый" },
    { brand: "Deus", name: "Pomegranate Morse", strength: 7, flavor_notes: "Натуральный терпкий гранатовый морс.", tag: "Ягодный" }
];

async function loadFlavorsFromDB() {
    let flavors = [];

    try {
        const { data, error } = await supabaseClient
            .from('flavors')
            .select('*')
            .eq('in_stock', true);

        if (error || !data || data.length === 0) {
            console.warn('Database offline or empty. Falling back to local catalog.');
            flavors = defaultCatalog;
        } else {
            flavors = data;
        }
    } catch (err) {
        console.warn('Network failure. Using local catalog.');
        flavors = defaultCatalog;
    }

    liveCatalog = flavors;
    renderCatalog(liveCatalog);

    // Populate dropdowns in Mix tab
    const baseSelect = document.getElementById('baseSelect');
    const accentSelect = document.getElementById('accentSelect');
    const adjSelect = document.getElementById('adjSelect');

    const optionsHtml = flavors.map(f => 
        `<option value="${f.brand} - ${f.name}">${f.brand} — ${f.name} (${f.strength}/10)</option>`
    ).join('');

    if (baseSelect) baseSelect.innerHTML = `<option value="" disabled selected>Выберите вкус...</option>` + optionsHtml;
    if (accentSelect) accentSelect.innerHTML = `<option value="" disabled selected>Выберите вкус...</option>` + optionsHtml;
    if (adjSelect) adjSelect.innerHTML = `<option value="Без оттенка" selected>Без оттенка (0%)</option>` + optionsHtml;
}

// 6. Order Submission to Supabase & Telegram
window.sendMixOrder = async function() {
    const base = document.getElementById('baseSelect').value;
    const accent = document.getElementById('accentSelect').value;
    const adj = document.getElementById('adjSelect').value;
    const bowl = document.getElementById('bowlSelect').value;
    const tableNum = document.getElementById('mixTableNum').value;

    if (!tableNum) {
        alert("Пожалуйста, укажите номер стола!");
        return;
    }
    if (!base || base.includes("Выберите")) {
        alert("Пожалуйста, выберите базу (60%)!");
        return;
    }
    if (!accent || accent.includes("Выберите")) {
        alert("Пожалуйста, выберите акцент (30%)!");
        return;
    }

    // Insert order into Supabase
    const { error } = await supabaseClient.from('orders').insert([{
        table_number: parseInt(tableNum),
        guest_telegram_id: user.id || null,
        bowl_type: bowl,
        base_flavor: base,
        accent_flavor: accent,
        shade_flavor: adj,
        status: 'pending'
    }]);

    if (error) {
        console.error("Order save failed:", error);
        alert("Не удалось отправить заказ. Попробуйте снова.");
        return;
    }

    trackGuestAction(`Заказал микс:\nЧаша: ${bowl}\n60%: ${base}\n30%: ${accent}\n10%: ${adj}`);
    
    if (tg.showAlert) {
        tg.showAlert(`✅ Заказ принят для стола #${tableNum}! Мастер уже готовит.`);
    } else {
        alert(`✅ Заказ принят для стола #${tableNum}! Мастер уже готовит.`);
    }
};

// 7. Loyalty Program Logic
const userLoyalty = { points: 45, nextTierTarget: 100, tierName: "Silver" };

function initPassport() {
    document.getElementById('passportName').innerText = user.first_name;
    document.getElementById('passportPoints').innerText = userLoyalty.points;
    document.getElementById('passportBadge').innerText = userLoyalty.tierName;
    
    const progressPercent = Math.min(100, Math.round((userLoyalty.points / userLoyalty.nextTierTarget) * 100));
    document.getElementById('passportProgressText').innerText = `${userLoyalty.points} / ${userLoyalty.nextTierTarget}`;
    document.getElementById('passportProgressBar').style.width = `${progressPercent}%`;
}

window.redeemReward = function(rewardTitle, cost) {
    if (userLoyalty.points < cost) {
        const msg = `Недостаточно баллов. Нужно еще ${cost - userLoyalty.points} баллов.`;
        if (tg.showAlert) tg.showAlert(msg); else alert(msg);
        return;
    }
    userLoyalty.points -= cost;
    initPassport();
    const successMsg = `🎁 Купон активирован: "${rewardTitle}"!\nПокажите этот экран кальянному мастеру.`;
    if (tg.showAlert) tg.showAlert(successMsg); else alert(successMsg);
};

// 8. Gatekeeper Authentication Flow
window.forcePhoneLogin = function() {
    const isTelegram = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
    
    if (isTelegram) {
        tg.requestContact(async (shared) => {
            if (shared) {
                const contactData = tg.initDataUnsafe?.user?.phone_number || "Shared via Bot";
                
                await supabaseClient.from('guests').upsert({
                    telegram_id: user.id,
                    first_name: user.first_name || 'Гость',
                    username: user.username || null,
                    phone_number: contactData,
                    points: 50,
                    tier: 'SILVER'
                });

                localStorage.setItem("mama_auth_phone", "true");
                document.getElementById("gatekeeperScreen").classList.add("hidden");
                userLoyalty.points += 50;
                initPassport();
                trackGuestAction("Авторизовался и привязал номер телефона.");
            }
        });
    } else {
        localStorage.setItem("mama_auth_phone", "true");
        document.getElementById("gatekeeperScreen").classList.add("hidden");
        initPassport();
    }
};

// 9. Admin Table Override (5-Tap Logo Trigger)
let clickCount = 0;
const logoImage = document.querySelector('header img'); 
if (logoImage) {
    logoImage.addEventListener('click', () => {
        clickCount++;
        if (clickCount === 5) {
            const newTable = prompt("Admin Override: Введите номер стола:");
            if (newTable) {
                document.getElementById('tableDisplay').innerText = newTable;
                const tableInput = document.getElementById('mixTableNum');
                if (tableInput) {
                    tableInput.value = newTable;
                    tableInput.readOnly = true;
                }
            }
            clickCount = 0;
        }
    });
}

// 10. Bootstrap Application
document.addEventListener("DOMContentLoaded", () => {
    initTableNumber();
    loadFlavorsFromDB();
    initPassport();

    if (localStorage.getItem("mama_auth_phone") === "true") {
        document.getElementById("gatekeeperScreen")?.classList.add("hidden");
    }
});
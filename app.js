// 0. Supabase Initialization
const SUPABASE_URL = "https://piukdhvjshkrikapvnbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdWtkaHZqc2hrcmlrYXB2bmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODk4NDksImV4cCI6MjEwNTA2NTg0OX0.1xrBJ8ni3U6qGp3_Q245qT9ddRL9dcG-2L_OYRvQWAs"; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Telegram SDK Initialization
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const user = tg.initDataUnsafe?.user || { first_name: "Гость", id: null };
const userNameEl = document.getElementById('userName');
if (userNameEl) userNameEl.innerText = user.first_name || "Гость";

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
const tabs = ['shelf', 'mixlab', 'passport', 'history', 'review'];
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

    if (activeTab === 'history') {
        loadOrderHistoryFromDB();
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
        const tableDisplay = document.getElementById('tableDisplay');
        if (tableDisplay) tableDisplay.innerText = tableNum;
        
        const tableInput = document.getElementById('mixTableNum');
        if (tableInput) {
            tableInput.value = tableNum;
            tableInput.readOnly = true;
            tableInput.classList.add('bg-gray-100', 'text-gray-500');
        }
    }
}

// 5. Catalog Engine & Live Database Loading
let liveCatalog = [];

const defaultCatalog = [
    { brand: "Must Have", name: "Pinkman", strength: 5, flavor_notes: "Малина, грейпфрут, клубника. Кисло-сладкий.", tag: "Ягодный" },
    { brand: "Must Have", name: "Mango Sling", strength: 5, flavor_notes: "Пряный сочный манго с холодком.", tag: "Тропический" },
    { brand: "Black Burn", name: "Apple Shock", strength: 7, flavor_notes: "Экстремально кислое зеленое яблоко.", tag: "Кислый" },
    { brand: "Black Burn", name: "Ananas Shock", strength: 7, flavor_notes: "Кислый ананасовый леденец.", tag: "Кислый" },
    { brand: "Deus", name: "Pomegranate Morse", strength: 7, flavor_notes: "Натуральный терпкий гранатовый морс.", tag: "Ягодный" }
];

function renderCatalog(items = allFlavors) {
    const container = document.getElementById('catalogContainer');
    if (!container || !items || !Array.isArray(items)) return;
    
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

// Instant catalog loading via local cache + background sync
async function fetchFlavors() {
    // 1. Instant Render from Cache (0 ms delay)
    const cachedFlavors = localStorage.getItem("mama_cached_flavors");
    if (cachedFlavors) {
        try {
            allFlavors = JSON.parse(cachedFlavors);
            renderCatalog(allFlavors);
            if (typeof populateMixSelects === "function") {
                populateMixSelects();
            }
        } catch (e) {
            console.error("Cache read error:", e);
        }
    }

    // 2. Background fetch for live stock updates
    try {
        const { data, error } = await supabaseClient
            .from('flavors')
            .select('*')
            .order('brand', { ascending: true });

        if (error) {
            console.error("Supabase fetch failed:", error);
            return;
        }

        if (data && data.length > 0) {
            allFlavors = data;
            // Update cache with latest data
            localStorage.setItem("mama_cached_flavors", JSON.stringify(data));
            // Re-render UI with fresh availability
            renderCatalog(allFlavors);
            if (typeof populateMixSelects === "function") {
                populateMixSelects();
            }
        }
    } catch (err) {
        console.error("Network error during flavor sync:", err);
    }
}

// Instant catalog loading via local cache + background sync
async function fetchFlavors() {
    // 1. Instant Render from Cache (0 ms delay)
    const cachedFlavors = localStorage.getItem("mama_cached_flavors");
    if (cachedFlavors) {
        try {
            allFlavors = JSON.parse(cachedFlavors);
            renderCatalog(allFlavors);
              if (typeof populateMixSelects === "function") {
                populateMixSelects();
            }
        } catch (e) {
            console.error("Cache read error:", e);
        }
    }

    // 2. Background fetch for live stock updates
    try {
        const { data, error } = await supabaseClient
            .from('flavors')
            .select('*')
            .order('brand', { ascending: true });

        if (error) {
            console.error("Supabase fetch failed:", error);
            return;
        }

        if (data && data.length > 0) {
            allFlavors = data;
            // Update cache with latest data
            localStorage.setItem("mama_cached_flavors", JSON.stringify(data));
            // Re-render UI with fresh availability
            renderCatalog(allFlavors);
            if (typeof populateMixSelects === "function") {
                populateMixSelects();
            }
        }
    } catch (err) {
        console.error("Network error during flavor sync:", err);
    }
}

// Populate the Mix Lab select dropdowns
function populateMixSelects() {
    if (!allFlavors || allFlavors.length === 0) return;

    const baseSelect = document.getElementById('baseSelect');
    const accentSelect = document.getElementById('accentSelect');
    const adjSelect = document.getElementById('adjSelect');

    if (!baseSelect || !accentSelect || !adjSelect) return;

    // Group flavors alphabetically by brand
    const brandMap = {};
    allFlavors.forEach(f => {
        const brand = f.brand || 'Разное';
        if (!brandMap[brand]) brandMap[brand] = [];
        brandMap[brand].push(f);
    });

    let optionsMarkup = '<option value="" disabled selected>Выберите вкус...</option>';
    
    Object.keys(brandMap).sort().forEach(brand => {
        optionsMarkup += `<optgroup label="${brand}">`;
        brandMap[brand]
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .forEach(f => {
                optionsMarkup += `<option value="${f.name} (${brand})">${f.name}</option>`;
            });
        optionsMarkup += `</optgroup>`;
    });

    // Populate Base (60%) and Accent (30%)
    baseSelect.innerHTML = optionsMarkup;
    accentSelect.innerHTML = optionsMarkup;

    // Populate Shade (10%) with default "Без оттенка" option
    adjSelect.innerHTML = `
        <option value="Без оттенка" selected>Без оттенка (0%)</option>
        ${optionsMarkup.replace('<option value="" disabled selected>Выберите вкус...</option>', '')}
    `;
}

// 6. Order Submission with +15 Cashback Points
window.sendMixOrder = async function() {
    const base = document.getElementById('baseSelect').value;
    const accent = document.getElementById('accentSelect').value;
    const adj = document.getElementById('adjSelect').value;
    const bowl = document.getElementById('bowlSelect').value;
    const tableNum = document.getElementById('mixTableNum').value;
    const notes = document.getElementById('mixNotes')?.value || ""; // <-- 1. ADD THIS LINE

    if (!tableNum || isNaN(parseInt(tableNum, 10))) {
        alert("Пожалуйста, укажите корректный номер стола!");
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

    const { error } = await supabaseClient.from('orders').insert([{
        table_number: parseInt(tableNum, 10),
        guest_telegram_id: user.id || null,
        bowl_type: bowl,
        base_flavor: base,
        accent_flavor: accent,
        shade_flavor: adj,
        notes: notes, // <-- 2. ADD THIS LINE
        status: 'pending'
    }]);

    if (error) {
        console.error("Order save failed:", error);
        alert("Не удалось отправить заказ. Попробуйте снова.");
        return;
    }

    // Award +15 Points Cashback
    const updatedBalance = userLoyalty.points + 15;
    if (user.id) {
        await supabaseClient
            .from('guests')
            .update({ points: updatedBalance })
            .eq('telegram_id', user.id);
    } else {
        localStorage.setItem("mama_guest_points", updatedBalance.toString());
    }
    userLoyalty.points = updatedBalance;
    initPassport();

    const orderDesc = `Заказал микс (+15 Б):\nЧаша: ${bowl}\n60%: ${base}\n30%: ${accent}\n10%: ${adj}${notes ? `\nПожелание: "${notes}"` : ""}`;
    trackGuestAction(orderDesc);
    
    if (tg.showAlert) {
        tg.showAlert(`✅ Заказ принят для стола #${tableNum}! Начислено +15 баллов.`);
    } else {
        alert(`✅ Заказ принят для стола #${tableNum}! Начислено +15 баллов.`);
    }
};

// 7. Loyalty Program Logic & Database Sync
let userLoyalty = { points: 0, nextTierTarget: 100, tierName: "Silver" };

async function syncGuestLoyalty() {
    if (!user.id) {
        userLoyalty.points = parseInt(localStorage.getItem("mama_guest_points") || "0", 10);
        initPassport();
        return;
    }

    const { data, error } = await supabaseClient
        .from('guests')
        .select('points, tier')
        .eq('telegram_id', user.id)
        .maybeSingle();

    if (error) {
        console.error("Error loading guest points:", error);
        return;
    }

    if (data) {
        userLoyalty.points = data.points ?? 0;
        userLoyalty.tierName = data.tier ?? "Silver";
    }
    initPassport();
}

function initPassport() {
    const passportName = document.getElementById('passportName');
    const passportPoints = document.getElementById('passportPoints');
    const passportBadge = document.getElementById('passportBadge');
    const progressText = document.getElementById('passportProgressText');
    const progressBar = document.getElementById('passportProgressBar');

    if (passportName) passportName.innerText = user.first_name || "Гость";
    if (passportPoints) passportPoints.innerText = userLoyalty.points;

    if (userLoyalty.points >= 250) {
        userLoyalty.tierName = "Platinum";
        userLoyalty.nextTierTarget = 500;
    } else if (userLoyalty.points >= 100) {
        userLoyalty.tierName = "Gold";
        userLoyalty.nextTierTarget = 250;
    } else {
        userLoyalty.tierName = "Silver";
        userLoyalty.nextTierTarget = 100;
    }

    if (passportBadge) passportBadge.innerText = userLoyalty.tierName;

    const progressPercent = Math.min(100, Math.round((userLoyalty.points / userLoyalty.nextTierTarget) * 100));
    if (progressText) progressText.innerText = `${userLoyalty.points} / ${userLoyalty.nextTierTarget}`;
    if (progressBar) progressBar.style.width = `${progressPercent}%`;
}

window.redeemReward = async function(rewardTitle, cost) {
    if (userLoyalty.points < cost) {
        const msg = `Недостаточно баллов. Нужно еще ${cost - userLoyalty.points} баллов.`;
        if (tg.showAlert) tg.showAlert(msg); else alert(msg);
        return;
    }

    const newBalance = userLoyalty.points - cost;

    if (user.id) {
        const { error } = await supabaseClient
            .from('guests')
            .update({ points: newBalance })
            .eq('telegram_id', user.id);

        if (error) {
            console.error("Failed to deduct points:", error);
            alert("Не удалось активировать купон. Попробуйте снова.");
            return;
        }
    } else {
        localStorage.setItem("mama_guest_points", newBalance.toString());
    }

    userLoyalty.points = newBalance;
    initPassport();
    trackGuestAction(`Активировал купон: "${rewardTitle}" (-${cost} Б)`);

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
                document.getElementById("gatekeeperScreen")?.classList.add("hidden");
                userLoyalty.points = 50;
                initPassport();
                trackGuestAction("Авторизовался и привязал номер телефона.");
            }
        });
    } else {
        localStorage.setItem("mama_auth_phone", "true");
        localStorage.setItem("mama_guest_points", "50");
        userLoyalty.points = 50;
        initPassport();
        document.getElementById("gatekeeperScreen")?.classList.add("hidden");
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
                const tableDisplay = document.getElementById('tableDisplay');
                if (tableDisplay) tableDisplay.innerText = newTable;
                
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

// 10. Live Order History from Supabase
async function loadOrderHistoryFromDB() {
    const container = document.getElementById('historyContainer');
    if (!container) return;

    container.innerHTML = `<p class="text-sm text-gray-400 text-center mt-10">Загрузка истории...</p>`;

    let query = supabaseClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (user.id) {
        query = query.eq('guest_telegram_id', user.id);
    }

    const { data: orders, error } = await query;

    if (error || !orders || orders.length === 0) {
        container.innerHTML = `<div class="text-center text-sm text-gray-400 mt-10">У вас пока нет сохраненных заказов.</div>`;
        return;
    }

    container.innerHTML = orders.map((order) => {
        const dateStr = new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        return `
            <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${dateStr} · Стол #${order.table_number}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${order.status === 'served' ? 'bg-green-50 text-green-600' : 'bg-mama/10 text-mama'}">
                        ${order.status === 'served' ? 'Подан' : 'Готовится'}
                    </span>
                </div>
                
                <div class="space-y-1 mb-3">
                    <p class="text-xs font-bold text-gray-800"><span class="text-mama mr-1">60%</span> ${order.base_flavor}</p>
                    <p class="text-xs font-bold text-gray-800"><span class="text-mama mr-1">30%</span> ${order.accent_flavor}</p>
                    <p class="text-xs font-bold text-gray-800"><span class="text-gray-400 mr-1">10%</span> ${order.shade_flavor || "Без оттенка"}</p>
                </div>
                
                <div class="flex justify-between items-center pt-2 border-t border-gray-50 gap-2">
                    <span class="text-[10px] font-bold text-gray-400">Чаша: ${order.bowl_type}</span>
                    <div class="flex items-center gap-1.5">
                        ${order.status === 'served' ? `
                            <button onclick="submitOrderFeedback(${order.id})" class="text-xs font-bold text-gray-600 hover:text-mama bg-gray-50 hover:bg-mama/10 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
                                ${order.review ? 'Отзыв ★' : 'Оценить ★'}
                            </button>
                        ` : ''}
                        <button onclick="reorderSavedMix('${order.base_flavor}', '${order.accent_flavor}', '${order.shade_flavor}', '${order.bowl_type}')" class="text-xs font-black text-mama bg-mama/10 hover:bg-mama hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                            Повторить ↻
                        </button>
                    </div>
                </div>
        `;
    }).join('');
}

window.reorderSavedMix = function(base, accent, shade, bowl) {
    document.getElementById('baseSelect').value = base;
    document.getElementById('accentSelect').value = accent;
    document.getElementById('adjSelect').value = shade;
    document.getElementById('bowlSelect').value = bowl;
    switchTab('mixlab');
    if (tg.showAlert) tg.showAlert("Микс скопирован в конструктор!");
};

// ==========================================
// 10.5 Feedback & Review Logic
// ==========================================
let currentRating = 5;
let selectedTags = [];

window.setFeedbackRating = function(rating) {
    currentRating = rating;
    const stars = document.querySelectorAll('#starContainer .star-btn');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('text-gray-200');
            star.classList.add('text-amber-400');
        } else {
            star.classList.remove('text-amber-400');
            star.classList.add('text-gray-200');
        }
    });
};

window.toggleTag = function(button) {
    const text = button.innerText;
    if (selectedTags.includes(text)) {
        selectedTags = selectedTags.filter(t => t !== text);
        button.classList.remove('bg-mama', 'text-white', 'border-transparent');
        button.classList.add('bg-gray-50', 'text-gray-600', 'border-gray-200');
    } else {
        selectedTags.push(text);
        button.classList.remove('bg-gray-50', 'text-gray-600', 'border-gray-200');
        button.classList.add('bg-mama', 'text-white', 'border-transparent');
    }
};

window.submitGuestFeedback = async function() {
    const comment = document.getElementById('feedbackComment')?.value.trim() || "";
    const tableNum = document.getElementById('mixTableNum')?.value || "Неизвестно";
    const fullReviewText = `${selectedTags.join(', ')}${comment ? ` — "${comment}"` : ''}`;

    // Find the guest's latest served order to attach the review
    let query = supabaseClient
        .from('orders')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

    if (user.id) {
        query = query.eq('guest_telegram_id', user.id);
    }

    const { data: latestOrders } = await query;
    if (latestOrders && latestOrders.length > 0) {
        await supabaseClient
            .from('orders')
            .update({ rating: currentRating, review: fullReviewText })
            .eq('id', latestOrders[0].id);
    }

    // Alert Master via Telegram
    const guestName = user.first_name || "Гость";
    const alertMsg = `⭐ <b>НОВЫЙ ОТЗЫВ (Стол #${tableNum})</b>\nОценка: ${'⭐'.repeat(currentRating)}\nГость: ${guestName}\nОтзыв: ${fullReviewText}`;
    
    fetch(`https://api.telegram.org/bot8275821967:AAGpG0A79SsYU5bGT3itRmo0iUGMaYhSd9o/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: "8062455176", text: alertMsg, parse_mode: "HTML" })
    }).catch(e => console.log(e));

    // Reset UI fields
    const commentInput = document.getElementById('feedbackComment');
    if (commentInput) commentInput.value = "";
    selectedTags = [];
    document.querySelectorAll('.review-tag').forEach(b => {
        b.classList.remove('bg-mama', 'text-white', 'border-transparent');
        b.classList.add('bg-gray-50', 'text-gray-600', 'border-gray-200');
    });

    if (tg.showAlert) tg.showAlert("Спасибо за отзыв! Вам начислено +5 баллов.");
    else alert("Спасибо за отзыв! Вам начислено +5 баллов.");

    switchTab('shelf');
};

// 11. Bootstrap Application
window.loadFlavorsFromDB = fetchFlavors;

document.addEventListener("DOMContentLoaded", () => {
    initTableNumber();
    fetchFlavors();
    syncGuestLoyalty();

    if (localStorage.getItem("mama_auth_phone") === "true") {
        document.getElementById("gatekeeperScreen")?.classList.add("hidden");
    }
});

// Master Call Functions
window.openCallMasterModal = function() {
    document.getElementById('callMasterModal')?.classList.remove('hidden');
};

window.closeCallMasterModal = function() {
    document.getElementById('callMasterModal')?.classList.add('hidden');
};

window.sendMasterCall = async function(reason) {
    const tableNum = document.getElementById('mixTableNum')?.value || "Неизвестно";
    const guestName = user.first_name || "Гость";
    const guestHandle = user.username ? `(@${user.username})` : "";
    
    const message = `🚨 <b>ВЫЗОВ К СТОЛУ #${tableNum}!</b>\nПричина: <b>${reason}</b>\nГость: ${guestName} ${guestHandle}`;
    const botToken = "8275821967:AAGpG0A79SsYU5bGT3itRmo0iUGMaYhSd9o";
    const masterChatId = "8062455176";

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: masterChatId, text: message, parse_mode: "HTML" })
        });
        closeCallMasterModal();
        if (tg.showAlert) tg.showAlert("Мастер уведомлен и уже идет к вам!"); else alert("Мастер уведомлен и уже идет к вам!");
    } catch (e) {
        alert("Не удалось отправить вызов. Пожалуйста, позовите мастера лично.");
    }
};

// Post-Order Review Function
window.submitOrderFeedback = async function(orderId) {
    const rating = prompt("Оцените кальян и работу мастера от 1 до 5:", "5");
    if (!rating) return;
    const reviewText = prompt("Напишите пару слов о миксе и мастере (что понравилось / улучшить):");
    if (!reviewText) return;

    const { error } = await supabaseClient
        .from('orders')
        .update({ rating: parseInt(rating, 10), review: reviewText })
        .eq('id', orderId);

    if (error) {
        alert("Не удалось сохранить отзыв.");
        return;
    }

    trackGuestAction(`Оставил отзыв на заказ #${orderId} (${rating}⭐): "${reviewText}"`);
    if (tg.showAlert) tg.showAlert("Спасибо за обратную связь!"); else alert("Спасибо за обратную связь!");
    loadOrderHistoryFromDB();
};

// Updates percentage labels and validates the 100% total
function updateMixPercentages() {
    const p1 = parseInt(document.getElementById('basePct')?.value || 0, 10);
    const p2 = parseInt(document.getElementById('accentPct')?.value || 0, 10);
    const p3 = parseInt(document.getElementById('adjPct')?.value || 0, 10);

    const total = p1 + p2 + p3;

    // Update individual labels
    const l1 = document.getElementById('basePctLabel');
    const l2 = document.getElementById('accentPctLabel');
    const l3 = document.getElementById('adjPctLabel');
    if (l1) l1.textContent = `${p1}%`;
    if (l2) l2.textContent = `${p2}%`;
    if (l3) l3.textContent = `${p3}%`;

    // Update total counter badge
    const badge = document.getElementById('mixTotalBadge');
    const totalVal = document.getElementById('mixTotalVal');
    const submitBtn = document.getElementById('submitMixBtn');

    if (totalVal) totalVal.textContent = total;

    if (badge && submitBtn) {
        if (total === 100) {
            badge.className = "px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-700";
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            badge.className = "px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-600";
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

// Active filter state
const activeFilters = {
    category: 'all',
    profile: 'all'
};

function setFilter(type, value, btnElement) {
    activeFilters[type] = value.toLowerCase();

    // Update active styles for Category chips
    if (type === 'category') {
        document.querySelectorAll('.cat-chip').forEach(btn => {
            btn.className = "cat-chip px-3.5 py-1.5 bg-white text-gray-600 border border-gray-200 text-xs font-bold rounded-full whitespace-nowrap transition-all";
        });
        btnElement.className = "cat-chip active px-3.5 py-1.5 bg-mama text-white text-xs font-bold rounded-full whitespace-nowrap shadow-sm transition-all";
    }

    // Update active styles for Profile chips
    if (type === 'profile') {
        document.querySelectorAll('.prof-chip').forEach(btn => {
            btn.className = "prof-chip px-3 py-1 bg-white text-gray-600 border border-gray-200 text-[11px] font-bold rounded-full whitespace-nowrap transition-all";
        });
        btnElement.className = "prof-chip active px-3 py-1 bg-gray-900 text-white text-[11px] font-bold rounded-full whitespace-nowrap transition-all";
    }

    applyFlavorFilters();
}

function applyFlavorFilters() {
    if (!allFlavors || !Array.isArray(allFlavors)) return;

    const filtered = allFlavors.filter(item => {
        // Build combined text string to match against (name, tag, flavor_notes, profile, brand)
        const searchableText = [
            item.name,
            item.tag,
            item.type,
            item.flavor_notes,
            item.profile,
            item.brand
        ].filter(Boolean).join(' ').toLowerCase();

        // 1. Check Category match
        const matchesCategory = activeFilters.category === 'all' || 
            searchableText.includes(activeFilters.category);

        // 2. Check Profile / Taste note match
        const matchesProfile = activeFilters.profile === 'all' || 
            searchableText.includes(activeFilters.profile);

        return matchesCategory && matchesProfile;
    });

    // Update flavor counter badge
    const badge = document.getElementById('flavorCountBadge');
    if (badge) badge.textContent = `${filtered.length} вкусов`;

    // Render results
    renderCatalog(filtered);
}
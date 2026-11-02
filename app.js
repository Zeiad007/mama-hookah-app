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
    const tableEl = document.getElementById('tableInput') || document.getElementById('mixTableNum');
    const tableNum = tableEl?.value || "Неизвестно";

    const message = `👀 Активность: ${guestName} ${guestHandle} (Стол: ${tableNum})\nДействие: ${actionDescription}`;
    const botToken = "8275821967:AAGCh3FQx3VulN5-tbjbuOEj6xYNx93Q8SE";
    const myChatId = "8062455176";

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: myChatId, text: message })
    }).catch(() => console.log("Tracker ping failed silently"));
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

        const tableInput = document.getElementById('tableInput') || document.getElementById('mixTableNum');
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

// Check if a flavor is currently selected in any Mix Lab slot
function isFlavorInMix(name) {
    const search = name.trim().toLowerCase();
    const bVal = document.getElementById('baseSelect')?.value?.toLowerCase() || '';
    const aVal = document.getElementById('accentSelect')?.value?.toLowerCase() || '';
    const jVal = document.getElementById('adjSelect')?.value?.toLowerCase() || '';

    return bVal.includes(search) || aVal.includes(search) || (jVal !== 'без оттенка' && jVal.includes(search));
}

// Render Tobacco Catalog Cards with "+ В микс" / "✕ Убрать" toggle
function renderCatalog(items) {
    const container = document.getElementById('catalogContainer');
    if (!container) return;

    const list = items || allFlavors;
    if (!list || !Array.isArray(list) || list.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 text-center py-8">Вкусы не найдены...</p>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const brand = item.brand || '';
        const name = item.name || '';
        const note = item.flavor_notes || item.profile || '';
        const tag = item.tag || item.type || 'Микс';
        const strength = item.strength || 5;

        const safeName = name.replace(/'/g, "\\'");
        const safeBrand = brand.replace(/'/g, "\\'");
        const inMix = isFlavorInMix(name);

        const actionButton = inMix
            ? `<button onclick="removeFlavorFromMix('${safeName}', '${safeBrand}')" class="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1 shadow-sm">
                   <span>✕ Убрать</span>
               </button>`
            : `<button onclick="addFlavorToMix('${safeName}', '${safeBrand}')" class="px-3 py-1.5 bg-gray-900 hover:bg-mama text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1 shadow-sm">
                   <span>+ В микс</span>
               </button>`;

        return `
            <div class="bg-white border ${inMix ? 'border-rose-200 ring-1 ring-rose-200' : 'border-gray-100'} rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all">
                <div>
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${brand}</span>
                        <span class="bg-gray-50 border border-gray-100 text-gray-500 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            Крепость: ${strength}/10
                        </span>
                    </div>
                    <h3 class="text-base font-extrabold text-gray-900 leading-tight mb-1">${name}</h3>
                    <p class="text-xs text-gray-500 mb-3">${note}</p>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
                    <span class="inline-block bg-mama/10 text-mama text-[10px] font-bold px-2 py-0.5 rounded">
                        ${tag}
                    </span>
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}
let allFlavors = [...defaultCatalog];

function filterMenu(brandName, buttonElement) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('bg-mama', 'text-white', 'shadow-md', 'shadow-mama/20', 'border-transparent');
        btn.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
    });

    if (buttonElement) {
        buttonElement.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
        buttonElement.classList.add('bg-mama', 'text-white', 'shadow-md', 'shadow-mama/20', 'border-transparent');
    }

    if (brandName === 'All') {
        renderCatalog(allFlavors);
    } else {
        renderCatalog(allFlavors.filter(item => (item.brand || '').toLowerCase() === brandName.toLowerCase()));
    }
}

// Instant catalog loading via local cache + background sync
async function fetchFlavors() {
    // 1. Instant Render from Cache (0 ms delay)
    const cachedFlavors = localStorage.getItem("mama_cached_flavors");
    if (cachedFlavors) {
        try {
            allFlavors = JSON.parse(cachedFlavors);
            liveCatalog = allFlavors;
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
            liveCatalog = data;
            localStorage.setItem("mama_cached_flavors", JSON.stringify(data));
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
            liveCatalog = allFlavors;
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
            liveCatalog = data;
            localStorage.setItem("mama_cached_flavors", JSON.stringify(data));
            renderCatalog(allFlavors);
            if (typeof populateMixSelects === "function") {
                populateMixSelects();
            }
        }
    } catch (err) {
        console.error("Network error during flavor sync:", err);
    }
}

// Populate Mix Lab dropdowns (with protection against wiping active selections)
function populateMixSelects() {
    if (!allFlavors || allFlavors.length === 0) return;

    const baseSelect = document.getElementById('baseSelect');
    const accentSelect = document.getElementById('accentSelect');
    const adjSelect = document.getElementById('adjSelect');

    if (!baseSelect || !accentSelect || !adjSelect) return;

    // Protection: Do not overwrite if user has already selected items
    if (baseSelect.options.length > 2 && (baseSelect.value !== "" || accentSelect.value !== "")) {
        return;
    }

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

    baseSelect.innerHTML = optionsMarkup;
    accentSelect.innerHTML = optionsMarkup;
    adjSelect.innerHTML = `
        <option value="Без оттенка" selected>Без оттенка (0%)</option>
        ${optionsMarkup.replace('<option value="" disabled selected>Выберите вкус...</option>', '')}
    `;
}

// Select a curated mix from the modal banner
window.selectCuratedMix = function(index) {
    const mix = window.curatedMixes[index];
    if (!mix) return;

    window.closeTasteWizard();

    // 1. Switch view to Mix Lab tab
    const navButtons = document.querySelectorAll('nav button');
    if (navButtons && navButtons.length > 1) {
        navButtons[1].click();
    } else {
        document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById('view-mixlab')?.classList.remove('hidden');
    }
    // 2. Гарантированно выставляем табаки и проценты
    setTimeout(() => {
        const baseSelect = document.getElementById('baseSelect');
        const accentSelect = document.getElementById('accentSelect');
        const adjSelect = document.getElementById('adjSelect');

        function forceSetFlavor(selectEl, flavorTitle) {
            if (!selectEl) return;
            const target = flavorTitle.toLowerCase().trim();
            let found = null;

            for (let opt of selectEl.options) {
                const txt = opt.text.toLowerCase();
                const val = opt.value.toLowerCase();
                if (txt.includes(target) || val.includes(target)) { found = opt; break; }
                if (target.includes('грейпфрут') && (txt.includes('grape') || val.includes('grape'))) { found = opt; break; }
                if (target.includes('лайм') && (txt.includes('lime') || val.includes('lime'))) { found = opt; break; }
                if (target.includes('лед') && (txt.includes('ice') || txt.includes('supernova') || txt.includes('холод'))) { found = opt; break; }
                if (target.includes('ананас') && (txt.includes('ananas') || txt.includes('pine'))) { found = opt; break; }
                if (target.includes('персик') && txt.includes('peach')) { found = opt; break; }
                if (target.includes('малина') && (txt.includes('pinkman') || txt.includes('morse') || txt.includes('rasp'))) { found = opt; break; }
                if (target.includes('дыня') && txt.includes('melon')) { found = opt; break; }
                if (target.includes('клубника') && (txt.includes('straw') || txt.includes('pinkman'))) { found = opt; break; }
                if (target.includes('банан') && txt.includes('banana')) { found = opt; break; }
                if (target.includes('мята') && txt.includes('mint')) { found = opt; break; }
            }

            if (found) {
                selectEl.value = found.value;
            } else {
                const customVal = `${flavorTitle} (Авторский)`;
                const opt = new Option(`✨ ${flavorTitle}`, customVal, true, true);
                selectEl.add(opt);
                selectEl.value = customVal;
            }
            selectEl.dispatchEvent(new Event('change'));
        }

        if (mix.flavors[0]) forceSetFlavor(baseSelect, mix.flavors[0]);
        if (mix.flavors[1]) forceSetFlavor(accentSelect, mix.flavors[1]);
        if (mix.flavors[2]) forceSetFlavor(adjSelect, mix.flavors[2]);

        const bSlider = document.getElementById('basePct');
        const aSlider = document.getElementById('accentPct');
        const jSlider = document.getElementById('adjPct');

        if (bSlider) bSlider.value = mix.p1 || 50;
        if (aSlider) aSlider.value = mix.p2 || 30;
        if (jSlider) jSlider.value = mix.p3 || 20;

        if (typeof updateMixPercentages === 'function') {
            updateMixPercentages();
        }

        const comment = document.getElementById('mixComment');
        if (comment) {
            comment.value = `Фирменный микс «${mix.title}»`;
        }
    }, 150);
};

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

// Global Taste Wizard Controller
window.wizardState = {
    category: 'all',
    profile: 'all',
    strength: 'all'
};

window.openTasteWizard = function() {
    console.log("Opening taste wizard...");
    const modal = document.getElementById('tasteWizardModal');
    if (!modal) {
        console.error("tasteWizardModal element not found in HTML!");
        return;
    }
    window.goToWizardStep(1);
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

window.closeTasteWizard = function() {
    const modal = document.getElementById('tasteWizardModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.goToWizardStep = function(step) {
    const s1 = document.getElementById('wizardStep1');
    const s2 = document.getElementById('wizardStep2');
    const s3 = document.getElementById('wizardStep3');
    const counter = document.getElementById('wizardStepCounter');
    const title = document.getElementById('wizardStepTitle');

    if (s1) s1.classList.add('hidden');
    if (s2) s2.classList.add('hidden');
    if (s3) s3.classList.add('hidden');

    if (step === 1 && s1) {
        s1.classList.remove('hidden');
        if (counter) counter.textContent = "Шаг 1 из 3";
        if (title) title.textContent = "Какое направление хотите?";
    } else if (step === 2 && s2) {
        s2.classList.remove('hidden');
        if (counter) counter.textContent = "Шаг 2 из 3";
        if (title) title.textContent = "Какой вкус предпочитаете?";
    } else if (step === 3 && s3) {
        s3.classList.remove('hidden');
        if (counter) counter.textContent = "Шаг 3 из 3";
        if (title) title.textContent = "Желаемая крепость?";
    }
};

window.chooseWizardCategory = function(cat) {
    window.wizardState.category = cat;
    window.goToWizardStep(2);
};

window.chooseWizardProfile = function(prof) {
    window.wizardState.profile = prof;
    window.goToWizardStep(3);
};

window.chooseWizardStrength = function(str) {
    window.wizardState.strength = str;
    window.closeTasteWizard();
    window.applyWizardResults();
};

window.applyWizardResults = function() {
    if (!allFlavors || !Array.isArray(allFlavors)) return;

    const filtered = allFlavors.filter(item => {
        const text = [
            item.name,
            item.tag,
            item.type,
            item.flavor_notes,
            item.profile,
            item.brand
        ].filter(Boolean).join(' ').toLowerCase();

        const matchCategory = window.wizardState.category === 'all' || text.includes(window.wizardState.category);
        const matchProfile = window.wizardState.profile === 'all' || text.includes(window.wizardState.profile);

        const st = parseInt(item.strength || 5, 10);
        let matchStrength = true;
        if (window.wizardState.strength === 'light') matchStrength = (st <= 3);
        else if (window.wizardState.strength === 'medium') matchStrength = (st >= 4 && st <= 6);
        else if (window.wizardState.strength === 'strong') matchStrength = (st >= 7);

        return matchCategory && matchProfile && matchStrength;
    });

    const bar = document.getElementById('wizardFilterBar');
    const summary = document.getElementById('wizardFilterSummary');
    if (bar && summary) {
        bar.classList.remove('hidden');
        bar.style.display = 'flex';
        summary.textContent = `Найдено: ${filtered.length} подходящих вкусов`;
    }

    renderCatalog(filtered);
};

window.resetWizardFilter = function() {
    window.wizardState.category = 'all';
    window.wizardState.profile = 'all';
    window.wizardState.strength = 'all';

    const bar = document.getElementById('wizardFilterBar');
    if (bar) {
        bar.classList.add('hidden');
        bar.style.display = 'none';
    }
    renderCatalog(allFlavors);
};

// 1. Список фирменных миксов с точными процентами
window.curatedMixes = [
    {
        title: "Тропический бриз",
        emoji: "🍍",
        tag: "Сладкий • Тропики",
        p1: 60,
        p2: 30,
        p3: 10,
        flavors: ["Ананас", "Кокос", "Дыня"]
    },
    {
        title: "Летний фреш",
        emoji: "🍑",
        tag: "Кисло-сладкий • Ягодный",
        p1: 50,
        p2: 30,
        p3: 20,
        flavors: ["Персик", "Дыня", "Малина"]
    },
    {
        title: "Клубничный смузи",
        emoji: "🍓",
        tag: "Сладкий с холодком",
        p1: 60,
        p2: 30,
        p3: 10,
        flavors: ["Клубника", "Банан", "Мята"]
    },
    {
        title: "Цитрусовый бум",
        emoji: "🍋",
        tag: "Кислый • Освежающий",
        p1: 50,
        p2: 30,
        p3: 20,
        flavors: ["Грейпфрут", "Лайм", "Лед"]
    }
];

// 1. Curated signature mixes data
window.curatedMixes = [
    {
        title: "Тропический бриз",
        emoji: "🍍",
        tag: "Сладкий • Тропики",
        p1: 60,
        p2: 30,
        p3: 10,
        flavors: ["Ананас", "Кокос", "Дыня"]
    },
    {
        title: "Летний фреш",
        emoji: "🍑",
        tag: "Кисло-сладкий • Ягодный",
        p1: 50,
        p2: 30,
        p3: 20,
        flavors: ["Персик", "Дыня", "Малина"]
    },
    {
        title: "Клубничный смузи",
        emoji: "🍓",
        tag: "Сладкий с холодком",
        p1: 60,
        p2: 30,
        p3: 10,
        flavors: ["Клубника", "Банан", "Мята"]
    },
    {
        title: "Цитрусовый бум",
        emoji: "🍋",
        tag: "Кислый • Освежающий",
        p1: 50,
        p2: 30,
        p3: 20,
        flavors: ["Грейпфрут", "Лайм", "Лед"]
    }
];

// 2. Open / Close Curated Mixes Modal
window.openTasteWizard = function() {
    window.renderCuratedMixes();
    const modal = document.getElementById('tasteWizardModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.closeTasteWizard = function() {
    const modal = document.getElementById('tasteWizardModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

// 3. Render Curated Mix Cards inside the modal
window.renderCuratedMixes = function() {
    const container = document.getElementById('curatedMixesContainer');
    if (!container) return;

    container.innerHTML = window.curatedMixes.map((mix, idx) => `
        <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2.5">
                    <span class="text-3xl">${mix.emoji}</span>
                    <div>
                        <h4 class="text-sm font-extrabold text-gray-900 leading-tight">${mix.title}</h4>
                        <span class="text-[10px] font-bold text-mama uppercase tracking-wider">${mix.tag}</span>
                    </div>
                </div>
                <span class="text-[10px] font-extrabold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-lg">
                    ${mix.p1}% / ${mix.p2}% / ${mix.p3}%
                </span>
            </div>

            <div class="flex flex-wrap gap-1.5 my-2">
                ${mix.flavors.map(f => `
                    <span class="bg-white border border-gray-200 text-gray-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                        ${f}
                    </span>
                `).join('')}
            </div>

            <button onclick="selectCuratedMix(${idx})" class="mt-2 w-full py-2.5 bg-mama hover:bg-mama/90 text-white text-xs font-black rounded-xl shadow-md shadow-mama/20 active:scale-95 transition-all flex items-center justify-center gap-1.5">
                <span>Выбрать этот микс</span>
                <span>💨</span>
            </button>
        </div>
    `).join('');
};

// 4. Toast notification helper
function showMixToast(message, isWarning = false) {
    let toast = document.getElementById('mixToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'mixToast';
        toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl transition-all duration-300 pointer-events-none text-center max-w-[90%]';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.backgroundColor = isWarning ? '#1f2937' : '#e11d48';
    toast.style.color = '#ffffff';
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)';

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 10px)';
    }, 2200);
}

// 5. Helper: Check if a flavor is currently selected in any slot
function isFlavorInMix(name) {
    const search = name.trim().toLowerCase();
    const bVal = document.getElementById('baseSelect')?.value?.toLowerCase() || '';
    const aVal = document.getElementById('accentSelect')?.value?.toLowerCase() || '';
    const jVal = document.getElementById('adjSelect')?.value?.toLowerCase() || '';

    return bVal.includes(search) || aVal.includes(search) || (jVal !== 'без оттенка' && jVal.includes(search));
}

// 6. Render Tobacco Catalog with interactive "+ В микс" / "✕ Убрать" toggle
function renderCatalog(items) {
    const container = document.getElementById('catalogContainer');
    if (!container) return;

    const list = items || allFlavors;
    if (!list || !Array.isArray(list) || list.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 text-center py-8">Вкусы не найдены...</p>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const brand = item.brand || '';
        const name = item.name || '';
        const note = item.flavor_notes || item.profile || '';
        const tag = item.tag || item.type || 'Микс';
        const strength = item.strength || 5;

        const safeName = name.replace(/'/g, "\\'");
        const safeBrand = brand.replace(/'/g, "\\'");
        const inMix = isFlavorInMix(name);

        const actionButton = inMix
            ? `<button onclick="removeFlavorFromMix('${safeName}', '${safeBrand}')" class="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1 shadow-sm">
                   <span>✕ Убрать</span>
               </button>`
            : `<button onclick="addFlavorToMix('${safeName}', '${safeBrand}')" class="px-3 py-1.5 bg-gray-900 hover:bg-mama text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1 shadow-sm">
                   <span>+ В микс</span>
               </button>`;

        return `
            <div class="bg-white border ${inMix ? 'border-rose-200 ring-1 ring-rose-200' : 'border-gray-100'} rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all">
                <div>
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${brand}</span>
                        <span class="bg-gray-50 border border-gray-100 text-gray-500 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            Крепость: ${strength}/10
                        </span>
                    </div>
                    <h3 class="text-base font-extrabold text-gray-900 leading-tight mb-1">${name}</h3>
                    <p class="text-xs text-gray-500 mb-3">${note}</p>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
                    <span class="inline-block bg-mama/10 text-mama text-[10px] font-bold px-2 py-0.5 rounded">
                        ${tag}
                    </span>
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

// 7. Add Flavor from Catalog into next available mix slot
window.addFlavorToMix = function(name, brand) {
    const baseSelect = document.getElementById('baseSelect');
    const accentSelect = document.getElementById('accentSelect');
    const adjSelect = document.getElementById('adjSelect');

    if (!baseSelect || !accentSelect || !adjSelect) return;

    const targetVal = `${name} (${brand})`;

    const setSelectOption = (selectEl) => {
        const optionExists = Array.from(selectEl.options).some(opt => opt.value === targetVal);
        if (optionExists) {
            selectEl.value = targetVal;
        } else {
            const match = Array.from(selectEl.options).find(opt => opt.text.toLowerCase().includes(name.toLowerCase()));
            if (match) selectEl.value = match.value;
        }
    };

    if (!baseSelect.value || baseSelect.value === "") {
        setSelectOption(baseSelect);
        showMixToast(`«${name}» добавлен как 1-й вкус (База) 🌿`);
    } else if (!accentSelect.value || accentSelect.value === "") {
        setSelectOption(accentSelect);
        showMixToast(`«${name}» добавлен как 2-й вкус (Акцент) 🍓`);
    } else if (!adjSelect.value || adjSelect.value === "" || adjSelect.value === "Без оттенка") {
        setSelectOption(adjSelect);
        showMixToast(`«${name}» добавлен как 3-й вкус (Оттенок) ✨`);
    } else {
        showMixToast(`Все 3 слота уже заполнены!`, true);
        return;
    }

    renderCatalog();
};

// 8. Remove flavor from mix directly from catalog
window.removeFlavorFromMix = function(name, brand) {
    const search = name.trim().toLowerCase();
    const baseSelect = document.getElementById('baseSelect');
    const accentSelect = document.getElementById('accentSelect');
    const adjSelect = document.getElementById('adjSelect');

    if (baseSelect && baseSelect.value.toLowerCase().includes(search)) {
        window.clearMixSlot('base');
    } else if (accentSelect && accentSelect.value.toLowerCase().includes(search)) {
        window.clearMixSlot('accent');
    } else if (adjSelect && adjSelect.value.toLowerCase().includes(search)) {
        window.clearMixSlot('adj');
    }

    showMixToast(`«${name}» убран из микса ✕`);
    renderCatalog();
};

// 9. Clear slot handler
window.clearMixSlot = function(slotType) {
    if (slotType === 'base') {
        const select = document.getElementById('baseSelect');
        const slider = document.getElementById('basePct');
        if (select) select.selectedIndex = 0;
        if (slider) slider.value = 0;
    } else if (slotType === 'accent') {
        const select = document.getElementById('accentSelect');
        const slider = document.getElementById('accentPct');
        if (select) select.selectedIndex = 0;
        if (slider) slider.value = 0;
    } else if (slotType === 'adj') {
        const select = document.getElementById('adjSelect');
        const slider = document.getElementById('adjPct');
        if (select) select.value = "Без оттенка";
        if (slider) slider.value = 0;
    }

    if (typeof updateMixPercentages === 'function') {
        updateMixPercentages();
    }

    renderCatalog();
};
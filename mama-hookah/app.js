// 1. Initialize Telegram SDK
const tg = window.Telegram.WebApp;
tg.expand();

// 2. Load User Data
const user = tg.initDataUnsafe?.user || { first_name: "Гость" };
document.getElementById('userName').innerText = user.first_name;

// 3. Table Number Check
const startParam = tg.initDataUnsafe?.start_param;
if (startParam) {
    document.getElementById('tableDisplay').innerText = startParam.replace('table_', '');
}

// 4. Tab Navigation Logic
const tabs = ['shelf', 'mixlab', 'passport', 'history'];

function switchTab(activeTab) {
    tabs.forEach(tab => {
        // Hide views
        document.getElementById(`view-${tab}`).classList.add('hidden');
        // Reset icons to gray
        document.getElementById(`tab-${tab}`).classList.remove('text-mama');
        document.getElementById(`tab-${tab}`).classList.add('text-gray-300');
    });

    // Show active view
    document.getElementById(`view-${activeTab}`).classList.remove('hidden');
    // Highlight active icon in Mama Magenta
    document.getElementById(`tab-${activeTab}`).classList.remove('text-gray-300');
    document.getElementById(`tab-${activeTab}`).classList.add('text-mama');
}




// --- PREVIOUS CODE REMAINS ABOVE THIS LINE ---

// 5. The Tobacco Database
const catalog = [
    { brand: "Must Have", name: "Pinkman", strength: 5, profile: "Малина, грейпфрут, клубника. Кисло-сладкий.", type: "Ягодный" },
    { brand: "Must Have", name: "Mango Sling", strength: 5, profile: "Пряный сочный манго с холодком.", type: "Тропический" },
    { brand: "Black Burn", name: "Apple Shock", strength: 7, profile: "Экстремально кислое зеленое яблоко.", type: "Кислый" },
    { brand: "Black Burn", name: "Ananas Shock", strength: 7, profile: "Кислый ананасовый леденец.", type: "Кислый" },
    { brand: "Deus", name: "Pomegranate Morse", strength: 7, profile: "Натуральный терпкий гранатовый морс.", type: "Ягодный" },
    { brand: "Deus", name: "Blueberry Yogurt", strength: 7, profile: "Нежный сливочно-черничный десерт.", type: "Десертный" },
    { brand: "Tangiers", name: "Cane Mint", strength: 9, profile: "Легендарная перечная тростниковая мята.", type: "Свежий" },
    { brand: "Bonche", name: "Black Currant", strength: 9, profile: "Сигарный лист с глубокой черной смородиной.", type: "Сигарный" }
];

// 6. The Card Rendering Engine
function renderCatalog(items) {
    const container = document.getElementById('catalogContainer');
    container.innerHTML = items.map(item => `
        <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <div class="flex justify-between items-start mb-1">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${item.brand}</span>
                <span class="bg-gray-50 border border-gray-100 text-gray-500 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    Крепость: ${item.strength}/10
                </span>
            </div>
            <h3 class="text-base font-extrabold text-gray-900 leading-tight mb-1">${item.name}</h3>
            <p class="text-xs text-gray-500 mb-3">${item.profile}</p>
            <div class="inline-block bg-mama/10 text-mama text-[10px] font-bold px-2 py-1 rounded w-max mt-auto">
                ${item.type}
            </div>
        </div>
    `).join('');
}

// 7. Filter Logic
function filterMenu(brandName, buttonElement) {
    // Update button styles (make active button magenta, others white)
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('bg-mama', 'text-white', 'shadow-md', 'shadow-mama/20', 'border-transparent');
        btn.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
    });
    
    buttonElement.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
    buttonElement.classList.add('bg-mama', 'text-white', 'shadow-md', 'shadow-mama/20', 'border-transparent');

    // Filter the array
    if (brandName === 'All') {
        renderCatalog(catalog);
    } else {
        const filtered = catalog.filter(item => item.brand === brandName);
        renderCatalog(filtered);
    }
}

// 8. Run on App Load
renderCatalog(catalog);


// 9. Populate Mix Lab Dropdowns (Safe Version)
function populateDropdowns() {
    // Check if catalog exists
    if (typeof catalog === 'undefined' || !catalog || catalog.length === 0) {
        console.error("Ошибка: Каталог табаков не найден!");
        return;
    }

    try {
        const defaultOption = `<option value="" disabled selected>Выберите вкус...</option>`;
        const flavorOptions = catalog.map(item => `<option value="${item.brand} - ${item.name}">${item.brand} — ${item.name}</option>`).join('');
        
        document.getElementById('baseSelect').innerHTML = defaultOption + flavorOptions;
        document.getElementById('accentSelect').innerHTML = defaultOption + flavorOptions;
        
        const adjDefault = `<option value="Без оттенка" selected>Без оттенка (0%)</option>`;
        document.getElementById('adjSelect').innerHTML = adjDefault + flavorOptions;
    } catch (error) {
        console.error("Ошибка при загрузке вкусов:", error);
    }
}

// Make sure to actually run the function!
populateDropdowns();

// 18. Real-Time Admin Override (Database Sync Logic)
function syncAdminTableOverride(adminAssignedTable) {
    const tableInput = document.getElementById('mixTableNum');
    const lockBadge = document.getElementById('adminLockBadge');
    
    // 1. Force the input to the admin's correct table number
    tableInput.value = adminAssignedTable;
    
    // 2. Lock the input so the guest cannot change it back
    tableInput.setAttribute('readonly', 'true');
    tableInput.classList.replace('bg-gray-50', 'bg-green-50');
    tableInput.classList.replace('border-gray-200', 'border-green-200');
    
    // 3. Show the confirmation badge
    lockBadge.classList.remove('hidden');
    
    // 4. Update the header display as well
    document.getElementById('tableDisplay').innerText = adminAssignedTable;

    // Optional: Notify the guest that the master updated their session
    if (window.Telegram.WebApp.initData !== "") {
        tg.showAlert(`Администратор обновил ваш стол на #${adminAssignedTable}.`);
    } else {
        alert(`Администратор обновил ваш стол на #${adminAssignedTable}.`);
    }
}

// 19. Hidden Admin Panel Trigger (UPDATED FOR IMAGE)
let clickCount = 0;
// We changed this from 'header h1' to 'header img' to target your new logo
const logoImage = document.querySelector('header img'); 

if (logoImage) {
    logoImage.addEventListener('click', () => {
        clickCount++;
        if (clickCount === 5) {
            const newTable = prompt("Admin Override: Enter correct table number for this guest:");
            if (newTable) syncAdminTableOverride(newTable);
            clickCount = 0; // Reset counter
        }
    });
} else {
    console.error("Логотип не найден для админ-панели");
}

// 11. Run Initialization
populateDropdowns();



// 12. Loyalty Program State
const userLoyalty = {
    points: 45,
    nextTierTarget: 100,
    tierName: "Silver"
};

function initPassport() {
    document.getElementById('passportName').innerText = user.first_name;
    document.getElementById('passportPoints').innerText = userLoyalty.points;
    document.getElementById('passportBadge').innerText = userLoyalty.tierName;
    
    // Calculate progress percentage
    const progressPercent = Math.min(100, Math.round((userLoyalty.points / userLoyalty.nextTierTarget) * 100));
    document.getElementById('passportProgressText').innerText = `${userLoyalty.points} / ${userLoyalty.nextTierTarget}`;
    document.getElementById('passportProgressBar').style.width = `${progressPercent}%`;
}

// 13. Reward Redemption Handler (SAFE VERSION)
window.redeemReward = function(rewardTitle, cost) {
    // Check if we are inside Telegram or a standard PC browser
    const isTelegram = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== "");
    
    if (userLoyalty.points < cost) {
        const msg = `Недостаточно баллов. Нужно еще ${cost - userLoyalty.points} баллов.`;
        if (isTelegram && window.Telegram.WebApp.showAlert) window.Telegram.WebApp.showAlert(msg);
        else alert(msg);
        return;
    }

    // Deduct points and update the passport screen
    userLoyalty.points -= cost;
    initPassport();

    // Show success message
    const successMsg = `🎁 Купон активирован: "${rewardTitle}"!\nПокажите этот экран кальянному мастеру.`;
    if (isTelegram && window.Telegram.WebApp.showAlert) window.Telegram.WebApp.showAlert(successMsg);
    else alert(successMsg);
};



// 14. History Data (Mock Database)
const orderHistory = [
    { 
        date: "28 Августа 2026", 
        base: "Must Have - Pinkman", 
        accent: "Black Burn - Apple Shock", 
        adj: "Tangiers - Cane Mint", 
        bowl: "Убивашка", 
        rating: 5 
    },
    { 
        date: "15 Августа 2026", 
        base: "Deus - Blueberry Yogurt", 
        accent: "Deus - Pomegranate Morse", 
        adj: "Без оттенка", 
        bowl: "Турка", 
        rating: 4 
    }
];

// 15. Render History Cards
function renderHistory() {
    const container = document.getElementById('historyContainer');
    
    if (orderHistory.length === 0) {
        container.innerHTML = `<div class="text-center text-sm text-gray-400 mt-10">У вас пока нет заказов.</div>`;
        return;
    }

    container.innerHTML = orderHistory.map((order, index) => `
        <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div class="flex justify-between items-center mb-3">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${order.date}</span>
                <span class="text-mama text-xs">
                    ${'★'.repeat(order.rating)}${'☆'.repeat(5 - order.rating)}
                </span>
            </div>
            
            <div class="space-y-1 mb-4">
                <p class="text-sm font-bold text-gray-800"><span class="text-mama mr-1">60%</span> ${order.base.split(' - ')[1] || order.base}</p>
                <p class="text-sm font-bold text-gray-800"><span class="text-mama mr-1">30%</span> ${order.accent.split(' - ')[1] || order.accent}</p>
                <p class="text-sm font-bold text-gray-800"><span class="text-gray-400 mr-1">10%</span> ${order.adj === "Без оттенка" ? "Без оттенка" : (order.adj.split(' - ')[1] || order.adj)}</p>
            </div>
            
            <div class="flex justify-between items-center">
                <span class="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                    Чаша: ${order.bowl}
                </span>
                <button onclick="reorderMix(${index})" class="text-xs font-black text-mama bg-mama/10 hover:bg-mama hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                    Повторить ↻
                </button>
            </div>
        </div>
    `).join('');
}

// 16. Reorder Logic (Auto-fill Mix Lab)
function reorderMix(index) {
    const mix = orderHistory[index];
    
    // Auto-fill the Mix Lab form dropdowns
    document.getElementById('baseSelect').value = mix.base;
    document.getElementById('accentSelect').value = mix.accent;
    document.getElementById('adjSelect').value = mix.adj;
    document.getElementById('bowlSelect').value = mix.bowl;
    
    // Smoothly switch the user to the Mix Lab tab
    switchTab('mixlab');
    
    // Optional popup confirming the load
    const isTelegram = window.Telegram.WebApp.initData !== "";
    if (isTelegram) {
        tg.showAlert("Микс загружен! Укажите номер стола и отправьте заказ.");
    }
}

// Run history initialization
renderHistory();


// 17. Request Phone Number Logic
function requestPhone() {
    const isTelegram = window.Telegram.WebApp.initData !== "";
    
    if (isTelegram) {
        tg.requestContact((shared) => {
            if (shared) {
                // If the guest clicks "Share", update the UI and give them points
                document.getElementById('contactSection').innerHTML = `
                    <p class="text-xs font-bold text-green-600 bg-green-50 p-3 rounded-lg">✅ Телефон успешно привязан (+50 Б)</p>
                `;
                userLoyalty.points += 50;
                initPassport(); // Refresh the points on the screen
                
                // In production, this is where you send the phone number to your database
            }
        });
    } else {
        alert("📞 В Telegram появится системное окно с просьбой поделиться контактом. После согласия интерфейс обновится.");
        document.getElementById('contactSection').innerHTML = `<p class="text-xs font-bold text-green-600 bg-green-50 p-3 rounded-lg">✅ Тестовый контакт привязан (+50 Б)</p>`;
        userLoyalty.points += 50;
        initPassport();
    }
}

// 20. Gatekeeper Auth Logic
document.addEventListener("DOMContentLoaded", () => {
    // Check if the guest has already logged in during a previous visit
    if (localStorage.getItem("mama_auth_phone") === "true") {
        document.getElementById("gatekeeperScreen").classList.add("hidden");
    }
});

window.forcePhoneLogin = function() {
    const isTelegram = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== "");
    
    if (isTelegram) {
        tg.requestContact((shared) => {
            if (shared) {
                // Save login state to their phone's local storage
                localStorage.setItem("mama_auth_phone", "true");
                // Remove the lock screen
                document.getElementById("gatekeeperScreen").classList.add("hidden");
                // Award the 50 welcome points automatically
                userLoyalty.points += 50;
                initPassport(); 
            }
        });
    } else {
        // Fallback for PC testing
        alert("📞 В Telegram появится системное окно с просьбой поделиться контактом.");
        localStorage.setItem("mama_auth_phone", "true");
        document.getElementById("gatekeeperScreen").classList.add("hidden");
    }
};
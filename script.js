// تخزين البيانات
let scannedHistory = JSON.parse(localStorage.getItem('scannedHistory')) || [];
let favoriteHistory = JSON.parse(localStorage.getItem('favoriteHistory')) || [];
let myQRs = JSON.parse(localStorage.getItem('myQRs')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    vibrate: true,
    autoOpen: true,
    saveHistory: true
};

// متغيرات DOM
let currentStream = null;

// وظائف الشاشة
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// إنشاء رمز الاستجابة السريعة
function startCreatingQR(type) {
    // إظهار شاشة إنشاء رمز الاستجابة السريعة
    showScreen('create-qr-screen');
    // تعيين العنوان
    document.getElementById('create-qr-title').textContent = `إنشاء رمز استجابة سريعة: ${type}`;
    // بناء واجهة المستخدم بناءً على النوع
    let inputArea = document.getElementById('qr-input-area');
    inputArea.innerHTML = ''; // مسح

    let input;
    switch(type) {
        case 'url':
            input = `<input type="url" id="qr-data-input" placeholder="أدخل الرابط" required>`;
            break;
        case 'text':
            input = `<textarea id="qr-data-input" placeholder="أدخل النص"></textarea>`;
            break;
        // ... يمكنك إضافة المزيد من الأنواع
        default:
            input = `<input type="text" id="qr-data-input" placeholder="أدخل البيانات">`;
    }

    inputArea.innerHTML = `
        ${input}
        <button onclick="generateQR()">إنشاء</button>
    `;
}

function generateQR() {
    const data = document.getElementById('qr-data-input').value;
    if (!data) {
        alert('الرجاء إدخال البيانات');
        return;
    }

    const canvas = document.getElementById('qr-canvas');
    QRCode.toCanvas(canvas, data, function (error) {
        if (error) {
            console.error(error);
            alert('فشل إنشاء رمز الاستجابة السريعة');
            return;
        }
        document.getElementById('qr-result').style.display = 'block';
    });
}

function downloadQR() {
    const canvas = document.getElementById('qr-canvas');
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function saveToMyQRs() {
    const data = document.getElementById('qr-data-input').value;
    const newQR = {
        id: Date.now(),
        data: data,
        type: 'link', // يجب تعديل هذا بناءً على النوع
        createdAt: new Date().toLocaleDateString('ar-EG', { year: '2-digit', month: '2-digit', day: '2-digit' })
    };
    myQRs.push(newQR);
    localStorage.setItem('myQRs', JSON.stringify(myQRs));
    alert('تم الحفظ في رموز الاستجابة السريعة الخاصة بي!');
}

// مسح رمز الاستجابة السريعة
function startScan() {
    const video = document.getElementById('scanner');
    if (currentStream) {
        stopScan();
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function(stream) {
            currentStream = stream;
            video.srcObject = stream;
            video.play();
            requestAnimationFrame(scanQR);
        })
        .catch(function(err) {
            console.error("خطأ في الوصول إلى الكاميرا: ", err);
        });
}

function stopScan() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    const video = document.getElementById('scanner');
    video.srcObject = null;
}

function scanQR() {
    const video = document.getElementById('scanner');
    const canvas = document.getElementById('scan-canvas');
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            // تم العثور على رمز الاستجابة السريعة
            if (settings.vibrate && navigator.vibrate) {
                navigator.vibrate(200);
            }
            document.getElementById('scan-result').textContent = `تم المسح: ${code.data}`;
            // حفظ في السجل إذا كان الإعداد ممكّنًا
            if (settings.saveHistory) {
                scannedHistory.push({
                    data: code.data,
                    timestamp: new Date()
                });
                localStorage.setItem('scannedHistory', JSON.stringify(scannedHistory));
            }
            // فتح تلقائيًا إذا كان رابطًا والإعداد ممكّنًا
            if (settings.autoOpen && /^https?:\/\//i.test(code.data)) {
                window.open(code.data, '_blank');
            }
            stopScan();
            return;
        }
    }
    requestAnimationFrame(scanQR);
}

// تهيئة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // تحميل الإعدادات في واجهة المستخدم
    document.getElementById('vibrate-setting').checked = settings.vibrate;
    document.getElementById('auto-open-setting').checked = settings.autoOpen;
    document.getElementById('save-history-setting').checked = settings.saveHistory;

    // إعداد مستمعي الإعدادات
    document.getElementById('vibrate-setting').addEventListener('change', function() {
        settings.vibrate = this.checked;
        localStorage.setItem('settings', JSON.stringify(settings));
    });
    document.getElementById('auto-open-setting').addEventListener('change', function() {
        settings.autoOpen = this.checked;
        localStorage.setItem('settings', JSON.stringify(settings));
    });
    document.getElementById('save-history-setting').addEventListener('change', function() {
        settings.saveHistory = this.checked;
        localStorage.setItem('settings', JSON.stringify(settings));
    });

    // إظهار الشاشة الترحيبية في البداية
    showScreen('welcome-screen');
});

// وظائف أخرى (حذف الحساب، تسجيل الخروج، إلخ) يمكن أن تكون تنبيهات بسيطة
function deleteAccount() {
    if (confirm('هل أنت متأكد من حذف حسابك؟ سيتم فقدان جميع البيانات.')) {
        localStorage.clear();
        alert('تم حذف الحساب.');
        location.reload();
    }
}

function logout() {
    // في هذا الإصدار البسيط، نقوم فقط بتنظيف بعض البيانات
    localStorage.removeItem('scannedHistory');
    localStorage.removeItem('favoriteHistory');
    localStorage.removeItem('myQRs');
    localStorage.removeItem('settings');
    alert('تم تسجيل الخروج.');
    location.reload();
}

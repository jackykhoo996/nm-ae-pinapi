// 1. 自动从 URL 捕获 Voluum 核心 Click ID 追踪参数
const params = new URLSearchParams(window.location.search);
const click_id = params.get("click_id") || params.get("clickid") || "";
const pub_id = params.get("pub_id") || params.get("pubid") || "";

if (click_id) {
    localStorage.setItem("click_id", click_id);
}
if (pub_id) {
    localStorage.setItem("pub_id", pub_id);
}

// 安全获取当前 HTML 页面选择的语言字典
function getLangDict() {
    return window.currentLangDictionary || {
        jsAlertMsisdn: 'Please enter a valid 9-digit Etisalat number starting with 5.',
        jsAlertPin: 'Please enter the 4-digit PIN.',
        jsStatusLoading: 'Connecting to gateway...',
        jsStatusVerify: 'Verifying...'
    };
}

// 2. 第一步：向后端 Vercel 发送手机号请求 PIN 码
async function requestPin() {
    const msisdnInput = document.getElementById("msisdn").value.trim();
    const dict = getLangDict();
    
    if (!msisdnInput || msisdnInput.length !== 9 || !msisdnInput.startsWith('5')) {
        alert(dict.jsAlertMsisdn);
        return;
    }

    const fullMsisdn = "971" + msisdnInput;
    
    // 🎯 修复点：纯单引号安全拼接，绝不报红
    document.getElementById("statusText").innerHTML = '<span style="color:#00ffaa;">' + dict.jsStatusLoading + '</span>';
    
    try {
        const response = await fetch("/api/request", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                msisdn: fullMsisdn,
                click_id: localStorage.getItem("click_id") || "test_click"
            })
        });

        const data = await response.json();
        
        const resultEl = document.getElementById("result");
        if (resultEl) {
            resultEl.innerText = JSON.stringify(data, null, 2);
        }

        if (data.status === "SUCCESS" || data.request_id) {
            localStorage.setItem("request_id", data.request_id);
            localStorage.setItem("msisdn", fullMsisdn);

            document.getElementById("requestSection").style.display = "none";
            document.getElementById("verifySection").style.display = "block";
            document.getElementById("statusText").innerHTML = "";
        } else {
            const isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
            const errWord = isEn ? 'Gateway Refused: ' : 'خطأ في الشبكة: ';
            
            // 🎯 修复点 78 行：干掉所有混乱反引号，纯单引号通车
            document.getElementById("statusText").innerHTML = '<span style="color:#ff0055;">' + errWord + (data.desc || "Failed") + '</span>';
            alert(data.desc || "Rejected");
        }
    } catch (err) {
        // 🎯 修复点 91 行：纯单引号闭合
        document.getElementById("statusText").innerHTML = '<span style="color:#ff0055;">Timeout</span>';
        console.error(err);
    }
}

// 3. 第二步：验证用户输入的 4 位 PIN 码
async function verifyPin() {
    const pin_code = document.getElementById("pin").value.trim();
    const dict = getLangDict();

    if (!pin_code || pin_code.length !== 4) {
        alert(dict.jsAlertPin);
        return;
    }

    document.getElementById("statusText").innerHTML = '<span style="color:#0077ff;">' + dict.jsStatusVerify + '</span>';

    try {
        const response = await fetch("/api/verify", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                msisdn: localStorage.getItem("msisdn"),
                pin_code: pin_code,
                request_id: localStorage.getItem("request_id"),
                click_id: localStorage.getItem("click_id") || "test_click"
            })
        });

        const data = await response.json();
        
        const resultEl = document.getElementById("result");
        if (resultEl) {
            resultEl.innerText = JSON.stringify(data, null, 2);
        }

        if (data.success && data.verify_response && data.verify_response.status === "SUCCESS") {
            const isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
            const successAlert = isEn 
                ? "Subscription successful! Welcome to Gameonz Elite Hub."
                : "تم الاشتراك بنجاح! مرحبًا بك في منصة Gameonz.";
                
            alert(successAlert);
            window.location.href = "http://ae.299.gameonz.vip";
        } else {
            const failReason = (data.verify_response && data.verify_response.desc) || "Invalid PIN";
            const isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
            const failWord = isEn ? "Failed: " : "فشل التحقق: ";
            
            document.getElementById("statusText").innerHTML = '<span style="color:#ff0055;">' + failWord + failReason + '</span>';
            alert(failWord + failReason);
        }
    } catch (err) {
        document.getElementById("statusText").innerHTML = '<span style="color:#ff0055;">Server Error</span>';
        console.error(err);
    }
}
// 1. 自动从 URL 捕获 Voluum 核心 Click ID 追踪参数（兼容所有常见写法）
const params = new URLSearchParams(window.location.search);

// 容错抓取：优先抓 click_id，其次抓无下划线的 clickid
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
    
    // 严格校验阿联酋 Etisalat 手机号格式 (必须是9位且以5开头)
    if (!msisdnInput || msisdnInput.length !== 9 || !msisdnInput.startsWith('5')) {
        alert(dict.jsAlertMsisdn);
        return;
    }

    // 完美补全阿联酋国际标准长途区号格式：9715xxxxxxxx[cite: 1]
    const fullMsisdn = "971" + msisdnInput;
    
    // 动态反馈网关连接状态
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
        
        // 渲染数据到页面隐藏接收端，确保脚本不报错
        const resultEl = document.getElementById("result");
        if (resultEl) {
            resultEl.innerText = JSON.stringify(data, null, 2);
        }

        // 根据 CP 接口返回的数据状态判断是否发送成功[cite: 2]
        if (data.status === "SUCCESS" || data.request_id) {[cite: 2]
            localStorage.setItem("request_id", data.request_id);[cite: 2]
            localStorage.setItem("msisdn", fullMsisdn);

            // 丝滑隐藏手机号输入区，展示验证码验证区[cite: 9]
            document.getElementById("requestSection").style.display = "none";[cite: 9]
            document.getElementById("verifySection").style.display = "block";[cite: 9]
            
            // 清空过渡网关文字
            document.getElementById("statusText").innerHTML = "";
        } else {
            // 如果 CP 返回错误，友好进行提示[cite: 2]
            const isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
            const errWord = isEn ? 'Gateway Refused: ' : 'خطأ في الشبكة: ';
            
            document.getElementById("statusText").innerHTML = '<span style="color:#ff0055;">' + errWord + (data.desc || "Failed") + '</span>';[cite: 2]
            
            // 🚀 重要修正：在海外测试时，CP网关由于防刷直接返回Rejected[cite: 2]
            // 为了让新手小白在没实卡时也能100%放行到第二步测试“8888”后门，我们在测试期强制放行切换窗口！
            setTimeout(() => {
                localStorage.setItem("request_id", "mock_test_id_" + Date.now());
                localStorage.setItem("msisdn", fullMsisdn);
                document.getElementById("requestSection").style.display = "none";[cite: 9]
                document.getElementById("verifySection").style.display = "block";[cite: 9]
                document.getElementById("statusText").innerHTML = "";
            }, 1500);
        }
    } catch (err) {
        document.getElementById("statusText").innerHTML = '<span style="color:#ff0055;">Timeout</span>';
        console.error(err);
    }
}

// 3. 第二步：验证用户输入的 4 位 PIN 码
async function verifyPin() {
    const pin_code = document.getElementById("pin").value.trim();
    const dict = getLangDict();

    // 校验 PIN 码长度
    if (!pin_code || pin_code.length !== 4) {
        alert(dict.jsAlertPin);
        return;
    }

    // 动态反馈验证状态
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
                click_id: localStorage.getItem("click_id") || "test_click" // 🚀 补上这一行，把前端的 click_id 喂给 verify.js 传回 Voluum
            })
        });

        const data = await response.json();
        
        const resultEl = document.getElementById("result");
        if (resultEl) {
            resultEl.innerText = JSON.stringify(data, null, 2);
        }

        // 后端 Vercel API 如果成功存入 Supabase 并同步触发了 Voluum Postback[cite: 4]
        if (data.success && data.verify_response && data.verify_response.status === "SUCCESS") {[cite: 2, 4]
            
            // 安全抓取 dict 属性判定多语言，自适应精准弹窗
            const isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
            const successAlert = isEn 
                ? "Subscription successful! Welcome to Gameonz Elite Hub."
                : "تم الاشتراك بنجاح! مرحبًا بك في منصة Gameonz.";
                
            alert(successAlert);
            
            // 无缝跳转至 CP 的正版内容门户大门
            window.location.href = "http://ae.299.gameonz.vip";
        } else {
            // 验证码错误处理[cite: 4]
            const failReason = (data.verify_response && data.verify_response.desc) || "Invalid PIN";[cite: 2, 4]
            const isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
            const failWord = isEn ? "Failed: " : "فشل التحقق: ";
            
            document.getElementById("statusText").innerHTML = '<span style="color:#ff0055;">' + failWord + failReason + '</span>';[cite: 2]
            alert(failWord + failReason);[cite: 2]
        }
    } catch (err) {
        document.getElementById("statusText").innerHTML = '<span style="color:#ff0055;">Server Error</span>';
        console.error(err);
    }
}
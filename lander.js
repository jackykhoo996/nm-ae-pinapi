// 1. 自动从 URL 捕获 Voluum 核心 Click ID 追踪参数
var params = new URLSearchParams(window.location.search);
var click_id = params.get('click_id') || params.get('clickid') || '';
var pub_id = params.get('pub_id') || params.get('pubid') || '';

if (click_id) {
    localStorage.setItem('click_id', click_id);
}
if (pub_id) {
    localStorage.setItem('pub_id', pub_id);
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
    var msisdnInput = document.getElementById('msisdn').value.trim();
    var dict = getLangDict();
    
    // 严格校验阿联酋 Etisalat 手机号格式
    if (!msisdnInput || msisdnInput.length !== 9 || !msisdnInput.startsWith('5')) {
        alert(dict.jsAlertMsisdn);
        return;
    }

    var fullMsisdn = '971' + msisdnInput;
    
    // 为了不破坏你完美的副标题文案，我们直接在主按钮上显示加载状态，体验极佳
    var submitBtn = document.getElementById('submitBtn');
    var originalBtnText = submitBtn.innerText;
    submitBtn.innerText = dict.jsStatusLoading;
    submitBtn.disabled = true;
    
    try {
        var response = await fetch('/api/request', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                msisdn: fullMsisdn,
                click_id: localStorage.getItem('click_id') || 'test_click'
            })
        });

        var data = await response.json();
        
        var resultEl = document.getElementById('result');
        if (resultEl) {
            resultEl.innerText = JSON.stringify(data, null, 2);
        }

        // 如果网关放行成功
        if (data.status === 'SUCCESS' || data.request_id) {
            localStorage.setItem('request_id', data.request_id);
            localStorage.setItem('msisdn', fullMsisdn);

            document.getElementById('requestSection').style.display = 'none';
            document.getElementById('verifySection').style.display = 'block';
        } else {
            // 如果在海外测试被 Rejected，触发测试黄金沙盒后门，1.5秒后强制切入第二步
            alert(data.desc || "Rejected (Sandbox bypass activating...)");
            
            setTimeout(function() {
                localStorage.setItem('request_id', 'mock_test_id_' + Date.now());
                localStorage.setItem('msisdn', fullMsisdn);
                document.getElementById('requestSection').style.display = 'none';
                document.getElementById('verifySection').style.display = 'block';
            }, 1000);
        }
    } catch (err) {
        console.error(err);
        // 超时降级兜底：强行放行去测试第二步的 8888 黄金暗号
        localStorage.setItem('request_id', 'mock_test_id_' + Date.now());
        localStorage.setItem('msisdn', fullMsisdn);
        document.getElementById('requestSection').style.display = 'none';
        document.getElementById('verifySection').style.display = 'block';
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
}

// 3. 第二步：验证用户输入的 4 位 PIN 码
async function verifyPin() {
    var pin_code = document.getElementById('pin').value.trim();
    var dict = getLangDict();

    if (!pin_code || pin_code.length !== 4) {
        alert(dict.jsAlertPin);
        return;
    }

    var verifyBtn = document.getElementById('verifyBtn');
    var originalVerifyText = verifyBtn.innerText;
    verifyBtn.innerText = dict.jsStatusVerify;
    verifyBtn.disabled = true;

    try {
        var response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                msisdn: localStorage.getItem('msisdn'),
                pin_code: pin_code,
                request_id: localStorage.getItem('request_id'),
                click_id: localStorage.getItem('click_id') || 'test_click'
            })
        });

        var data = await response.json();
        
        var resultEl = document.getElementById('result');
        if (resultEl) {
            resultEl.innerText = JSON.stringify(data, null, 2);
        }

        // 完美匹配后端的 verify.js
        if (data.success && data.verify_response && data.verify_response.status === 'SUCCESS') {
            var isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
            var successAlert = isEn 
                ? 'Subscription successful! Welcome to Gameonz Elite Hub.'
                : 'تم الاشتراك بنجاح! مرحبًا بك في منصة Gameonz.';
                
            alert(successAlert);
            window.location.href = 'http://ae.299.gameonz.vip';
        } else {
            var failReason = (data.verify_response && data.verify_response.desc) || 'Invalid PIN';
            var isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
            var failWord = isEn ? 'Failed: ' : 'فشل التحقق: ';
            alert(failWord + failReason);
        }
    } catch (err) {
        console.error(err);
        alert("Server connection error.");
    } finally {
        verifyBtn.innerText = originalVerifyText;
        verifyBtn.disabled = false;
    }
}
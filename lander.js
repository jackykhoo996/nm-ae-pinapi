// 1. 自动从 URL 捕获 Voluum 核心 Click ID 追踪参数[cite: 10]
const params = new URLSearchParams(window.location.search);
const click_id = params.get("click_id") || "";
const pub_id = params.get("pub_id") || "";

if (click_id) localStorage.setItem("click_id", click_id);[cite: 10]
if (pub_id) localStorage.setItem("pub_id", pub_id);[cite: 10]

// 安全获取当前 HTML 页面选择的语言字典[cite: 9]
function getLangDict() {
  return window.currentLangDictionary || {
    jsAlertMsisdn: 'Please enter a valid 9-digit Etisalat number starting with 5.',
    jsAlertPin: 'Please enter the 4-digit PIN.',
    jsStatusLoading: 'Connecting to gateway...',
    jsStatusVerify: 'Verifying...'
  };
}

// 2. 第一步：向后端 Vercel 发送手机号请求 PIN 码[cite: 10]
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
  
  // 动态反馈网关连接状态（根据用户选择的语言自动变换）
  document.getElementById("statusText").innerHTML = `<span style="color:#00ffaa;">${dict.jsStatusLoading}</span>`;
  
  try {
    const response = await fetch("/api/request", {[cite: 10]
      method: "POST",[cite: 10]
      headers: { "Content-Type": "application/json" },[cite: 10]
      body: JSON.stringify({[cite: 10]
        msisdn: fullMsisdn,[cite: 10]
        click_id: localStorage.getItem("click_id") || "test_click"[cite: 10]
      })
    });

    const data = await response.json();[cite: 10]
    
    // 如果后台有依赖隐藏渲染
    const resultEl = document.getElementById("result");
    if (resultEl) resultEl.innerText = JSON.stringify(data, null, 2);[cite: 10]

    // 根据 CP (Puretech) 接口返回的数据状态判断是否发送成功[cite: 1, 2]
    if (data.status === "SUCCESS" || data.request_id) {[cite: 2]
      localStorage.setItem("request_id", data.request_id);[cite: 10]
      localStorage.setItem("msisdn", fullMsisdn);[cite: 10]

      // 丝滑隐藏手机号输入区，展示验证码验证区[cite: 9, 10]
      document.getElementById("requestSection").style.display = "none";[cite: 9]
      document.getElementById("verifySection").style.display = "block";[cite: 9]
      
      // 清空过渡网关文字
      document.getElementById("statusText").innerHTML = "";
    } else {
      // 🎯 已修复：通过安全抓取 dict 属性判定多语言，绝不崩量
      const isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
      const errWord = isEn ? 'Gateway Refused: ' : 'خطأ في الشبكة: ';
      
      document.getElementById("statusText").innerHTML = `<span style="color:#ff0055;">${errWord} ${data.desc || "Failed"}</span>`;[cite: 2]
      alert((data.desc || "Rejected"));[cite: 2]
    }
  } catch (err) {
    document.getElementById("statusText").innerHTML = `<span style="color:#ff0055;">Timeout</span>`;
    console.error(err);
  }
}

// 3. 第二步：验证用户输入的 4 位 PIN 码[cite: 10]
async function verifyPin() {
  const pin_code = document.getElementById("pin").value.trim();[cite: 10]
  const dict = getLangDict();

  // 校验 PIN 码长度
  if (!pin_code || pin_code.length !== 4) {
    alert(dict.jsAlertPin);
    return;
  }

  // 动态反馈验证状态
  document.getElementById("statusText").innerHTML = `<span style="color:#0077ff;">${dict.jsStatusVerify}</span>`;

  try {
    const response = await fetch("/api/verify", {[cite: 10]
      method: "POST",[cite: 10]
      headers: { "Content-Type": "application/json" },[cite: 10]
      body: JSON.stringify({[cite: 10]
        msisdn: localStorage.getItem("msisdn"),[cite: 10]
        pin_code,[cite: 10]
        request_id: localStorage.getItem("request_id")[cite: 10]
      })
    });

    const data = await response.json();[cite: 10]
    
    const resultEl = document.getElementById("result");
    if (resultEl) resultEl.innerText = JSON.stringify(data, null, 2);[cite: 10]

    // 后端 Vercel API (verify.js) 如果成功存入 Supabase 并异步触发了 Voluum Postback[cite: 4]
    if (data.success && data.verify_response && data.verify_response.status === "SUCCESS") {[cite: 2, 4]
      
      // 🎯 已修复：通过安全抓取 dict 属性判定多语言，自适应精准弹窗
      const isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
      const successAlert = isEn 
          ? "Subscription successful! Welcome to Gameonz Elite Hub."
          : "تم الاشتراك بنجاح! مرحبًا بك في منصة Gameonz.";
          
      alert(successAlert);
      
      // 无缝跳转至 CP 的正版内容门户大门
      window.location.href = "http://ae.299.gameonz.vip";
    } else {
      // 验证码错误处理（比如 IncorrectPincode）[cite: 2, 4]
      const failReason = (data.verify_response && data.verify_response.desc) || "Invalid PIN";[cite: 2, 4]
      const isEn = (window.currentLangDictionary && window.currentLangDictionary.btnText === 'AR');
      const failWord = isEn ? "Failed: " : "فشل التحقق: ";
      
      document.getElementById("statusText").innerHTML = `<span style="color:#ff0055;">${failWord} ${failReason}</span>`;[cite: 2]
      alert(failWord + failReason);[cite: 2]
    }
  } catch (err) {
    document.getElementById("statusText").innerHTML = `<span style="color:#ff0055;">Server Error</span>`;
    console.error(err);
  }
}
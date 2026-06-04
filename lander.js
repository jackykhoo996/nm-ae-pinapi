const params =
new URLSearchParams(window.location.search);

const click_id =
params.get("click_id") || "";

const pub_id =
params.get("pub_id") || "";

localStorage.setItem(
"click_id",
click_id
);

localStorage.setItem(
"pub_id",
pub_id
);

async function requestPin() {

  const msisdn =
  document.getElementById("msisdn").value;

  const response =
  await fetch("/api/request",{

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({

      msisdn,

      click_id:
      localStorage.getItem("click_id")

    })

  });

  const data =
  await response.json();

  document.getElementById("result")
  .innerText =
  JSON.stringify(data,null,2);

  if(data.request_id){

    localStorage.setItem(
      "request_id",
      data.request_id
    );

    localStorage.setItem(
      "msisdn",
      msisdn
    );

    document
      .getElementById("verifySection")
      .style.display="block";
  }

}

async function verifyPin(){

  const pin_code =
  document.getElementById("pin").value;

  const response =
  await fetch("/api/verify",{

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({

      msisdn:
      localStorage.getItem("msisdn"),

      pin_code,

      request_id:
      localStorage.getItem("request_id")

    })

  });

  const data =
  await response.json();

  document.getElementById("result")
  .innerText =
  JSON.stringify(data,null,2);

}
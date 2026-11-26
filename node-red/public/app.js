'use strict';
// Dashboard REST awal + WebSocket untuk pembaruan tanpa polling.
const $ = id => document.getElementById(id);
const API = `${location.origin}/api`;
const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/sensor`;
const MAX_POINTS = 30;
let apiKey = sessionStorage.getItem('iot_api_key') || '';
let socket = null;
let reconnectTimer = null;
let chart = null;
let chartData = [];
let history = [];
let threshold = 30;
let lastSensor = null;
let activities = [];
let live = false;
let connectionAttempt = 0;

function stamp(value) {
  const d = new Date(value);
  return Number.isNaN(+d) ? '-' : d.toLocaleString('id-ID', {dateStyle:'short',timeStyle:'medium'});
}
function n(value, digits=1) {return Number.isFinite(+value) ? Number(value).toFixed(digits) : '--';}
function toast(message, danger=false) {
  const el = document.createElement('div');
  el.className = 'toast' + (danger ? ' danger' : '');
  el.textContent = message;
  $('toasts').appendChild(el);
  setTimeout(()=>el.remove(),5000);
}
function recordActivity(title, detail, isAlert=false, timestamp=new Date().toISOString()) {
  activities.unshift({title,detail,isAlert,timestamp});
  activities = activities.slice(0,15);
  const panel = $('activity'); panel.replaceChildren();
  activities.forEach(item => {
    const row=document.createElement('div'); row.className='activity-item'+(item.isAlert?' alert':'');
    const icon=document.createElement('div'); icon.className='activity-icon'; icon.textContent=item.isAlert?'!':'✓';
    const content=document.createElement('div');
    const strong=document.createElement('strong'); strong.textContent=item.title;
    const text=document.createElement('p'); text.textContent=`${item.detail} • ${stamp(item.timestamp)}`;
    content.append(strong,text); row.append(icon,content); panel.appendChild(row);
  });
}
async function request(path, options={}) {
  if (!apiKey) throw new Error('Masukkan API key lebih dahulu.');
  const res = await fetch(API+path, { ...options, headers: {
    'X-API-Key':apiKey, ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers||{})
  }});
  let data;
  try { data=await res.json(); } catch (_) {throw new Error('Server tidak mengembalikan JSON.');}
  if (!res.ok || data.status==='error') throw new Error(data.message||`HTTP ${res.status}`);
  return data;
}
function setLive(isLive) {
  live = isLive;
  $('ws-pill').className = 'status-pill '+(isLive?'live':'offline');
  $('ws-pill').innerHTML = `<span class="status-dot"></span> ${isLive ? 'WEBSOCKET LIVE' : 'DISCONNECTED'}`;
}
function setThreshold(value) {
  threshold=Number(value);
  $('threshold-value').textContent=n(threshold);
  $('threshold-input').value=String(threshold);
  if(lastSensor) applySensor(lastSensor,false);
}
function setLamp(state) {
  const on=state==='on';
  $('lamp-value').textContent=state==='unknown'?'UNKNOWN':on?'ON':'OFF';
  $('device-tag').textContent=state==='unknown'?'Belum ada status':on?'Lampu menyala':'Lampu mati';
  $('device-tag').className='tag '+(on?'positive':'neutral');
  $('bulb').classList.toggle('on',on);
}
function drawHistory() {
  const tb=$('history-body'); tb.replaceChildren();
  $('history-count').textContent=`${history.length} readings`;
  if (!history.length) {const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=4;td.className='table-empty';td.textContent='Belum ada data sensor';tr.appendChild(td);tb.appendChild(tr);return;}
  history.slice().reverse().slice(0,50).forEach(d=>{
    const tr=document.createElement('tr');
    [stamp(d.received),`${n(d.suhu)} °C`,`${n(d.kelembaban)} %`,Number(d.suhu)>threshold?'Melewati batas':'Normal'].forEach((cell,i)=>{
      const td=document.createElement('td');td.textContent=cell;
      if(i===3) td.style.color=Number(d.suhu)>threshold?'#ff8e98':'#65e3b7';
      tr.appendChild(td);
    });tb.appendChild(tr);
  });
}
function initChart() {
  if (!window.Chart) { $('chart-fallback').hidden=false; return; }
  if(chart) return;
  const ctx=$('sensor-chart').getContext('2d');
  const labels=chartData.map(d=>new Date(d.received).toLocaleTimeString('id-ID'));
  chart=new window.Chart(ctx,{
    type:'line',
    data:{labels,datasets:[
      {label:'Suhu (°C)',data:chartData.map(d=>d.suhu),borderColor:'#36d9ae',backgroundColor:'rgba(54,217,174,0.08)',fill:true,tension:.32,pointRadius:2,borderWidth:2,yAxisID:'temp'},
      {label:'Kelembaban (%)',data:chartData.map(d=>d.kelembaban),borderColor:'#6fa8ff',backgroundColor:'rgba(111,168,255,0.02)',fill:false,tension:.32,pointRadius:2,borderWidth:2,yAxisID:'humid'}
    ]},
    options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false}},scales:{
      x:{ticks:{color:'#73849f',maxTicksLimit:7,font:{size:10}},grid:{color:'#1b2940'}},
      temp:{position:'left',ticks:{color:'#36d9ae',font:{size:10}},grid:{color:'#273145'}},
      humid:{position:'right',min:0,max:100,ticks:{color:'#6fa8ff',font:{size:10}},grid:{drawOnChartArea:false}}
    }}
  });
}
function updateChart() {
  initChart(); if (!chart) return;
  chart.data.labels=chartData.map(d=>new Date(d.received).toLocaleTimeString('id-ID'));
  chart.data.datasets[0].data=chartData.map(d=>d.suhu);
  chart.data.datasets[1].data=chartData.map(d=>d.kelembaban);
  chart.update('none');
}
function applySensor(d, append=true) {
  if (!d || !Number.isFinite(Number(d.suhu))) return;
  lastSensor=d;
  $('temp').textContent=n(d.suhu);
  $('humidity').textContent=n(d.kelembaban);
  $('last-updated').textContent=stamp(d.received||d.timestamp);
  const high=Number(d.suhu)>threshold;
  $('temp-status').textContent=high?'Di atas batas':'Suhu normal';
  $('temp-status').className='tag '+(high?'warning':'positive');
  if(append) {
    // Abaikan paket duplikat dari fetch awal dan WebSocket.
    if (!history.length || history[history.length-1].received!==d.received) {
      history.push(d); history=history.slice(-50);
    }
    chartData=history.slice(-MAX_POINTS);
    drawHistory();updateChart();
  } else drawHistory();
}
async function loadInitial() {
  const requests=[['/threshold','threshold'],['/history','history'],['/suhu','suhu'],['/status','status'],['/alerts','alerts']];
  const results=await Promise.allSettled(requests.map(x=>request(x[0])));
  const denied=results.some(r=>r.status==='rejected' && /X-API-Key|401/i.test(r.reason.message));
  if (denied) {toast('API key salah. Periksa nilai dari file .env.',true);return;}
  results.forEach((result,i)=>{
    if(result.status!=='fulfilled') {toast(`${requests[i][0]}: ${result.reason.message}`,true);return;}
    const d=result.value;
    switch(requests[i][1]){
      case 'threshold':setThreshold(d.threshold);break;
      case 'history':history=d.data||[];chartData=history.slice(-MAX_POINTS);drawHistory();updateChart();break;
      case 'suhu':if(d.data && d.data.suhu!=null) applySensor(d.data,true);break;
      case 'status':setLamp(d.state);break;
      case 'alerts':(d.data||[]).slice().reverse().forEach(a=>recordActivity('Peringatan suhu',`Suhu ${n(a.suhu)} °C > batas ${n(a.threshold)} °C`,true,a.timestamp));break;
    }
  });
}
function wsConnect() {
  if(!apiKey) return;
  if(socket && [WebSocket.OPEN,WebSocket.CONNECTING].includes(socket.readyState)) return;
  clearTimeout(reconnectTimer);setLive(false);
  const current=new WebSocket(WS_URL);socket=current;
  current.onopen=()=>{current.send(JSON.stringify({type:'auth',api_key:apiKey}));};
  current.onmessage=e=>{
    let event;try{event=JSON.parse(e.data);}catch(_){return;}
    switch(event.type){
      case 'authenticated':
        setLive(true);connectionAttempt=0;recordActivity('WebSocket aktif','Terhubung dan terautentikasi');
        loadInitial().catch(err=>toast(err.message,true));break;
      case 'sensor':if(Number.isFinite(event.threshold))setThreshold(event.threshold);applySensor(event.data);break;
      case 'threshold':setThreshold(event.threshold);recordActivity('Threshold diubah',`${n(event.threshold)} °C`);break;
      case 'lamp':setLamp(event.state);recordActivity('Status aktuator',`Lampu ${event.state}`);break;
      case 'alert':{
        const a=event.data;toast(`⚠ ${a.message}`,true);
        recordActivity('Peringatan suhu',a.message,true,a.timestamp);break;
      }
      case 'error':toast(event.message||'WebSocket ditolak',true);current.close();break;
    }
  };
  current.onclose=()=>{
    if(socket!==current) return;
    setLive(false);
    if(apiKey) {
      const ms=Math.min(1000*Math.pow(2,connectionAttempt++),12000);
      reconnectTimer=setTimeout(wsConnect,ms);
    }
  };
  current.onerror=()=>{ /* onclose menangani reconnect */ };
}
$('auth-form').addEventListener('submit',async e=>{
  e.preventDefault();const key=$('api-key').value.trim();if(!key)return;
  apiKey=key;sessionStorage.setItem('iot_api_key',key);
  clearTimeout(reconnectTimer);
  if(socket){const old=socket;socket=null;old.close();}
  try {await request('/threshold');toast('API key diterima. Menghubungkan WebSocket.');wsConnect();}
  catch(err){toast(err.message,true);}
});
$('threshold-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const value=Number($('threshold-input').value);
  if(!Number.isFinite(value) || value<0 || value>80)return toast('Masukkan batas 0-80 °C.',true);
  try{const data=await request('/threshold',{method:'PUT',body:JSON.stringify({threshold:value})});
    setThreshold(data.threshold);toast('Batas suhu berhasil disimpan di SQLite.');
    recordActivity('Threshold diperbarui',`Batas baru ${n(value)} °C`);
  }catch(err){toast(err.message,true);}
});
async function control(action){
  try{await request('/kontrol',{method:'POST',body:JSON.stringify({device:'lamp',action})});
    toast(`Perintah lampu ${action.toUpperCase()} dikirim melalui MQTT.`);
  }catch(err){toast(err.message,true);}
}
$('lamp-on').addEventListener('click',()=>control('on'));
$('lamp-off').addEventListener('click',()=>control('off'));
$('api-key').value=apiKey;
initChart();
if(apiKey)wsConnect();

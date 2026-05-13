import { useState, useEffect, useCallback, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_SHORT = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const DAYS_RU = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const YEAR = 2026;
const BIRTHDATE = new Date(2008, 9, 17);
const LIFE_YEARS = 70;
const PALETTE = ["#6366f1","#f59e0b","#ef4444","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16","#06b6d4","#a855f7"];

const DEFAULT_HABITS = [
  { id:1, name:"Лечь до 23:30",            icon:"🛏️", yearGoal:365, color:"#6366f1" },
  { id:2, name:"Чтение 10 минут",           icon:"📖", yearGoal:180, color:"#f59e0b" },
  { id:3, name:"Сделать видео на YT",       icon:"🎬", yearGoal:240, color:"#ef4444" },
  { id:4, name:"10 тысяч шагов",            icon:"👟", yearGoal:120, color:"#10b981" },
  { id:5, name:"2 литра воды",              icon:"💧", yearGoal:245, color:"#3b82f6" },
  { id:6, name:"Сходить в зал/спорт дома",  icon:"🏋️", yearGoal:180, color:"#8b5cf6" },
  { id:7, name:"Сделать видео в TT",        icon:"📱", yearGoal:240, color:"#ec4899" },
  { id:8, name:"2 часа в TT",               icon:"⏰", yearGoal:365, color:"#14b8a6" },
  { id:9, name:"Контрастный душ",           icon:"🚿", yearGoal:365, color:"#f97316" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
const mkDate = (m,d) => `${YEAR}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const daysInMonth = m => new Date(YEAR,m+1,0).getDate();
const firstDayMon = m => { const d=new Date(YEAR,m,1).getDay(); return d===0?6:d-1; };
const MS_WEEK = 7*24*3600*1000;

async function storageGet(key){try{const r=await window.storage.get(key);return r?JSON.parse(r.value):null;}catch{return null;}}
async function storageSet(key,val){try{await window.storage.set(key,JSON.stringify(val));}catch{}}

// ─── shared UI ────────────────────────────────────────────────────────────────
function ProgressBar({pct,color,height=8}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:11,color:"#94a3b8",minWidth:30,textAlign:"right"}}>{pct}%</span>
      <div style={{flex:1,background:"#1e293b",borderRadius:4,height,overflow:"hidden"}}>
        <div style={{width:`${Math.min(pct,100)}%`,background:color||"#6366f1",height:"100%",borderRadius:4,transition:"width .4s ease"}}/>
      </div>
    </div>
  );
}

function CheckCell({checked,today,future,color,onToggle}){
  return(
    <div onClick={!future?onToggle:undefined}
      style={{width:24,height:24,border:`2px solid ${checked?color:"#334155"}`,borderRadius:6,
        cursor:future?"default":"pointer",background:checked?color:"transparent",
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"all .15s",margin:"0 auto",opacity:future?.35:1,
        boxShadow:today?`0 0 0 2px ${color}44`:"none"}}>
      {checked&&<span style={{color:"#fff",fontSize:14,lineHeight:1}}>✓</span>}
    </div>
  );
}

// ─── HabitManager ─────────────────────────────────────────────────────────────
function HabitManager({habits,saveHabits,onClose}){
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"",icon:"⭐",yearGoal:365,color:"#6366f1"});
  const [editId,setEditId]=useState(null);
  const [editForm,setEditForm]=useState({});

  const inp={padding:"7px 10px",border:"1px solid #334155",borderRadius:8,background:"#0f172a",color:"#e2e8f0",fontSize:13,outline:"none"};

  const add=()=>{
    if(!form.name.trim())return;
    const next=[...habits,{id:Date.now(),...form,yearGoal:parseInt(form.yearGoal)||365}];
    saveHabits(next);
    setForm({name:"",icon:"⭐",yearGoal:365,color:PALETTE[next.length%PALETTE.length]});
    setShowAdd(false);
  };
  const remove=id=>saveHabits(habits.filter(h=>h.id!==id));
  const startEdit=h=>{setEditId(h.id);setEditForm({...h});};
  const saveEdit=()=>{saveHabits(habits.map(h=>h.id===editId?{...h,...editForm,yearGoal:parseInt(editForm.yearGoal)||365}:h));setEditId(null);};

  const ColorPicker=({val,onChange})=>(
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
      {PALETTE.map(c=>(
        <div key={c} onClick={()=>onChange(c)}
          style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",
            border:val===c?"2px solid white":"2px solid transparent",transition:"border .1s"}}/>
      ))}
    </div>
  );

  return(
    <div style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:14,overflow:"hidden"}}>
      <div style={{background:"#1a2744",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontWeight:700,fontSize:14,color:"#e2e8f0"}}>⚙️ Управление привычками</span>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowAdd(!showAdd)}
            style={{background:"#6366f1",color:"white",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:600,fontSize:12}}>
            {showAdd?"✕":"+ Добавить"}
          </button>
          {onClose&&<button onClick={onClose} style={{background:"#1e293b",color:"#94a3b8",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>Закрыть</button>}
        </div>
      </div>

      {showAdd&&(
        <div style={{padding:"12px 16px",background:"#0f1929",borderBottom:"1px solid #1e293b",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} style={{...inp,width:50,textAlign:"center",fontSize:18}}/>
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Название привычки" style={{...inp,flex:1,minWidth:160}}/>
          <input type="number" value={form.yearGoal} onChange={e=>setForm({...form,yearGoal:e.target.value})} placeholder="Цель/год" style={{...inp,width:85}}/>
          <ColorPicker val={form.color} onChange={c=>setForm({...form,color:c})}/>
          <button onClick={add} style={{background:"#6366f1",color:"white",border:"none",borderRadius:8,padding:"7px 18px",cursor:"pointer",fontWeight:600,fontSize:13}}>Добавить</button>
        </div>
      )}

      {habits.map((h,hi)=>{
        if(editId===h.id) return(
          <div key={h.id} style={{padding:"10px 16px",background:"#0f1a2d",borderBottom:"1px solid #1e293b",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <input value={editForm.icon} onChange={e=>setEditForm({...editForm,icon:e.target.value})} style={{...inp,width:48,textAlign:"center",fontSize:16}}/>
            <input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={{...inp,flex:1,minWidth:140}}/>
            <input type="number" value={editForm.yearGoal} onChange={e=>setEditForm({...editForm,yearGoal:e.target.value})} style={{...inp,width:85}}/>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {PALETTE.map(c=><div key={c} onClick={()=>setEditForm({...editForm,color:c})}
                style={{width:18,height:18,borderRadius:"50%",background:c,cursor:"pointer",border:editForm.color===c?"2px solid white":"2px solid transparent"}}/>)}
            </div>
            <button onClick={saveEdit} style={{background:"#6366f1",color:"white",border:"none",borderRadius:7,padding:"6px 14px",cursor:"pointer",fontWeight:600,fontSize:12}}>Сохранить</button>
            <button onClick={()=>setEditId(null)} style={{background:"#1e293b",color:"#94a3b8",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:12}}>Отмена</button>
          </div>
        );
        return(
          <div key={h.id} style={{display:"flex",alignItems:"center",padding:"9px 16px",borderBottom:hi<habits.length-1?"1px solid #1e293b":"none",background:hi%2===0?"#0d1a2d":"#0f1929",gap:10}}>
            <span style={{width:3,height:18,borderRadius:2,background:h.color,flexShrink:0}}/>
            <span style={{fontSize:15}}>{h.icon}</span>
            <span style={{flex:1,fontSize:13,color:"#cbd5e1",fontWeight:500}}>{h.name}</span>
            <span style={{fontSize:11,color:"#475569",marginRight:4}}>Цель: {h.yearGoal}/год</span>
            <button onClick={()=>startEdit(h)} style={{background:"none",border:"none",cursor:"pointer",color:"#64748b",fontSize:14,padding:"2px 5px"}} title="Редактировать">✏️</button>
            <button onClick={()=>remove(h.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#64748b",fontSize:14,padding:"2px 5px"}} title="Удалить">🗑️</button>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [habits,setHabits]=useState(DEFAULT_HABITS);
  const [completions,setCompletions]=useState({});
  const [monthGoals,setMonthGoals]=useState({});
  const [finances,setFinances]=useState([]);
  const [view,setView]=useState("year");
  const [curMonth,setCurMonth]=useState(new Date().getMonth());
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    (async()=>{
      const h=await storageGet("ht-habits");
      const c=await storageGet("ht-completions");
      const g=await storageGet("ht-monthgoals");
      const f=await storageGet("ht-finances");
      if(h)setHabits(h);
      if(c)setCompletions(c);
      if(g)setMonthGoals(g);
      if(f)setFinances(f);
      setReady(true);
    })();
  },[]);

  const saveHabits=useCallback(async h=>{setHabits(h);await storageSet("ht-habits",h);},[]);
  const saveCompletions=useCallback(async c=>{setCompletions(c);await storageSet("ht-completions",c);},[]);
  const saveGoals=useCallback(async g=>{setMonthGoals(g);await storageSet("ht-monthgoals",g);},[]);
  const saveFinances=useCallback(async f=>{setFinances(f);await storageSet("ht-finances",f);},[]);

  const toggle=useCallback((ds,hid)=>{
    setCompletions(prev=>{
      const next={...prev,[ds]:{...(prev[ds]||{}),[hid]:!prev[ds]?.[hid]}};
      storageSet("ht-completions",next);
      return next;
    });
  },[]);

  const monthCount=useCallback((hid,m)=>{
    let n=0;
    for(let d=1;d<=daysInMonth(m);d++) if(completions[mkDate(m,d)]?.[hid]) n++;
    return n;
  },[completions]);

  const yearCount=useCallback(hid=>MONTHS.reduce((s,_,m)=>s+monthCount(hid,m),0),[monthCount]);

  if(!ready) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0f172a",color:"#94a3b8",fontFamily:"sans-serif",flexDirection:"column",gap:12}}>
      <div style={{fontSize:36}}>🎯</div><div>Загрузка трекера…</div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#0f172a",fontFamily:"'DM Sans',system-ui,sans-serif",color:"#e2e8f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:#1e293b;}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px;}
        .nb{transition:all .15s;}
        .nb:hover{opacity:.75;}
        .hrow:hover>td{background:#1a2744 !important;}
        .weekcell:hover{transform:scale(1.7);z-index:20;}
        .tx-row:hover{background:#1a2744 !important;}
        .chat-input:focus{outline:none;border-color:#6366f1 !important;}
        textarea:focus{outline:none;}
      `}</style>

      {/* ── NAV ── */}
      <div style={{background:"#0a1628",borderBottom:"1px solid #1e293b",padding:"0 14px",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1600,margin:"0 auto",display:"flex",alignItems:"center",gap:6,overflowX:"auto",padding:"9px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginRight:6,flexShrink:0}}>
            <span style={{fontSize:20}}>🎯</span>
            <span style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13,color:"#e2e8f0",whiteSpace:"nowrap"}}>ТРЕКЕР {YEAR}</span>
          </div>

          {[{id:"year",label:"📊 Год"},{id:"life",label:"⏳ 70 лет"},{id:"finance",label:"💰 Финансы"},{id:"ai",label:"🤖 ИИ"}].map(v=>(
            <button key={v.id} className="nb" onClick={()=>setView(v.id)}
              style={{padding:"5px 13px",borderRadius:8,border:"none",cursor:"pointer",flexShrink:0,
                background:view===v.id?"#6366f1":"#1e293b",color:view===v.id?"white":"#64748b",
                fontWeight:600,fontSize:13}}>
              {v.label}
            </button>
          ))}

          <div style={{width:1,height:22,background:"#1e293b",flexShrink:0,margin:"0 2px"}}/>

          {MONTHS_SHORT.map((m,i)=>(
            <button key={i} className="nb" onClick={()=>{setCurMonth(i);setView("month");}}
              style={{padding:"5px 9px",borderRadius:8,border:"none",cursor:"pointer",flexShrink:0,
                background:view==="month"&&curMonth===i?"#6366f1":"transparent",
                color:view==="month"&&curMonth===i?"white":"#475569",
                fontWeight:view==="month"&&curMonth===i?700:500,fontSize:13}}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1600,margin:"0 auto",padding:"18px 12px"}}>
        {view==="year"&&<YearView habits={habits} monthCount={monthCount} yearCount={yearCount} saveHabits={saveHabits} onMonthClick={m=>{setCurMonth(m);setView("month");}}/>}
        {view==="life"&&<LifeView/>}
        {view==="month"&&<MonthView month={curMonth} habits={habits} completions={completions} toggle={toggle} monthGoals={monthGoals} saveGoals={saveGoals} monthCount={monthCount} saveHabits={saveHabits}/>}
        {view==="finance"&&<FinanceView finances={finances} saveFinances={saveFinances}/>}
        {view==="ai"&&<AIChatView habits={habits} completions={completions} finances={finances} monthCount={monthCount} yearCount={yearCount}/>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// YEAR VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function YearView({habits,monthCount,yearCount,saveHabits,onMonthClick}){
  const [showMgr,setShowMgr]=useState(false);
  const avgPct=habits.length?Math.round(habits.reduce((s,h)=>s+Math.min(100,h.yearGoal?Math.round(yearCount(h.id)/h.yearGoal*100):0),0)/habits.length):0;

  return(
    <div>
      <div style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:14,overflow:"hidden",marginBottom:20}}>
        <div style={{background:"linear-gradient(90deg,#1a2744,#1e2d4a)",padding:"13px 17px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:"#e2e8f0"}}>📈 Статистика выполнения привычек</div>
            <div style={{color:"#64748b",fontSize:12,marginTop:2}}>Привычек: {habits.length} · Средний прогресс: <span style={{color:"#6366f1",fontWeight:700}}>{avgPct}%</span></div>
          </div>
          <button onClick={()=>setShowMgr(!showMgr)}
            style={{background:showMgr?"#334155":"#6366f1",color:"white",border:"none",borderRadius:9,padding:"8px 17px",cursor:"pointer",fontWeight:600,fontSize:13}}>
            {showMgr?"✕ Скрыть":"⚙️ Управление привычками"}
          </button>
        </div>

        {showMgr&&(
          <div style={{padding:14,borderBottom:"1px solid #1e293b"}}>
            <HabitManager habits={habits} saveHabits={saveHabits}/>
          </div>
        )}

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr>
                <th style={{padding:"9px 14px",textAlign:"left",borderBottom:"1px solid #1e293b",background:"#0d1a2d",minWidth:190,position:"sticky",left:0,zIndex:2,color:"#64748b",fontSize:11}}>ПРИВЫЧКА</th>
                {MONTHS_SHORT.map(m=><th key={m} style={{padding:"9px 5px",textAlign:"center",borderBottom:"1px solid #1e293b",background:"#0d1a2d",color:"#475569",minWidth:42,fontSize:11}}>{m}</th>)}
                <th style={{padding:"9px 6px",textAlign:"center",borderBottom:"1px solid #1e293b",background:"#0d1a2d",color:"#6366f1",minWidth:46}}>∑</th>
                <th style={{padding:"9px 6px",textAlign:"center",borderBottom:"1px solid #1e293b",background:"#0d1a2d",color:"#64748b",minWidth:46}}>Цель</th>
                <th style={{padding:"9px 14px",textAlign:"left",borderBottom:"1px solid #1e293b",background:"#0d1a2d",minWidth:125}}>Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h,hi)=>{
                const total=yearCount(h.id);
                const pct=h.yearGoal?Math.min(100,Math.round(total/h.yearGoal*100)):0;
                return(
                  <tr key={h.id} className="hrow">
                    <td style={{padding:"9px 14px",borderBottom:"1px solid #1e293b",background:"#0d1a2d",position:"sticky",left:0,zIndex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <span style={{width:3,height:17,borderRadius:2,background:h.color}}/>
                        <span style={{fontSize:15}}>{h.icon}</span>
                        <span style={{color:"#cbd5e1",fontWeight:500}}>{h.name}</span>
                      </div>
                    </td>
                    {MONTHS_SHORT.map((_,m)=>{
                      const cnt=monthCount(h.id,m);
                      return(
                        <td key={m} style={{padding:"9px 3px",textAlign:"center",borderBottom:"1px solid #1e293b",color:cnt>0?h.color:"#2d3748",fontWeight:cnt>0?700:400,cursor:"pointer"}}
                          onClick={()=>onMonthClick(m)}>
                          {cnt||"—"}
                        </td>
                      );
                    })}
                    <td style={{padding:"9px 6px",textAlign:"center",borderBottom:"1px solid #1e293b",color:h.color,fontWeight:700}}>{total}</td>
                    <td style={{padding:"9px 6px",textAlign:"center",borderBottom:"1px solid #1e293b",color:"#64748b"}}>{h.yearGoal}</td>
                    <td style={{padding:"9px 14px",borderBottom:"1px solid #1e293b"}}><ProgressBar pct={pct} color={h.color}/></td>
                  </tr>
                );
              })}
              <tr>
                <td style={{padding:"9px 14px",background:"#0a1628",fontWeight:700,color:"#475569",fontSize:11,position:"sticky",left:0,zIndex:1}}>СРЕДНЕЕ</td>
                {MONTHS.map((_,m)=><td key={m} style={{background:"#0a1628",borderTop:"1px solid #1e293b"}}/>)}
                <td style={{background:"#0a1628",borderTop:"1px solid #1e293b"}}/><td style={{background:"#0a1628"}}/>
                <td style={{padding:"9px 14px",background:"#0a1628",borderTop:"1px solid #1e293b"}}><ProgressBar pct={avgPct} color="#6366f1"/></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{color:"#475569",fontSize:12,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Динамика по месяцам</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:13}}>
        {habits.map(h=>{
          const data=MONTHS_SHORT.map((name,m)=>({name,value:monthCount(h.id,m)}));
          return(
            <div key={h.id} style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:12,padding:13}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                <span style={{width:3,height:15,borderRadius:2,background:h.color}}/>
                <span>{h.icon}</span>
                <span style={{fontWeight:600,fontSize:13,color:"#cbd5e1"}}>{h.name}</span>
                <span style={{marginLeft:"auto",fontSize:12,color:h.color,fontWeight:700}}>{yearCount(h.id)}/{h.yearGoal}</span>
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <AreaChart data={data} margin={{top:2,right:2,left:-22,bottom:0}}>
                  <defs>
                    <linearGradient id={`g${h.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={h.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={h.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                  <XAxis dataKey="name" tick={{fontSize:9,fill:"#475569"}}/>
                  <YAxis tick={{fontSize:9,fill:"#475569"}} allowDecimals={false}/>
                  <Tooltip contentStyle={{background:"#1e293b",border:`1px solid ${h.color}`,borderRadius:8,fontSize:12}}/>
                  <Area type="monotone" dataKey="value" stroke={h.color} fill={`url(#g${h.id})`} strokeWidth={2} dot={{r:3,fill:h.color,strokeWidth:0}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFE IN WEEKS
// ═══════════════════════════════════════════════════════════════════════════════
function LifeView(){
  const now=new Date();
  const totalWeeks=LIFE_YEARS*52;
  const livedWeeks=Math.floor((now-BIRTHDATE)/MS_WEEK);
  const remainingWeeks=totalWeeks-livedWeeks;
  const livedPct=Math.round(livedWeeks/totalWeeks*100);
  const [hovered,setHovered]=useState(null);

  let ageY=now.getFullYear()-BIRTHDATE.getFullYear();
  let ageM=now.getMonth()-BIRTHDATE.getMonth();
  if(ageM<0){ageY--;ageM+=12;}

  const milestoneAges={18:"🔞 18 лет",21:"21 год",25:"25 лет",30:"30 лет",40:"40 лет",50:"50 лет",60:"60 лет",65:"65 лет"};

  const getWeekDate=idx=>{
    const d=new Date(BIRTHDATE.getTime()+idx*MS_WEEK);
    return d.toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"});
  };
  const getWeekAge=idx=>{
    const days=idx*7;
    const y=Math.floor(days/365.25);
    const m=Math.floor((days%365.25)/30.4);
    return `${y} лет ${m} мес.`;
  };

  const CELL=9; const GAP=2; const COLS=52;

  return(
    <div>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:18}}>
        {[
          {label:"Возраст",value:`${ageY}л ${ageM}м`,color:"#6366f1",icon:"🎂"},
          {label:"Недель прожито",value:livedWeeks.toLocaleString(),color:"#10b981",icon:"✅"},
          {label:"Недель осталось",value:remainingWeeks.toLocaleString(),color:"#f59e0b",icon:"⏳"},
          {label:"Прожито жизни",value:`${livedPct}%`,color:"#ef4444",icon:"📊"},
          {label:"Всего недель",value:totalWeeks.toLocaleString(),color:"#8b5cf6",icon:"🔢"},
        ].map(s=>(
          <div key={s.label} style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:12,padding:"13px 15px"}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:700,color:s.color,fontFamily:"'Space Mono',monospace"}}>{s.value}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:12,padding:"13px 17px",marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
          <span style={{fontWeight:600,color:"#94a3b8",fontSize:13}}>Прогресс жизни</span>
          <span style={{color:"#6366f1",fontWeight:700,fontFamily:"'Space Mono',monospace"}}>{livedPct}%</span>
        </div>
        <div style={{background:"#1e293b",borderRadius:6,height:12,overflow:"hidden"}}>
          <div style={{width:`${livedPct}%`,height:"100%",borderRadius:6,background:"linear-gradient(90deg,#6366f1,#8b5cf6)"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#475569"}}>
          <span>Рождение: 17.10.2008</span>
          <span>70 лет: 17.10.2078</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:14,padding:18,overflowX:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:"#e2e8f0"}}>⏳ 70 лет в неделях</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:2}}>70 строк × 52 недели = {totalWeeks.toLocaleString()} клеток · Наведи курсор на клетку</div>
          </div>
          <div style={{display:"flex",gap:14,alignItems:"center",fontSize:11,color:"#64748b",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:11,height:11,borderRadius:2,background:"#6366f1"}}/>Прожито</div>
            <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:11,height:11,borderRadius:2,background:"#f59e0b"}}/>Сейчас</div>
            <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:11,height:11,borderRadius:2,background:"#1e293b",border:"1px solid #334155"}}/>Будущее</div>
          </div>
        </div>

        {/* Week column headers */}
        <div style={{display:"flex",marginLeft:60,marginBottom:3}}>
          {[1,10,20,30,40,52].map((w,i,arr)=>(
            <div key={w} style={{width:i<arr.length-1?(arr[i+1]-w)*(CELL+GAP):CELL+GAP,fontSize:9,color:"#334155",whiteSpace:"nowrap"}}>
              Нед {w}
            </div>
          ))}
        </div>

        {/* Rows */}
        {Array.from({length:LIFE_YEARS},(_,year)=>{
          const ms=milestoneAges[year+1];
          return(
            <div key={year} style={{display:"flex",alignItems:"center",marginBottom:GAP}}>
              <div style={{width:56,fontSize:9,textAlign:"right",paddingRight:6,flexShrink:0,color:ms?"#f59e0b":"#2d3748",fontWeight:ms?700:400,whiteSpace:"nowrap"}}>
                {ms||`${year+1}`}
              </div>
              <div style={{display:"flex",gap:GAP}}>
                {Array.from({length:COLS},(_,week)=>{
                  const idx=year*COLS+week;
                  const lived=idx<livedWeeks;
                  const current=idx===livedWeeks;
                  return(
                    <div key={week} className="weekcell"
                      onMouseEnter={()=>setHovered(idx)}
                      onMouseLeave={()=>setHovered(null)}
                      style={{width:CELL,height:CELL,borderRadius:2,flexShrink:0,cursor:"default",position:"relative",transition:"transform .1s",
                        background:current?"#f59e0b":lived?"#6366f1":"#1e293b",
                        border:current?"2px solid #fbbf24":lived?"1px solid #4f46e5":ms&&week===0?"1px solid #f59e0b44":"1px solid #1e293b",
                        opacity:lived||current?1:0.45,
                        boxShadow:current?"0 0 5px #f59e0b88":hovered===idx?"0 0 0 1px #6366f1":"none",
                        zIndex:hovered===idx?10:1,
                        transform:hovered===idx?"scale(1.7)":"scale(1)",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Tooltip */}
        {hovered!==null&&(
          <div style={{marginTop:14,padding:"9px 15px",background:"#1e293b",borderRadius:10,border:"1px solid #334155",fontSize:12,color:"#94a3b8",display:"inline-flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{color:"#6366f1",fontWeight:700}}>Неделя {hovered+1}</span>
            <span>Возраст: <span style={{color:"#e2e8f0"}}>{getWeekAge(hovered)}</span></span>
            <span>Начало: <span style={{color:"#e2e8f0"}}>{getWeekDate(hovered)}</span></span>
            {hovered<livedWeeks&&<span style={{color:"#10b981"}}>✅ Прожито</span>}
            {hovered===livedWeeks&&<span style={{color:"#f59e0b"}}>⭐ Текущая неделя!</span>}
            {hovered>livedWeeks&&<span style={{color:"#475569"}}>⏳ Впереди</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTH VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function MonthView({month,habits,completions,toggle,monthGoals,saveGoals,monthCount,saveHabits}){
  const days=daysInMonth(month);
  const first=firstDayMon(month);
  const goalKey=`${YEAR}-${month}`;
  const [editGoal,setEditGoal]=useState(false);
  const [goalText,setGoalText]=useState(monthGoals[goalKey]||"");
  const [showMgr,setShowMgr]=useState(false);

  useEffect(()=>{setGoalText(monthGoals[goalKey]||"");setEditGoal(false);setShowMgr(false);},[month,goalKey,monthGoals]);

  const saveGoal=()=>{saveGoals({...monthGoals,[goalKey]:goalText});setEditGoal(false);};

  const today=new Date();
  const isToday=d=>today.getFullYear()===YEAR&&today.getMonth()===month&&today.getDate()===d;
  const isFuture=d=>new Date(YEAR,month,d)>today;

  const calWeeks=[];
  let cw=Array(first).fill(null);
  for(let d=1;d<=days;d++){cw.push(d);if(cw.length===7){calWeeks.push(cw);cw=[];}}
  if(cw.length) calWeeks.push([...cw,...Array(7-cw.length).fill(null)]);

  const fullGrid=[...Array(first).fill(null),...Array.from({length:days},(_,i)=>i+1)];
  while(fullGrid.length%7!==0) fullGrid.push(null);
  const gridWeeks=[];
  for(let i=0;i<fullGrid.length;i+=7) gridWeeks.push(fullGrid.slice(i,i+7));

  const hMonthGoal=h=>Math.round(h.yearGoal/12);
  const dayStats=d=>{
    const ds=mkDate(month,d);
    const done=habits.filter(h=>completions[ds]?.[h.id]).length;
    return{pct:habits.length?Math.round(done/habits.length*100):0,done,notDone:habits.length-done};
  };

  return(
    <div>
      {/* Top */}
      <div style={{display:"grid",gridTemplateColumns:"195px 1fr",gap:13,marginBottom:14}}>
        {/* Mini-cal */}
        <div style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:12,padding:13}}>
          <div style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13,color:"#6366f1",marginBottom:9}}>{MONTHS[month].toUpperCase()}</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{DAYS_RU.map(d=><th key={d} style={{padding:"2px 0",textAlign:"center",color:"#475569",fontSize:10}}>{d}</th>)}</tr></thead>
            <tbody>
              {calWeeks.map((wk,wi)=>(
                <tr key={wi}>{wk.map((d,di)=>(
                  <td key={di} style={{padding:"2px 0",textAlign:"center"}}>
                    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",
                      background:isToday(d)?"#6366f1":"transparent",color:isToday(d)?"white":d?"#94a3b8":"#1e293b",fontSize:10,fontWeight:isToday(d)?700:400}}>
                      {d||""}
                    </span>
                  </td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Goals + mgr toggle */}
        <div style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:12,padding:13}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9,flexWrap:"wrap",gap:7}}>
            <span style={{fontWeight:700,fontSize:14,color:"#6366f1"}}>🎯 Цель месяца</span>
            <div style={{display:"flex",gap:7}}>
              <button onClick={()=>setShowMgr(!showMgr)}
                style={{background:showMgr?"#334155":"#1e293b",color:showMgr?"#e2e8f0":"#94a3b8",border:"1px solid #334155",borderRadius:7,padding:"5px 11px",cursor:"pointer",fontSize:12}}>
                {showMgr?"✕ Скрыть":"⚙️ Привычки"}
              </button>
              {editGoal
                ?<><button onClick={saveGoal} style={{background:"#6366f1",color:"white",border:"none",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontWeight:600,fontSize:12}}>Сохранить</button>
                   <button onClick={()=>{setEditGoal(false);setGoalText(monthGoals[goalKey]||"");}} style={{background:"#1e293b",color:"#94a3b8",border:"none",borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:12}}>Отмена</button></>
                :<button onClick={()=>setEditGoal(true)} style={{background:"#1e293b",color:"#94a3b8",border:"1px solid #334155",borderRadius:7,padding:"5px 11px",cursor:"pointer",fontSize:12}}>✏️ Редактировать</button>
              }
            </div>
          </div>
          {editGoal
            ?<textarea value={goalText} onChange={e=>setGoalText(e.target.value)} placeholder="Опишите цели на месяц…"
                style={{width:"100%",minHeight:85,background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:10,color:"#e2e8f0",fontSize:13,outline:"none",resize:"vertical",lineHeight:1.6}}/>
            :<div style={{color:goalText?"#cbd5e1":"#475569",fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",fontStyle:goalText?"normal":"italic",minHeight:55}}>
                {goalText||"Нажмите «Редактировать» чтобы добавить цели на месяц"}
              </div>
          }
        </div>
      </div>

      {/* Habit manager */}
      {showMgr&&(
        <div style={{marginBottom:14}}>
          <HabitManager habits={habits} saveHabits={saveHabits} onClose={()=>setShowMgr(false)}/>
        </div>
      )}

      {/* Tracker grid */}
      <div style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:12,overflow:"hidden",marginBottom:13}}>
        <div style={{background:"linear-gradient(90deg,#1a2744,#1e2d4a)",padding:"10px 15px"}}>
          <span style={{fontWeight:700,fontSize:14,color:"#e2e8f0"}}>📋 Ежедневные привычки — {MONTHS[month]} {YEAR}</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr>
                <th rowSpan={2} style={{padding:"7px 13px",textAlign:"left",borderBottom:"2px solid #1e293b",borderRight:"1px solid #1e293b",background:"#0d1a2d",position:"sticky",left:0,zIndex:3,minWidth:185,color:"#64748b",fontSize:11}}>ПРИВЫЧКА</th>
                {gridWeeks.map((wk,wi)=>(
                  <th key={wi} colSpan={7} style={{padding:"5px 2px",textAlign:"center",borderBottom:"1px solid #1e293b",borderLeft:"2px solid #1e293b",background:wi%2===0?"#0f1929":"#131f35",color:"#475569",fontSize:10,fontWeight:600}}>
                    Нед. {wi+1}
                  </th>
                ))}
                <th colSpan={3} style={{padding:"5px 9px",textAlign:"center",borderBottom:"1px solid #1e293b",borderLeft:"2px solid #1e293b",background:"#1a2744",color:"#6366f1",fontSize:10,fontWeight:600,minWidth:135}}>ПРОГРЕСС</th>
              </tr>
              <tr>
                {gridWeeks.map((wk,wi)=>wk.map((d,di)=>(
                  <th key={`${wi}-${di}`} style={{padding:"3px 1px",textAlign:"center",borderBottom:"2px solid #1e293b",borderLeft:di===0?"2px solid #1e293b":"1px solid #0f172a",width:28,minWidth:28,background:isToday(d)?"#1e3a5f":wi%2===0?"#0f1929":"#131f35"}}>
                    <div style={{fontSize:9,fontWeight:isToday(d)?700:400,color:isToday(d)?"#6366f1":d?"#64748b":"#1e293b"}}>{d||""}</div>
                    <div style={{fontSize:8,color:"#334155"}}>{d?DAYS_RU[(new Date(YEAR,month,d).getDay()+6)%7]:""}</div>
                  </th>
                )))}
                <th style={{padding:"3px 5px",borderLeft:"2px solid #1e293b",background:"#1a2744",fontSize:10,color:"#6366f1",textAlign:"center"}}>✓</th>
                <th style={{padding:"3px 5px",background:"#1a2744",fontSize:10,color:"#64748b",textAlign:"center"}}>Цель</th>
                <th style={{padding:"3px 9px",background:"#1a2744",fontSize:10,color:"#64748b",textAlign:"left",minWidth:110}}>%</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h,hi)=>{
                const total=monthCount(h.id,month);
                const goal=hMonthGoal(h);
                const pct=goal?Math.min(100,Math.round(total/goal*100)):0;
                return(
                  <tr key={h.id} style={{background:hi%2===0?"#0d1a2d":"#0f1929"}}>
                    <td style={{padding:"5px 13px",borderBottom:"1px solid #1e293b",borderRight:"1px solid #1e293b",background:hi%2===0?"#0d1a2d":"#0f1929",position:"sticky",left:0,zIndex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                        <span style={{width:3,height:14,borderRadius:2,background:h.color}}/>
                        <span style={{fontSize:14}}>{h.icon}</span>
                        <span style={{color:"#cbd5e1",fontWeight:500,fontSize:12}}>{h.name}</span>
                      </div>
                    </td>
                    {gridWeeks.map((wk,wi)=>wk.map((d,di)=>(
                      <td key={`${wi}-${di}`} style={{padding:"3px 2px",textAlign:"center",borderBottom:"1px solid #1e293b",borderLeft:di===0?"2px solid #1e293b":"1px solid #0f172a",background:isToday(d)?"#162035":"transparent"}}>
                        {d?<CheckCell checked={!!completions[mkDate(month,d)]?.[h.id]} today={isToday(d)} future={isFuture(d)} color={h.color} onToggle={()=>toggle(mkDate(month,d),h.id)}/>:null}
                      </td>
                    )))}
                    <td style={{padding:"5px 5px",textAlign:"center",borderBottom:"1px solid #1e293b",borderLeft:"2px solid #1e293b",background:"#131f35",color:h.color,fontWeight:700}}>{total}</td>
                    <td style={{padding:"5px 5px",textAlign:"center",borderBottom:"1px solid #1e293b",background:"#131f35",color:"#64748b"}}>{goal}</td>
                    <td style={{padding:"5px 9px",borderBottom:"1px solid #1e293b",background:"#131f35"}}><ProgressBar pct={pct} color={h.color} height={5}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily stats */}
      <div style={{background:"#131f35",border:"1px solid #1e293b",borderRadius:12,overflow:"hidden"}}>
        <div style={{background:"#1a2744",padding:"9px 15px"}}>
          <span style={{fontWeight:700,fontSize:13,color:"#94a3b8"}}>📊 Прогресс дня</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",fontSize:12}}>
            <tbody>
              {[
                {label:"% выполнения",key:"pct",color:"#6366f1",bg:"#0d1a2d",suf:"%"},
                {label:"✅ Выполнено",key:"done",color:"#10b981",bg:"#0a1f16",suf:""},
                {label:"❌ Не выполнено",key:"notDone",color:"#ef4444",bg:"#1f0d0d",suf:""},
              ].map(row=>(
                <tr key={row.key}>
                  <td style={{padding:"8px 13px",background:row.bg,fontWeight:600,color:row.color,fontSize:12,borderBottom:"1px solid #1e293b",borderRight:"1px solid #1e293b",position:"sticky",left:0,zIndex:1,minWidth:165,whiteSpace:"nowrap"}}>{row.label}</td>
                  {gridWeeks.map((wk,wi)=>wk.map((d,di)=>{
                    const s=d?dayStats(d):null;
                    const val=s?s[row.key]:null;
                    return(
                      <td key={`${wi}-${di}`} style={{padding:"8px 1px",textAlign:"center",borderBottom:"1px solid #1e293b",borderLeft:di===0?"2px solid #1e293b":"1px solid #0f172a",background:row.bg,width:28,minWidth:28}}>
                        <span style={{color:val>0?row.color:"#334155",fontWeight:val===100||val===habits.length?700:400,fontSize:10}}>
                          {d?(val!==null?`${val}${row.suf}`:""):""}
                        </span>
                      </td>
                    );
                  }))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCE VIEW  ── НОВЫЙ РАЗДЕЛ
// ═══════════════════════════════════════════════════════════════════════════════
const PRESET_BANKS = ["Сбер","Тинькофф","Альфа","ВТБ","Наличные","Другой"];

function FinanceView({ finances, saveFinances }) {
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ bank: "", amount: "", type: "expense", desc: "", date: today });
  const [customBank, setCustomBank] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterBank, setFilterBank] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [showForm, setShowForm] = useState(true);

  const banks = [...new Set(finances.map(f => f.bank))].filter(Boolean);

  const addTx = () => {
    if (!form.bank.trim() || !form.amount || isNaN(parseFloat(form.amount))) return;
    const tx = { id: Date.now(), bank: form.bank.trim(), amount: parseFloat(form.amount), type: form.type, desc: form.desc.trim(), date: form.date };
    saveFinances([tx, ...finances]);
    setForm(p => ({ ...p, amount: "", desc: "", date: today }));
  };

  const deleteTx = id => { if (window.confirm("Удалить запись?")) saveFinances(finances.filter(f => f.id !== id)); };

  const filtered = finances.filter(f => {
    if (filterBank !== "all" && f.bank !== filterBank) return false;
    if (filterType !== "all" && f.type !== filterType) return false;
    if (filterMonth !== "all" && !f.date.startsWith(`${YEAR}-${filterMonth}`)) return false;
    return true;
  });

  const totalIncome = finances.filter(f => f.type === "income").reduce((s, f) => s + f.amount, 0);
  const totalExpense = finances.filter(f => f.type === "expense").reduce((s, f) => s + f.amount, 0);
  const balance = totalIncome - totalExpense;

  // Per-bank balances
  const bankMap = {};
  finances.forEach(f => {
    if (!bankMap[f.bank]) bankMap[f.bank] = { income: 0, expense: 0 };
    bankMap[f.bank][f.type] += f.amount;
  });

  const fmt = n => n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const inp = { padding:"8px 11px", border:"1px solid #334155", borderRadius:8, background:"#0f172a", color:"#e2e8f0", fontSize:13, outline:"none" };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12, marginBottom:18 }}>
        {[
          { label:"Баланс", value:`${balance >= 0 ? "+" : ""}${fmt(balance)} ₽`, color: balance >= 0 ? "#10b981" : "#ef4444", icon:"💳" },
          { label:"Доходы", value:`+${fmt(totalIncome)} ₽`, color:"#10b981", icon:"📈" },
          { label:"Расходы", value:`−${fmt(totalExpense)} ₽`, color:"#ef4444", icon:"📉" },
          { label:"Записей", value:finances.length, color:"#6366f1", icon:"📝" },
        ].map(s => (
          <div key={s.label} style={{ background:"#131f35", border:"1px solid #1e293b", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:20, marginBottom:5 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:700, color:s.color, fontFamily:"'Space Mono',monospace", lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-bank balances */}
      {Object.keys(bankMap).length > 0 && (
        <div style={{ background:"#131f35", border:"1px solid #1e293b", borderRadius:12, padding:16, marginBottom:18 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#94a3b8", marginBottom:12 }}>🏦 Балансы по счетам</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            {Object.entries(bankMap).map(([bank, {income, expense}]) => {
              const bal = income - expense;
              return (
                <div key={bank} style={{ background:"#0f1929", border:"1px solid #1e293b", borderRadius:10, padding:"10px 16px", minWidth:150 }}>
                  <div style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>🏦 {bank}</div>
                  <div style={{ fontSize:17, fontWeight:700, color: bal >= 0 ? "#10b981" : "#ef4444", fontFamily:"'Space Mono',monospace" }}>
                    {bal >= 0 ? "+" : ""}{fmt(bal)} ₽
                  </div>
                  <div style={{ fontSize:10, color:"#475569", marginTop:3 }}>↑{fmt(income)} · ↓{fmt(expense)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:16, alignItems:"start" }}>

        {/* Form */}
        <div style={{ background:"#131f35", border:"1px solid #1e293b", borderRadius:12, overflow:"hidden" }}>
          <div style={{ background:"linear-gradient(90deg,#1a2744,#1e2d4a)", padding:"11px 15px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight:700, fontSize:14, color:"#e2e8f0" }}>➕ Новая запись</span>
            <button onClick={()=>setShowForm(!showForm)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:16 }}>
              {showForm ? "▲" : "▼"}
            </button>
          </div>

          {showForm && (
            <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
              {/* Type toggle */}
              <div style={{ display:"flex", borderRadius:9, overflow:"hidden", border:"1px solid #334155" }}>
                {[{v:"income",label:"📈 Доход",c:"#10b981"},{v:"expense",label:"📉 Расход",c:"#ef4444"}].map(t=>(
                  <button key={t.v} onClick={()=>setForm(p=>({...p,type:t.v}))}
                    style={{ flex:1, padding:"9px 6px", border:"none", cursor:"pointer", fontWeight:600, fontSize:12,
                      background: form.type===t.v ? t.c+"22" : "#0f172a",
                      color: form.type===t.v ? t.c : "#475569",
                      borderRight: t.v==="income" ? "1px solid #334155" : "none",
                      transition:"all .15s" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Bank */}
              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>🏦 Банк / Счёт</div>
                {customBank
                  ? <div style={{ display:"flex", gap:6 }}>
                      <input value={form.bank} onChange={e=>setForm(p=>({...p,bank:e.target.value}))} placeholder="Введите название" style={{...inp,flex:1}}/>
                      <button onClick={()=>{setCustomBank(false);setForm(p=>({...p,bank:""}));}} style={{background:"#1e293b",color:"#94a3b8",border:"none",borderRadius:7,padding:"0 10px",cursor:"pointer",fontSize:12}}>✕</button>
                    </div>
                  : <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {PRESET_BANKS.map(b => (
                        <button key={b} onClick={()=>{ if(b==="Другой"){setCustomBank(true);setForm(p=>({...p,bank:""}));}else setForm(p=>({...p,bank:b})); }}
                          style={{ padding:"6px 11px", borderRadius:7, border:"1px solid", cursor:"pointer", fontSize:12, fontWeight:500, transition:"all .15s",
                            borderColor: form.bank===b ? "#6366f1" : "#334155",
                            background: form.bank===b ? "#6366f122" : "#0f172a",
                            color: form.bank===b ? "#818cf8" : "#64748b" }}>
                          {b}
                        </button>
                      ))}
                      {banks.filter(b=>!PRESET_BANKS.includes(b)).map(b=>(
                        <button key={b} onClick={()=>setForm(p=>({...p,bank:b}))}
                          style={{ padding:"6px 11px", borderRadius:7, border:"1px solid", cursor:"pointer", fontSize:12, fontWeight:500,
                            borderColor: form.bank===b ? "#6366f1" : "#334155",
                            background: form.bank===b ? "#6366f122" : "#0f172a",
                            color: form.bank===b ? "#818cf8" : "#64748b" }}>
                          {b}
                        </button>
                      ))}
                    </div>
                }
              </div>

              {/* Amount */}
              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>💰 Сумма (₽)</div>
                <input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
                  placeholder="0.00" min="0" style={{...inp,width:"100%",fontSize:15,fontFamily:"'Space Mono',monospace"}}/>
              </div>

              {/* Description */}
              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>📝 Описание</div>
                <input value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}
                  placeholder="За что? (необязательно)" style={{...inp,width:"100%"}}
                  onKeyDown={e=>e.key==="Enter"&&addTx()}/>
              </div>

              {/* Date */}
              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>📅 Дата</div>
                <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
                  style={{...inp,width:"100%"}}/>
              </div>

              <button onClick={addTx}
                style={{ background: form.type==="income" ? "#10b981" : "#ef4444", color:"white", border:"none", borderRadius:9,
                  padding:"11px", cursor:"pointer", fontWeight:700, fontSize:14, marginTop:2, transition:"opacity .15s" }}
                onMouseOver={e=>e.target.style.opacity=0.85} onMouseOut={e=>e.target.style.opacity=1}>
                {form.type==="income" ? "📈 Добавить доход" : "📉 Добавить расход"}
              </button>
            </div>
          )}
        </div>

        {/* Transactions list */}
        <div style={{ background:"#131f35", border:"1px solid #1e293b", borderRadius:12, overflow:"hidden" }}>
          <div style={{ background:"linear-gradient(90deg,#1a2744,#1e2d4a)", padding:"11px 15px" }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#e2e8f0", marginBottom:8 }}>📋 История транзакций</div>
            {/* Filters */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <select value={filterType} onChange={e=>setFilterType(e.target.value)}
                style={{ padding:"5px 9px", border:"1px solid #334155", borderRadius:7, background:"#0f172a", color:"#94a3b8", fontSize:12, outline:"none" }}>
                <option value="all">Все типы</option>
                <option value="income">Доходы</option>
                <option value="expense">Расходы</option>
              </select>
              <select value={filterBank} onChange={e=>setFilterBank(e.target.value)}
                style={{ padding:"5px 9px", border:"1px solid #334155", borderRadius:7, background:"#0f172a", color:"#94a3b8", fontSize:12, outline:"none" }}>
                <option value="all">Все счета</option>
                {banks.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
                style={{ padding:"5px 9px", border:"1px solid #334155", borderRadius:7, background:"#0f172a", color:"#94a3b8", fontSize:12, outline:"none" }}>
                <option value="all">Все месяцы</option>
                {MONTHS_SHORT.map((m,i)=><option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>)}
              </select>
              <span style={{ marginLeft:"auto", fontSize:12, color:"#475569", alignSelf:"center" }}>{filtered.length} записей</span>
            </div>
          </div>

          <div style={{ maxHeight:520, overflowY:"auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding:40, textAlign:"center", color:"#475569", fontSize:13 }}>
                <div style={{ fontSize:30, marginBottom:10 }}>📭</div>
                Записей нет. Добавьте первую транзакцию!
              </div>
            ) : filtered.map((tx, i) => (
              <div key={tx.id} className="tx-row"
                style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px",
                  borderBottom: i < filtered.length-1 ? "1px solid #1e293b" : "none",
                  background: i%2===0 ? "#0d1a2d" : "#0f1929", transition:"background .15s" }}>
                {/* Type indicator */}
                <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
                  background: tx.type==="income" ? "#10b98122" : "#ef444422" }}>
                  {tx.type==="income" ? "📈" : "📉"}
                </div>
                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:"#cbd5e1", whiteSpace:"nowrap" }}>🏦 {tx.bank}</span>
                    {tx.desc && <span style={{ fontSize:12, color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>· {tx.desc}</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#475569" }}>{tx.date}</div>
                </div>
                {/* Amount */}
                <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:14, flexShrink:0,
                  color: tx.type==="income" ? "#10b981" : "#ef4444" }}>
                  {tx.type==="income" ? "+" : "−"}{fmt(tx.amount)} ₽
                </div>
                {/* Delete */}
                <button onClick={()=>deleteTx(tx.id)}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#334155", fontSize:15, padding:"2px 4px", flexShrink:0, transition:"color .1s" }}
                  onMouseOver={e=>e.target.style.color="#ef4444"} onMouseOut={e=>e.target.style.color="#334155"}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI CHAT VIEW  ── НОВЫЙ РАЗДЕЛ (Mistral AI)
// ═══════════════════════════════════════════════════════════════════════════════
const MISTRAL_API_KEY = "Ygx6OSFbtJRKDeHuJ0VrHU5lyAh2w1Md";

function AIChatView({ habits, finances, monthCount, yearCount }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const buildSystemPrompt = () => {
    const habitsStats = habits.map(h => {
      const done = yearCount(h.id);
      const pct = h.yearGoal ? Math.round(done / h.yearGoal * 100) : 0;
      return `  • ${h.icon} ${h.name}: ${done}/${h.yearGoal} (${pct}%)`;
    }).join("\n");

    const totalIncome = finances.filter(f => f.type === "income").reduce((s, f) => s + f.amount, 0);
    const totalExpense = finances.filter(f => f.type === "expense").reduce((s, f) => s + f.amount, 0);
    const balance = totalIncome - totalExpense;

    const bankMap = {};
    finances.forEach(f => {
      if (!bankMap[f.bank]) bankMap[f.bank] = { income: 0, expense: 0 };
      bankMap[f.bank][f.type] += f.amount;
    });
    const bankStats = Object.entries(bankMap).map(([b,{income,expense}])=>
      `  • ${b}: баланс ${(income-expense).toFixed(0)} ₽ (↑${income.toFixed(0)} / ↓${expense.toFixed(0)})`
    ).join("\n");

    const recent = finances.slice(0, 15).map(t =>
      `  ${t.date} [${t.bank}] ${t.type==="income"?"+":"-"}${t.amount} ₽ ${t.desc||""}`
    ).join("\n");

    return `Ты личный ИИ-ассистент и коуч пользователя. У тебя есть доступ к его трекеру за ${YEAR} год.

═══ ПРИВЫЧКИ (прогресс ${YEAR}) ═══
${habitsStats || "Нет данных"}

═══ ФИНАНСЫ ═══
Баланс: ${balance.toFixed(0)} ₽
Доходы: ${totalIncome.toFixed(0)} ₽
Расходы: ${totalExpense.toFixed(0)} ₽
${bankStats ? "По счетам:\n" + bankStats : ""}
${recent ? "Последние транзакции:\n" + recent : ""}

═══ ИНСТРУКЦИИ ═══
Отвечай строго на русском языке. Будь конкретным, мотивирующим и практичным.
Анализируй данные пользователя, выявляй паттерны, давай персонализированные советы.
Можешь хвалить за успехи и мягко указывать на проблемные места.
Отвечай кратко, по делу, без лишней воды. Используй эмодзи для наглядности.`;
  };

  const QUICK_PROMPTS = [
    "Проанализируй мои привычки",
    "Как мои финансы?",
    "Где я трачу больше всего?",
    "Что улучшить в первую очередь?",
    "Мотивируй меня!",
  ];

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization":`Bearer ${MISTRAL_API_KEY}` },
        body: JSON.stringify({
          model: "mistral-small-latest",
          max_tokens: 800,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            ...newMessages
          ]
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "⚠️ Не удалось получить ответ.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "⚠️ Ошибка соединения с ИИ. Проверьте интернет." }]);
    }
    setLoading(false);
  };

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 130px)", minHeight:500 }}>
      {/* Header */}
      <div style={{ background:"#131f35", border:"1px solid #1e293b", borderRadius:"12px 12px 0 0", padding:"13px 17px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🤖</div>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:"#e2e8f0" }}>ИИ Ассистент</div>
          <div style={{ fontSize:11, color:"#64748b" }}>Анализирует твои привычки и финансы · Mistral AI</div>
        </div>
        {messages.length > 0 && (
          <button onClick={()=>setMessages([])} style={{ marginLeft:"auto", background:"#1e293b", color:"#64748b", border:"1px solid #334155", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12 }}>
            🗑️ Очистить
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", background:"#0d1a2d", border:"1px solid #1e293b", borderTop:"none", padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
        {messages.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:20 }}>
            <div style={{ fontSize:48 }}>🤖</div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontWeight:700, fontSize:16, color:"#e2e8f0", marginBottom:6 }}>Привет! Я твой личный коуч.</div>
              <div style={{ fontSize:13, color:"#64748b", maxWidth:380 }}>Я вижу твои привычки и финансы. Спроси что угодно — проанализирую и дам советы.</div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", maxWidth:450 }}>
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={()=>send(p)}
                  style={{ padding:"8px 14px", borderRadius:20, border:"1px solid #334155", background:"#131f35", color:"#94a3b8", cursor:"pointer", fontSize:12, fontWeight:500, transition:"all .15s" }}
                  onMouseOver={e=>{e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.color="#818cf8";}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.color="#94a3b8";}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", flexDirection: m.role==="user" ? "row-reverse" : "row" }}>
              {/* Avatar */}
              <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
                background: m.role==="user" ? "#6366f122" : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {m.role==="user" ? "👤" : "🤖"}
              </div>
              {/* Bubble */}
              <div style={{ maxWidth:"72%", padding:"11px 15px", borderRadius: m.role==="user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                background: m.role==="user" ? "#1e3a5f" : "#131f35",
                border:`1px solid ${m.role==="user" ? "#2d4a6e" : "#1e293b"}`,
                color:"#e2e8f0", fontSize:13, lineHeight:1.65, whiteSpace:"pre-wrap" }}>
                {m.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>🤖</div>
            <div style={{ padding:"12px 16px", background:"#131f35", border:"1px solid #1e293b", borderRadius:"4px 14px 14px 14px", display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i=>(
                <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#6366f1", animation:`bounce 1.2s ${i*0.2}s infinite` }}/>
              ))}
              <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.7);opacity:.5}40%{transform:scale(1);opacity:1}}`}</style>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ background:"#131f35", border:"1px solid #1e293b", borderTop:"none", borderRadius:"0 0 12px 12px", padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-end" }}>
        <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Напиши вопрос или попроси анализ… (Enter — отправить, Shift+Enter — перенос)"
          rows={1} style={{ flex:1, padding:"10px 13px", border:"1px solid #334155", borderRadius:10, background:"#0f172a", color:"#e2e8f0", fontSize:13, outline:"none", resize:"none", lineHeight:1.5, minHeight:42, maxHeight:120, transition:"border-color .15s" }}
          onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#334155"}
          onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}/>
        <button onClick={()=>send()} disabled={!input.trim()||loading}
          style={{ width:42, height:42, borderRadius:10, border:"none", cursor:input.trim()&&!loading?"pointer":"not-allowed", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, transition:"all .15s",
            background: input.trim()&&!loading ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1e293b",
            opacity: input.trim()&&!loading ? 1 : 0.5 }}>
          {loading ? "⏳" : "➤"}
        </button>
      </div>

      {/* Quick prompts below input when chat has messages */}
      {messages.length > 0 && (
        <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:8 }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={()=>send(p)} disabled={loading}
              style={{ padding:"5px 11px", borderRadius:14, border:"1px solid #334155", background:"#0f1929", color:"#64748b", cursor:"pointer", fontSize:11, transition:"all .15s" }}
              onMouseOver={e=>{e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.color="#818cf8";}}
              onMouseOut={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.color="#64748b";}}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
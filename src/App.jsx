import { useState, useEffect, useCallback, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_SHORT = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const DAYS_RU = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const YEAR = 2026;
const BIRTHDATE = new Date(2008, 9, 17);
const LIFE_YEARS = 70;
const PALETTE = ["#818cf8","#f59e0b","#ef4444","#10b981","#3b82f6","#a78bfa","#ec4899","#14b8a6","#f97316","#84cc16","#06b6d4","#e879f9"];

const DEFAULT_HABITS = [
  { id:1, name:"Лечь до 23:30",            icon:"🛏️", yearGoal:365, color:"#818cf8" },
  { id:2, name:"Чтение 10 минут",           icon:"📖", yearGoal:180, color:"#f59e0b" },
  { id:3, name:"Сделать видео на YT",       icon:"🎬", yearGoal:240, color:"#ef4444" },
  { id:4, name:"10 тысяч шагов",            icon:"👟", yearGoal:120, color:"#10b981" },
  { id:5, name:"2 литра воды",              icon:"💧", yearGoal:245, color:"#3b82f6" },
  { id:6, name:"Сходить в зал/спорт дома",  icon:"🏋️", yearGoal:180, color:"#a78bfa" },
  { id:7, name:"Сделать видео в TT",        icon:"📱", yearGoal:240, color:"#ec4899" },
  { id:8, name:"2 часа в TT",               icon:"⏰", yearGoal:365, color:"#14b8a6" },
  { id:9, name:"Контрастный душ",           icon:"🚿", yearGoal:365, color:"#f97316" },
];

const mkDate = (m,d) => `${YEAR}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const daysInMonth = m => new Date(YEAR,m+1,0).getDate();
const firstDayMon = m => { const d=new Date(YEAR,m,1).getDay(); return d===0?6:d-1; };
const MS_WEEK = 7*24*3600*1000;

function storageGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function storageSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── AnimatedSection ──────────────────────────────────────────────────────────
function AnimatedSection({ animKey, direction, children }) {
  const [displayKey, setDisplayKey] = useState(animKey);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState("idle");
  const [animDir, setAnimDir] = useState(direction || "fade");
  const pendingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (animKey === displayKey) { setDisplayChildren(children); return; }
    pendingRef.current = { key: animKey, children, dir: direction || "fade" };
    if (phase !== "exit") {
      setPhase("exit");
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const p = pendingRef.current;
        if (p) {
          setAnimDir(p.dir);
          setDisplayKey(p.key);
          setDisplayChildren(p.children);
          pendingRef.current = null;
        }
        setPhase("enter");
        timerRef.current = setTimeout(() => setPhase("idle"), 380);
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey, direction]);

  useEffect(() => {
    if (animKey === displayKey && phase === "idle") setDisplayChildren(children);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  const exitStyle = phase === "exit" ? {
    opacity: 0,
    transform: animDir === "right" ? "translateX(-32px) scale(0.98)" : animDir === "left" ? "translateX(32px) scale(0.98)" : "translateY(-14px) scale(0.97)",
    filter: "blur(4px)",
    transition: "opacity 0.2s ease, transform 0.2s ease, filter 0.2s ease",
    pointerEvents: "none",
  } : {};

  const enterClass = phase === "enter"
    ? animDir === "right" ? "anim-slide-right"
    : animDir === "left"  ? "anim-slide-left"
    : "anim-fade-up"
    : "";

  return (
    <div className={enterClass} style={{ willChange: "opacity, transform", ...exitStyle }}>
      {displayChildren}
    </div>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
function ProgressBar({pct,color,height=8}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:11,color:"#94a3b8",minWidth:32,textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{pct}%</span>
      <div style={{flex:1,background:"rgba(255,255,255,0.04)",borderRadius:99,height,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{
          width:`${Math.min(pct,100)}%`,
          background:`linear-gradient(90deg,${color||"#818cf8"}88,${color||"#818cf8"})`,
          height:"100%",borderRadius:99,
          transition:"width .7s cubic-bezier(.34,1.2,.64,1)",
          boxShadow:`0 0 10px ${color||"#818cf8"}55, 0 0 20px ${color||"#818cf8"}22`
        }}/>
      </div>
    </div>
  );
}

// ─── MiniConfetti ─────────────────────────────────────────────────────────────
function MiniConfetti({color}){
  const pts=useRef(null);
  if(!pts.current){
    const cols=[color,"#fff","#fbbf24","#f472b6","#34d399","#60a5fa","#e879f9"];
    pts.current=Array.from({length:14},(_,i)=>({
      id:i,col:cols[Math.floor(Math.random()*cols.length)],
      x:(Math.random()-.5)*60,y:-(Math.random()*46+10),
      r:Math.random()*3+1.5,delay:Math.random()*.18,rect:Math.random()>.5,
    }));
  }
  return(
    <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:20,overflow:"visible"}}>
      {pts.current.map(p=>(
        <div key={p.id} style={{
          position:"absolute",left:"50%",top:"50%",
          width:p.rect?p.r*2.5:p.r*2,height:p.rect?p.r*1.3:p.r*2,
          borderRadius:p.rect?"2px":"50%",background:p.col,
          animation:`confettiBurst .7s ${p.delay}s cubic-bezier(.22,.68,0,1) both`,
          "--tx":`${p.x}px`,"--ty":`${p.y}px`,
        }}/>
      ))}
    </div>
  );
}

// ─── CheckCell ────────────────────────────────────────────────────────────────
function CheckCell({checked,today,future,color,onToggle}){
  const [burst,setBurst]=useState(false);
  const [confetti,setConfetti]=useState(false);
  const handle=()=>{
    if(future)return;
    if(!checked){
      setBurst(true);
      setTimeout(()=>setBurst(false),400);
      if(Math.random()<.7){setConfetti(true);setTimeout(()=>setConfetti(false),750);}
    }
    onToggle();
  };
  return(
    <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
      {confetti&&<MiniConfetti color={color}/>}
      <div onClick={handle}
        style={{
          width:26,height:26,
          border:`2px solid ${checked?color:today?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.06)"}`,
          borderRadius:8,
          cursor:future?"default":"pointer",
          background:checked?`linear-gradient(135deg,${color}cc,${color})`:"rgba(255,255,255,0.03)",
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"all .25s cubic-bezier(.34,1.4,.64,1)",
          opacity:future?.25:1,
          transform:burst?"scale(1.45)":"scale(1)",
          boxShadow:checked?`0 0 14px ${color}66, 0 0 28px ${color}22`:today?`0 0 0 2px ${color}44, inset 0 0 8px rgba(255,255,255,0.05)`:"none",
          backdropFilter:"blur(4px)",
        }}>
        {checked&&<span style={{color:"#fff",fontSize:13,lineHeight:1,fontWeight:800,animation:"checkPop .35s cubic-bezier(.34,1.56,.64,1) both",textShadow:"0 1px 4px rgba(0,0,0,0.5)"}}>✓</span>}
      </div>
    </div>
  );
}

// ─── GlassCard ────────────────────────────────────────────────────────────────
function GlassCard({children, style={}, className="", glow=""}) {
  return (
    <div className={`glass-card ${className}`} style={{
      background: "rgba(15,23,42,0.7)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      boxShadow: glow
        ? `0 4px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 60px ${glow}22`
        : "0 4px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── HabitManager ─────────────────────────────────────────────────────────────
function HabitManager({habits,saveHabits,onClose}){
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"",icon:"⭐",yearGoal:365,color:"#818cf8"});
  const [editId,setEditId]=useState(null);
  const [editForm,setEditForm]=useState({});

  const inp={
    padding:"9px 13px",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,
    background:"rgba(255,255,255,0.05)",color:"#e2e8f0",fontSize:13,outline:"none",
    backdropFilter:"blur(4px)",transition:"border-color .2s",
  };

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
    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
      {PALETTE.map(c=>(
        <div key={c} onClick={()=>onChange(c)}
          style={{
            width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",
            border:val===c?"2px solid white":"2px solid transparent",
            transition:"all .15s",transform:val===c?"scale(1.2)":"scale(1)",
            boxShadow:val===c?`0 0 8px ${c}`:"none",
          }}/>
      ))}
    </div>
  );

  return(
    <GlassCard style={{overflow:"hidden"}}>
      <div style={{
        padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        background:"linear-gradient(135deg,rgba(129,140,248,0.1),rgba(167,139,250,0.05))",
      }}>
        <span style={{fontWeight:700,fontSize:15,color:"#e2e8f0",letterSpacing:"-0.3px"}}>⚙️ Управление задачами</span>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowAdd(!showAdd)}
            style={{background:showAdd?"rgba(255,255,255,0.1)":"linear-gradient(135deg,#818cf8,#a78bfa)",color:"white",border:"none",borderRadius:9,padding:"7px 16px",cursor:"pointer",fontWeight:700,fontSize:12,transition:"all .2s",boxShadow:showAdd?"none":"0 2px 12px rgba(129,140,248,0.4)"}}>
            {showAdd?"✕":"+ Добавить"}
          </button>
          {onClose&&<button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",color:"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,padding:"7px 13px",cursor:"pointer",fontSize:12}}>Закрыть</button>}
        </div>
      </div>

      {showAdd&&(
        <div style={{padding:"14px 18px",background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} style={{...inp,width:52,textAlign:"center",fontSize:20}}/>
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Название задачи" style={{...inp,flex:1,minWidth:160}}/>
          <input type="number" value={form.yearGoal} onChange={e=>setForm({...form,yearGoal:e.target.value})} placeholder="Цель/год" style={{...inp,width:90}}/>
          <ColorPicker val={form.color} onChange={c=>setForm({...form,color:c})}/>
          <button onClick={add} style={{background:"linear-gradient(135deg,#818cf8,#a78bfa)",color:"white",border:"none",borderRadius:9,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:13,boxShadow:"0 2px 12px rgba(129,140,248,0.4)"}}>Добавить</button>
        </div>
      )}

      {habits.map((h,hi)=>{
        if(editId===h.id) return(
          <div key={h.id} style={{padding:"12px 18px",background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <input value={editForm.icon} onChange={e=>setEditForm({...editForm,icon:e.target.value})} style={{...inp,width:50,textAlign:"center",fontSize:18}}/>
            <input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={{...inp,flex:1,minWidth:140}}/>
            <input type="number" value={editForm.yearGoal} onChange={e=>setEditForm({...editForm,yearGoal:e.target.value})} style={{...inp,width:90}}/>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {PALETTE.map(c=><div key={c} onClick={()=>setEditForm({...editForm,color:c})}
                style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:editForm.color===c?"2px solid white":"2px solid transparent",transition:"all .15s",transform:editForm.color===c?"scale(1.2)":"scale(1)"}}/>)}
            </div>
            <button onClick={saveEdit} style={{background:"linear-gradient(135deg,#818cf8,#a78bfa)",color:"white",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:12}}>Сохранить</button>
            <button onClick={()=>setEditId(null)} style={{background:"rgba(255,255,255,0.06)",color:"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontSize:12}}>Отмена</button>
          </div>
        );
        return(
          <div key={h.id} style={{
            display:"flex",alignItems:"center",padding:"11px 18px",
            borderBottom:hi<habits.length-1?"1px solid rgba(255,255,255,0.04)":"none",
            background:"transparent",gap:10,transition:"background .2s",
          }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
          >
            <div style={{width:4,height:20,borderRadius:2,background:h.color,flexShrink:0,boxShadow:`0 0 8px ${h.color}88`}}/>
            <span style={{fontSize:17}}>{h.icon}</span>
            <span style={{flex:1,fontSize:13,color:"#cbd5e1",fontWeight:500}}>{h.name}</span>
            <span style={{fontSize:11,color:"#475569",marginRight:4,fontFamily:"'JetBrains Mono',monospace"}}>Цель: {h.yearGoal}/год</span>
            <button onClick={()=>startEdit(h)} style={{background:"none",border:"none",cursor:"pointer",color:"#475569",fontSize:15,padding:"3px 6px",borderRadius:6,transition:"all .15s"}}
              onMouseEnter={e=>e.currentTarget.style.color="#818cf8"} onMouseLeave={e=>e.currentTarget.style.color="#475569"}>✏️</button>
            <button onClick={()=>remove(h.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#475569",fontSize:15,padding:"3px 6px",borderRadius:6,transition:"all .15s"}}
              onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#475569"}>🗑️</button>
          </div>
        );
      })}
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Auth helpers ─────────────────────────────────────────────────────────────
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h.toString(36);
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inp = {
    width: "100%", padding: "13px 16px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
    color: "#e2e8f0", fontSize: 15, outline: "none", transition: "border-color .2s",
  };

  const handleSubmit = () => {
    setError(""); setSuccess("");
    const u = login.trim();
    if (!u || !password) { setError("Заполни все поля"); return; }
    if (u.length < 3) { setError("Логин минимум 3 символа"); return; }
    if (password.length < 4) { setError("Пароль минимум 4 символа"); return; }

    const users = JSON.parse(localStorage.getItem("ht-users") || "{}");

    if (mode === "register") {
      if (users[u]) { setError("Такой логин уже занят"); return; }
      users[u] = hashStr(password);
      localStorage.setItem("ht-users", JSON.stringify(users));
      localStorage.setItem("ht-session", u);
      setSuccess("Аккаунт создан! Входим...");
      setTimeout(() => onLogin(u), 800);
    } else {
      if (!users[u] || users[u] !== hashStr(password)) { setError("Неверный логин или пароль"); return; }
      localStorage.setItem("ht-session", u);
      onLogin(u);
    }
  };

  const handleKey = e => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{ minHeight:"100vh", background:"#060b18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',system-ui,sans-serif", position:"relative", overflow:"hidden" }}>
      {/* Aurora bg */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", width:700, height:700, top:-200, left:-200, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(99,102,241,0.15) 0%,transparent 70%)", animation:"auroraFloat 18s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", width:500, height:500, bottom:-100, right:-100, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(167,139,250,0.1) 0%,transparent 70%)", animation:"auroraFloat 22s ease-in-out infinite reverse" }}/>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes auroraFloat{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(20px,-15px) scale(1.04);}}
        @keyframes floatIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px) scale(0.97);}to{opacity:1;transform:none;}}
      `}</style>

      <div style={{ width:"100%", maxWidth:420, padding:24, position:"relative", zIndex:1, animation:"fadeUp .5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:"linear-gradient(135deg,#818cf8,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 16px", boxShadow:"0 8px 32px rgba(129,140,248,0.5)" }}>🎯</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:20, background:"linear-gradient(90deg,#c7d2fe,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>ТРЕКЕР 2026</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:6 }}>Личный трекер задач и продуктивности</div>
        </div>

        {/* Card */}
        <div style={{ background:"rgba(15,23,42,0.85)", backdropFilter:"blur(24px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:32, boxShadow:"0 8px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          {/* Tabs */}
          <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:12, padding:4, marginBottom:28 }}>
            {[["login","Войти"],["register","Регистрация"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setError("");setSuccess("");}}
                style={{ flex:1, padding:"9px", borderRadius:9, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, transition:"all .2s",
                  background: mode===m ? "linear-gradient(135deg,#818cf8,#a78bfa)" : "transparent",
                  color: mode===m ? "white" : "#64748b",
                  boxShadow: mode===m ? "0 4px 16px rgba(129,140,248,0.4)" : "none",
                }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:7, fontWeight:600, letterSpacing:"0.08em" }}>ЛОГИН</div>
              <input value={login} onChange={e=>setLogin(e.target.value)} onKeyDown={handleKey}
                placeholder="твой_логин" style={inp}
                onFocus={e=>e.target.style.borderColor="rgba(129,140,248,0.5)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:7, fontWeight:600, letterSpacing:"0.08em" }}>ПАРОЛЬ</div>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={handleKey}
                placeholder="••••••••" style={inp}
                onFocus={e=>e.target.style.borderColor="rgba(129,140,248,0.5)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
            </div>

            {error && (
              <div style={{ padding:"10px 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, fontSize:13, color:"#f87171", animation:"floatIn .2s ease" }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ padding:"10px 14px", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:10, fontSize:13, color:"#34d399", animation:"floatIn .2s ease" }}>
                ✅ {success}
              </div>
            )}

            <button onClick={handleSubmit}
              style={{ padding:"14px", borderRadius:12, border:"none", cursor:"pointer", fontWeight:800, fontSize:15, marginTop:4, transition:"all .25s",
                background:"linear-gradient(135deg,#6366f1,#818cf8,#a78bfa)",
                color:"white", boxShadow:"0 6px 28px rgba(129,140,248,0.5)",
              }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              {mode === "login" ? "→ Войти" : "✦ Создать аккаунт"}
            </button>
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:"#334155" }}>
          Данные хранятся только на этом устройстве
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const [currentUser, setCurrentUser] = useState(() => {
    try { return localStorage.getItem("ht-session") || null; } catch { return null; }
  });

  const handleLogin = (username) => setCurrentUser(username);
  const handleLogout = () => {
    localStorage.removeItem("ht-session");
    setCurrentUser(null);
  };

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;

  return <AppInner currentUser={currentUser} onLogout={handleLogout} />;
}

function AppInner({ currentUser, onLogout }){
  const [habits, setHabits] = useState(() => storageGet("ht-habits") || DEFAULT_HABITS);
  const [completions, setCompletions] = useState(() => storageGet("ht-completions") || {});
  const [monthGoals, setMonthGoals] = useState(() => storageGet("ht-monthgoals") || {});
  const [finances, setFinances] = useState(() => storageGet("ht-finances") || []);
  const [bigGoals, setBigGoals] = useState(() => storageGet("ht-biggoals") || []);
  const [view, setView] = useState(() => storageGet("ht-view") || "year");
  const [curMonth, setCurMonth] = useState(() => {
    const saved = storageGet("ht-curmonth");
    return saved !== null ? saved : new Date().getMonth();
  });
  const [animDir, setAnimDir] = useState("fade");
  const prevViewRef = useRef(view);
  const prevMonthRef = useRef(curMonth);
  const VIEW_ORDER = ["year", "life", "finance", "ai", "motivation", "pomodoro"];

  const navigateTo = useCallback((newView, newMonth) => {
    const oldView = prevViewRef.current;
    const oldMonth = prevMonthRef.current;
    if (newView === "month" && oldView === "month") {
      setAnimDir(newMonth > oldMonth ? "right" : "left");
    } else {
      const oldIdx = oldView === "month" ? -1 : VIEW_ORDER.indexOf(oldView);
      const newIdx = newView === "month" ? -1 : VIEW_ORDER.indexOf(newView);
      if (newView === "month" || (newIdx !== -1 && oldIdx !== -1 && newIdx > oldIdx)) {
        setAnimDir("right");
      } else {
        setAnimDir("left");
      }
    }
    prevViewRef.current = newView;
    if (newMonth !== undefined) prevMonthRef.current = newMonth;
    if (newView) { setView(newView); storageSet("ht-view", newView); }
    if (newMonth !== undefined) { setCurMonth(newMonth); storageSet("ht-curmonth", newMonth); }
  }, []);

  const saveHabits = useCallback(h => { setHabits(h); storageSet("ht-habits", h); }, []);
  const saveCompletions = useCallback(c => { setCompletions(c); storageSet("ht-completions", c); }, []);
  const saveGoals = useCallback(g => { setMonthGoals(g); storageSet("ht-monthgoals", g); }, []);
  const saveFinances = useCallback(f => { setFinances(f); storageSet("ht-finances", f); }, []);
  const saveBigGoals = useCallback(g => { setBigGoals(g); storageSet("ht-biggoals", g); }, []);

  const toggle = useCallback((ds, hid) => {
    setCompletions(prev => {
      const next = {...prev, [ds]: {...(prev[ds]||{}), [hid]: !prev[ds]?.[hid]}};
      storageSet("ht-completions", next);
      return next;
    });
  }, []);

  const monthCount = useCallback((hid, m) => {
    let n = 0;
    for(let d=1; d<=daysInMonth(m); d++) if(completions[mkDate(m,d)]?.[hid]) n++;
    return n;
  }, [completions]);

  const yearCount = useCallback(hid => MONTHS.reduce((s,_,m) => s+monthCount(hid,m), 0), [monthCount]);
  const animKey = view === "month" ? `month-${curMonth}` : view;

  const NAV_ITEMS = [
    {id:"year",label:"Год",icon:"📊"},
    {id:"life",label:"70 лет",icon:"⏳"},
    {id:"finance",label:"Финансы",icon:"💰"},
    {id:"ai",label:"ИИ",icon:"🤖"},
    {id:"motivation",label:"Мотивация",icon:"🔥"},
    {id:"pomodoro",label:"Помодоро",icon:"⏱️"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#060b18",fontFamily:"'Inter',system-ui,sans-serif",color:"#e2e8f0",position:"relative",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(129,140,248,0.3);border-radius:4px;}
        ::-webkit-scrollbar-thumb:hover{background:rgba(129,140,248,0.5);}

        /* Background Aurora */
        .bg-aurora{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;}
        .aurora-1{position:absolute;width:800px;height:800px;top:-200px;left:-200px;border-radius:50%;background:radial-gradient(ellipse,rgba(99,102,241,0.12) 0%,transparent 70%);animation:auroraFloat 18s ease-in-out infinite;}
        .aurora-2{position:absolute;width:600px;height:600px;top:30%;right:-100px;border-radius:50%;background:radial-gradient(ellipse,rgba(167,139,250,0.09) 0%,transparent 70%);animation:auroraFloat 24s ease-in-out infinite reverse;}
        .aurora-3{position:absolute;width:500px;height:500px;bottom:-100px;left:40%;border-radius:50%;background:radial-gradient(ellipse,rgba(20,184,166,0.07) 0%,transparent 70%);animation:auroraFloat 20s ease-in-out infinite 3s;}
        @keyframes auroraFloat{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(30px,-20px) scale(1.05);}66%{transform:translate(-20px,15px) scale(0.95);};}

        /* Grid lines bg */
        .bg-grid{position:fixed;inset:0;pointer-events:none;z-index:0;
          background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);
          background-size:60px 60px;}

        /* Nav */
        .nav-btn{position:relative;transition:all .25s cubic-bezier(.34,1.2,.64,1);overflow:hidden;}
        .nav-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(129,140,248,0.15),rgba(167,139,250,0.1));opacity:0;transition:opacity .2s;border-radius:inherit;}
        .nav-btn:hover::before{opacity:1;}
        .nav-btn:hover{transform:translateY(-1px);}
        .nav-btn:active{transform:scale(.95);}
        .nav-btn-active{background:linear-gradient(135deg,rgba(129,140,248,0.25),rgba(167,139,250,0.15)) !important;color:#c7d2fe !important;border-color:rgba(129,140,248,0.4) !important;box-shadow:0 0 20px rgba(129,140,248,0.2), inset 0 1px 0 rgba(255,255,255,0.1) !important;}

        /* Glass card */
        .glass-card{transition:box-shadow .3s ease,transform .3s ease;}
        .glass-card:hover{box-shadow:0 8px 50px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06),inset 0 1px 0 rgba(255,255,255,0.08) !important;}

        /* Card hover lift */
        .card-lift{transition:transform .25s cubic-bezier(.34,1.2,.64,1),box-shadow .25s ease;}
        .card-lift:hover{transform:translateY(-3px);box-shadow:0 16px 50px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.08) !important;}

        /* Animations */
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px) scale(0.97);filter:blur(4px);}to{opacity:1;transform:none;filter:blur(0);}}
        @keyframes slideFromRight{from{opacity:0;transform:translateX(60px) scale(0.98);filter:blur(3px);}to{opacity:1;transform:none;filter:blur(0);}}
        @keyframes slideFromLeft{from{opacity:0;transform:translateX(-60px) scale(0.98);filter:blur(3px);}to{opacity:1;transform:none;filter:blur(0);}}
        @keyframes confettiBurst{0%{transform:translate(-50%,-50%) translate(0,0) scale(1);opacity:1;}80%{opacity:.8;}100%{transform:translate(-50%,-50%) translate(var(--tx),var(--ty)) scale(0);opacity:0;}}
        @keyframes checkPop{0%{transform:scale(0) rotate(-15deg);opacity:0;}60%{transform:scale(1.3) rotate(6deg);opacity:1;}100%{transform:scale(1) rotate(0);opacity:1;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
        @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 8px currentColor;}50%{box-shadow:0 0 20px currentColor;}}
        @keyframes bounce{0%,80%,100%{transform:scale(0.7);opacity:.4;}40%{transform:scale(1.1);opacity:1;}}
        @keyframes floatIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}

        .anim-fade-up{animation:fadeUp .42s cubic-bezier(.22,.68,0,1.15) both;}
        .anim-slide-right{animation:slideFromRight .36s cubic-bezier(.22,.68,0,1.1) both;}
        .anim-slide-left{animation:slideFromLeft .36s cubic-bezier(.22,.68,0,1.1) both;}

        .stagger-child{animation:fadeUp .45s cubic-bezier(.22,.68,0,1.2) both;}
        .stagger-child:nth-child(1){animation-delay:.05s;}
        .stagger-child:nth-child(2){animation-delay:.1s;}
        .stagger-child:nth-child(3){animation-delay:.15s;}
        .stagger-child:nth-child(4){animation-delay:.2s;}
        .stagger-child:nth-child(5){animation-delay:.25s;}
        .stagger-child:nth-child(n+6){animation-delay:.3s;}

        /* Table */
        .hrow{transition:background .15s;}
        .hrow:hover>td{background:rgba(129,140,248,0.05) !important;}
        .tx-row:hover{background:rgba(255,255,255,0.03) !important;}
        .weekcell{transition:transform .12s cubic-bezier(.34,1.4,.64,1);}
        .weekcell:hover{transform:scale(1.9);z-index:20;}

        textarea:focus,input:focus{outline:none !important;border-color:rgba(129,140,248,0.5) !important;box-shadow:0 0 0 3px rgba(129,140,248,0.1) !important;}
        button:active:not(:disabled){transform:scale(.94);}

        /* Stat number */
        .stat-num{font-family:'JetBrains Mono',monospace;font-weight:700;}
      `}</style>

      {/* Ambient background */}
      <div className="bg-grid"/>
      <div className="bg-aurora">
        <div className="aurora-1"/>
        <div className="aurora-2"/>
        <div className="aurora-3"/>
      </div>

      {/* NAV */}
      <div style={{
        position:"sticky",top:0,zIndex:100,
        background:"rgba(6,11,24,0.85)",
        backdropFilter:"blur(24px) saturate(180%)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        boxShadow:"0 4px 30px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        <div style={{maxWidth:1600,margin:"0 auto",display:"flex",alignItems:"center",gap:5,overflowX:"auto",padding:"10px 16px"}}>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginRight:12,flexShrink:0}}>
            <div style={{
              width:32,height:32,borderRadius:10,
              background:"linear-gradient(135deg,#818cf8,#a78bfa)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,
              boxShadow:"0 4px 15px rgba(129,140,248,0.5)",
              animation:"glowPulse 3s ease infinite",
              color:"white",
            }}>🎯</div>
            <span style={{
              fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:13,letterSpacing:"0.05em",
              background:"linear-gradient(90deg,#c7d2fe,#a78bfa)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              whiteSpace:"nowrap",
            }}>ТРЕКЕР {YEAR}</span>
          </div>

          {/* Main nav */}
          {NAV_ITEMS.map(v=>(
            <button key={v.id}
              className={`nav-btn${view===v.id?" nav-btn-active":""}`}
              onClick={()=>navigateTo(v.id)}
              style={{
                padding:"7px 16px",borderRadius:10,
                border:`1px solid ${view===v.id?"rgba(129,140,248,0.4)":"rgba(255,255,255,0.06)"}`,
                cursor:"pointer",flexShrink:0,
                background:view===v.id?"rgba(129,140,248,0.2)":"transparent",
                color:view===v.id?"#c7d2fe":"#64748b",
                fontWeight:600,fontSize:13,letterSpacing:"-0.2px",
              }}>
              <span style={{marginRight:6}}>{v.icon}</span>{v.label}
            </button>
          ))}

          <div style={{width:1,height:24,background:"rgba(255,255,255,0.08)",flexShrink:0,margin:"0 5px"}}/>

          {/* Month nav */}
          {MONTHS_SHORT.map((m,i)=>(
            <button key={i} className="nav-btn"
              onClick={()=>navigateTo("month", i)}
              style={{
                padding:"7px 11px",borderRadius:9,
                border:`1px solid ${view==="month"&&curMonth===i?"rgba(129,140,248,0.4)":"transparent"}`,
                cursor:"pointer",flexShrink:0,
                background:view==="month"&&curMonth===i?"rgba(129,140,248,0.2)":"transparent",
                color:view==="month"&&curMonth===i?"#c7d2fe":"#475569",
                fontWeight:view==="month"&&curMonth===i?700:500,fontSize:13,
              }}>
              {m}
            </button>
          ))}

          {/* User + logout */}
          <div style={{marginLeft:"auto",flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"#475569",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>👤 {currentUser}</span>
            <button onClick={onLogout}
              style={{padding:"6px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#475569",cursor:"pointer",fontSize:12,transition:"all .2s",whiteSpace:"nowrap"}}
              onMouseEnter={e=>{e.currentTarget.style.color="#ef4444";e.currentTarget.style.borderColor="rgba(239,68,68,0.3)";}}
              onMouseLeave={e=>{e.currentTarget.style.color="#475569";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}>
              Выйти
            </button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1700,margin:"0 auto",padding:"22px 16px",position:"relative",zIndex:1}}>
        <AnimatedSection animKey={animKey} direction={animDir}>
          {view==="year"    && <YearView    habits={habits} monthCount={monthCount} yearCount={yearCount} saveHabits={saveHabits} onMonthClick={m=>navigateTo("month",m)} bigGoals={bigGoals} saveBigGoals={saveBigGoals}/>}
          {view==="life"    && <LifeView/>}
          {view==="month"   && <MonthView   month={curMonth} habits={habits} completions={completions} toggle={toggle} monthGoals={monthGoals} saveGoals={saveGoals} monthCount={monthCount} saveHabits={saveHabits}/>}
          {view==="finance" && <FinanceView  finances={finances} saveFinances={saveFinances}/>}
          {view==="ai"      && <AIChatView  habits={habits} completions={completions} finances={finances} monthCount={monthCount} yearCount={yearCount}/>}
          {view==="motivation" && <MotivationView/>}
          {view==="pomodoro"   && <PomodoroView/>}
        </AnimatedSection>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════
const GOAL_CATEGORIES = [
  {id:"health",label:"Здоровье",icon:"💪",color:"#10b981"},
  {id:"career",label:"Карьера",icon:"💼",color:"#818cf8"},
  {id:"money",label:"Финансы",icon:"💰",color:"#f59e0b"},
  {id:"study",label:"Учёба",icon:"📚",color:"#3b82f6"},
  {id:"personal",label:"Личное",icon:"🌱",color:"#a78bfa"},
  {id:"other",label:"Другое",icon:"⭐",color:"#ec4899"},
];

function GoalsWidget({ bigGoals, saveBigGoals, habits, yearCount, monthCount }) {
  const [showAdd, setShowAdd] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiComment, setAiComment] = useState(null);
  const [aiTarget, setAiTarget] = useState(null); // which goal id the comment is for
  const [form, setForm] = useState({ text: "", category: "personal", deadline: "" });

  const addGoal = () => {
    if (!form.text.trim()) return;
    const goal = { id: Date.now(), text: form.text.trim(), category: form.category, deadline: form.deadline, done: false, createdAt: new Date().toISOString().slice(0,10) };
    saveBigGoals([...bigGoals, goal]);
    setForm({ text: "", category: "personal", deadline: "" });
    setShowAdd(false);
  };

  const toggleGoal = id => saveBigGoals(bigGoals.map(g => g.id === id ? { ...g, done: !g.done } : g));
  const removeGoal = id => { if (window.confirm("Удалить цель?")) saveBigGoals(bigGoals.filter(g => g.id !== id)); };

  const askAI = async (goal) => {
    setAiLoading(true);
    setAiTarget(goal.id);
    setAiComment(null);
    const cat = GOAL_CATEGORIES.find(c => c.id === goal.category);
    // Build habit context
    const habitSummary = habits.slice(0, 6).map(h => {
      const done = habits.reduce((s, _, idx) => s, 0); // placeholder
      const cnt = yearCount(h.id);
      return `${h.icon} ${h.name}: выполнено ${cnt} раз за год (цель ${h.yearGoal})`;
    }).join("\n");
    const doneCount = bigGoals.filter(g => g.done).length;
    const prompt = `Ты мотивационный коуч для трекера продуктивности. Пользователь поставил себе цель: "${goal.text}" (категория: ${cat?.label || goal.category}${goal.deadline ? `, дедлайн: ${goal.deadline}` : ""}, статус: ${goal.done ? "✅ выполнена" : "в процессе"}).

Общий контекст:
- Всего целей: ${bigGoals.length}, выполнено: ${doneCount}
- Привычки за год:
${habitSummary}

Дай короткий (2-3 предложения) персональный совет или мотивационный комментарий по этой конкретной цели. Будь конкретным, честным и поддерживающим. Отвечай на русском языке.`;

    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MISTRAL_API_KEY}` },
        body: JSON.stringify({
          model: "mistral-small-latest",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "Не удалось получить ответ.";
      setAiComment(text);
    } catch {
      setAiComment("Ошибка соединения с ИИ. Попробуйте снова.");
    }
    setAiLoading(false);
  };

  const askAIOverall = async () => {
    setAiLoading(true);
    setAiTarget("overall");
    setAiComment(null);
    const doneCount = bigGoals.filter(g => g.done).length;
    const habitSummary = habits.slice(0, 5).map(h => `${h.icon} ${h.name}: ${yearCount(h.id)}/${h.yearGoal}`).join(", ");
    const goalsList = bigGoals.map(g => `${g.done ? "✅" : "⬜"} ${g.text} (${GOAL_CATEGORIES.find(c => c.id === g.category)?.label || g.category})`).join("\n");
    const prompt = `Ты мотивационный коуч. Проанализируй прогресс пользователя по его целям и дай общую оценку + 2-3 конкретных совета.

Цели:
${goalsList || "Целей пока нет"}

Привычки: ${habitSummary || "нет данных"}
Выполнено целей: ${doneCount} из ${bigGoals.length}

Ответь кратко (3-5 предложений), честно и по-русски.`;

    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MISTRAL_API_KEY}` },
        body: JSON.stringify({
          model: "mistral-small-latest",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "Нет ответа.";
      setAiComment(text);
    } catch {
      setAiComment("Ошибка соединения.");
    }
    setAiLoading(false);
  };

  const doneCount = bigGoals.filter(g => g.done).length;
  const pct = bigGoals.length ? Math.round(doneCount / bigGoals.length * 100) : 0;

  const inp = {
    padding:"9px 13px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10,
    background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:13, outline:"none",
    transition:"border-color .2s",
  };

  return (
    <GlassCard style={{ marginBottom:20, overflow:"hidden" }} glow="#a78bfa">
      {/* Header */}
      <div style={{
        padding:"16px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10,
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        background:"linear-gradient(135deg,rgba(167,139,250,0.12),rgba(236,72,153,0.06))",
      }}>
        <div>
          <div style={{ fontWeight:800, fontSize:17, color:"#e2e8f0", letterSpacing:"-0.5px" }}>🎯 Мои цели на год</div>
          <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>
            Выполнено: <span style={{ color:"#a78bfa", fontWeight:700 }}>{doneCount}</span> из <span style={{ color:"#94a3b8" }}>{bigGoals.length}</span>
            {bigGoals.length > 0 && <span style={{ color:"#818cf8", marginLeft:8, fontWeight:700 }}>{pct}%</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {bigGoals.length > 0 && (
            <button onClick={askAIOverall} disabled={aiLoading}
              style={{ background:"linear-gradient(135deg,rgba(167,139,250,0.3),rgba(236,72,153,0.2))", color:"#c4b5fd", border:"1px solid rgba(167,139,250,0.4)", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:700, fontSize:12, transition:"all .2s", opacity: aiLoading ? 0.6 : 1 }}>
              {aiLoading && aiTarget === "overall" ? "🤖 Думаю..." : "🤖 Анализ ИИ"}
            </button>
          )}
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ background: showAdd ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#a78bfa,#ec4899)", color:"white", border:"none", borderRadius:10, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13, transition:"all .2s", boxShadow: showAdd ? "none" : "0 4px 18px rgba(167,139,250,0.4)" }}>
            {showAdd ? "✕ Отмена" : "+ Добавить цель"}
          </button>
        </div>
      </div>

      {/* Overall progress bar */}
      {bigGoals.length > 0 && (
        <div style={{ padding:"10px 22px 0", background:"rgba(0,0,0,0.15)" }}>
          <div style={{ height:5, background:"rgba(255,255,255,0.05)", borderRadius:99, overflow:"hidden" }}>
            <div style={{ width:`${pct}%`, height:"100%", borderRadius:99, background:"linear-gradient(90deg,#a78bfa,#ec4899)", transition:"width .7s cubic-bezier(.34,1.2,.64,1)", boxShadow:"0 0 12px #a78bfa55" }}/>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div style={{ padding:"14px 22px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)", animation:"fadeUp .25s ease" }}>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:6, fontWeight:600 }}>ЦЕЛЬ</div>
              <input value={form.text} onChange={e => setForm({ ...form, text: e.target.value })}
                placeholder="Например: выучить 1000 английских слов"
                style={{ ...inp, width:"100%" }}
                onKeyDown={e => e.key === "Enter" && addGoal()}
                onFocus={e => e.target.style.borderColor = "rgba(167,139,250,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>
            <div>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:6, fontWeight:600 }}>КАТЕГОРИЯ</div>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                style={{ ...inp, background:"rgba(255,255,255,0.07)", cursor:"pointer" }}>
                {GOAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:6, fontWeight:600 }}>ДЕДЛАЙН</div>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                style={{ ...inp }}
                onFocus={e => e.target.style.borderColor = "rgba(167,139,250,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>
            <button onClick={addGoal}
              style={{ background:"linear-gradient(135deg,#a78bfa,#ec4899)", color:"white", border:"none", borderRadius:10, padding:"9px 22px", cursor:"pointer", fontWeight:700, fontSize:13, boxShadow:"0 4px 16px rgba(167,139,250,0.4)", whiteSpace:"nowrap" }}>
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* AI overall comment */}
      {aiComment && aiTarget === "overall" && (
        <div style={{ margin:"14px 22px", padding:"14px 16px", background:"linear-gradient(135deg,rgba(167,139,250,0.1),rgba(236,72,153,0.07))", border:"1px solid rgba(167,139,250,0.25)", borderRadius:12, animation:"fadeUp .3s ease" }}>
          <div style={{ fontSize:11, color:"#a78bfa", fontWeight:700, marginBottom:6 }}>🤖 ИИ-анализ твоих целей</div>
          <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.7 }}>{aiComment}</div>
          <button onClick={() => setAiComment(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#475569", fontSize:11, marginTop:8 }}>✕ Закрыть</button>
        </div>
      )}

      {/* Goals list */}
      <div style={{ padding: bigGoals.length ? "8px 0" : "24px 22px" }}>
        {bigGoals.length === 0 ? (
          <div style={{ textAlign:"center", color:"#334155", fontSize:14 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🎯</div>
            <div>Добавь свои цели на этот год</div>
            <div style={{ fontSize:12, marginTop:6, color:"#2d3748" }}>ИИ поможет их проанализировать и даст советы</div>
          </div>
        ) : (
          bigGoals.map((goal, idx) => {
            const cat = GOAL_CATEGORIES.find(c => c.id === goal.category) || GOAL_CATEGORIES[5];
            const isThisAiLoading = aiLoading && aiTarget === goal.id;
            const isThisComment = aiComment && aiTarget === goal.id;
            return (
              <div key={goal.id} style={{ borderBottom: idx < bigGoals.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", animation:"fadeUp .3s ease" }}>
                <div style={{ padding:"12px 22px", display:"flex", alignItems:"center", gap:12, transition:"background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Checkbox */}
                  <div onClick={() => toggleGoal(goal.id)}
                    style={{
                      width:24, height:24, borderRadius:8, flexShrink:0, cursor:"pointer",
                      border: `2px solid ${goal.done ? cat.color : "rgba(255,255,255,0.18)"}`,
                      background: goal.done ? `linear-gradient(135deg,${cat.color}cc,${cat.color})` : "rgba(255,255,255,0.03)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"all .25s cubic-bezier(.34,1.4,.64,1)",
                      boxShadow: goal.done ? `0 0 14px ${cat.color}55` : "none",
                    }}>
                    {goal.done && <span style={{ color:"#fff", fontSize:13, fontWeight:800, animation:"checkPop .35s cubic-bezier(.34,1.56,.64,1) both" }}>✓</span>}
                  </div>

                  {/* Category icon */}
                  <div style={{ width:30, height:30, borderRadius:9, background:`${cat.color}22`, border:`1px solid ${cat.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
                    {cat.icon}
                  </div>

                  {/* Text */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, color: goal.done ? "#475569" : "#e2e8f0", fontWeight:600, textDecoration: goal.done ? "line-through" : "none", transition:"all .2s", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {goal.text}
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:3, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, color:cat.color, fontWeight:600 }}>{cat.label}</span>
                      {goal.deadline && (
                        <span style={{ fontSize:10, color: new Date(goal.deadline) < new Date() && !goal.done ? "#ef4444" : "#475569" }}>
                          📅 {new Date(goal.deadline+"T00:00:00").toLocaleDateString("ru-RU", { day:"numeric", month:"short" })}
                          {new Date(goal.deadline) < new Date() && !goal.done ? " ⚠️ просрочено" : ""}
                        </span>
                      )}
                      <span style={{ fontSize:10, color:"#334155" }}>добавлено {goal.createdAt}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={() => askAI(goal)} disabled={aiLoading}
                      style={{ background:"rgba(167,139,250,0.15)", border:"1px solid rgba(167,139,250,0.3)", color:"#a78bfa", borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:11, fontWeight:600, transition:"all .2s", opacity: aiLoading ? 0.5 : 1 }}
                      title="Спросить ИИ об этой цели"
                      onMouseEnter={e => !aiLoading && (e.currentTarget.style.background = "rgba(167,139,250,0.28)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(167,139,250,0.15)")}>
                      {isThisAiLoading ? "..." : "🤖"}
                    </button>
                    <button onClick={() => removeGoal(goal.id)}
                      style={{ background:"none", border:"none", color:"#334155", borderRadius:8, padding:"5px 8px", cursor:"pointer", fontSize:14, transition:"color .15s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={e => e.currentTarget.style.color = "#334155"}>
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Per-goal AI comment */}
                {isThisComment && (
                  <div style={{ margin:"0 22px 12px", padding:"12px 14px", background:`linear-gradient(135deg,${cat.color}12,${cat.color}06)`, border:`1px solid ${cat.color}33`, borderRadius:10, animation:"fadeUp .25s ease" }}>
                    <div style={{ fontSize:11, color:cat.color, fontWeight:700, marginBottom:5 }}>🤖 ИИ про эту цель</div>
                    <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.7 }}>{aiComment}</div>
                    <button onClick={() => setAiComment(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#475569", fontSize:11, marginTop:6 }}>✕ Закрыть</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// YEAR VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function YearView({habits,monthCount,yearCount,saveHabits,onMonthClick,bigGoals,saveBigGoals}){
  const [showMgr,setShowMgr]=useState(false);
  const avgPct=habits.length?Math.round(habits.reduce((s,h)=>s+Math.min(100,h.yearGoal?Math.round(yearCount(h.id)/h.yearGoal*100):0),0)/habits.length):0;

  return(
    <div>
      {/* Goals widget */}
      <GoalsWidget bigGoals={bigGoals} saveBigGoals={saveBigGoals} habits={habits} yearCount={yearCount} monthCount={monthCount}/>

      {/* Header card */}
      <GlassCard style={{marginBottom:20,overflow:"hidden"}} glow="#818cf8">
        <div style={{
          padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          background:"linear-gradient(135deg,rgba(129,140,248,0.12),rgba(167,139,250,0.06))",
        }}>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:"#e2e8f0",letterSpacing:"-0.5px"}}>📈 Статистика выполнения задач</div>
            <div style={{color:"#64748b",fontSize:13,marginTop:3}}>
              Задач: <span style={{color:"#94a3b8",fontWeight:600}}>{habits.length}</span>
              {" · "}Средний прогресс: <span style={{color:"#818cf8",fontWeight:700}}>{avgPct}%</span>
            </div>
          </div>
          <button onClick={()=>setShowMgr(!showMgr)}
            style={{
              background:showMgr?"rgba(255,255,255,0.08)":"linear-gradient(135deg,#818cf8,#a78bfa)",
              color:showMgr?"#94a3b8":"white",border:showMgr?"1px solid rgba(255,255,255,0.1)":"none",
              borderRadius:11,padding:"9px 20px",cursor:"pointer",fontWeight:700,fontSize:13,
              transition:"all .25s",boxShadow:showMgr?"none":"0 4px 20px rgba(129,140,248,0.4)",
            }}>
            {showMgr?"✕ Скрыть":"⚙️ Управление задачами"}
          </button>
        </div>

        {showMgr&&(
          <div style={{padding:16,borderBottom:"1px solid rgba(255,255,255,0.06)",animation:"fadeUp .3s ease both"}}>
            <HabitManager habits={habits} saveHabits={saveHabits}/>
          </div>
        )}

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr>
                <th style={{padding:"11px 16px",textAlign:"left",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.3)",minWidth:200,position:"sticky",left:0,zIndex:2,color:"#64748b",fontSize:11,fontWeight:700,letterSpacing:"0.08em"}}>ЗАДАЧА</th>
                {MONTHS_SHORT.map(m=><th key={m} style={{padding:"11px 5px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.3)",color:"#475569",minWidth:44,fontSize:11}}>{m}</th>)}
                <th style={{padding:"11px 8px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.3)",color:"#818cf8",minWidth:48,fontSize:11}}>∑</th>
                <th style={{padding:"11px 8px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.3)",color:"#64748b",minWidth:48,fontSize:11}}>Цель</th>
                <th style={{padding:"11px 16px",textAlign:"left",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.3)",minWidth:130}}>Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h,hi)=>{
                const total=yearCount(h.id);
                const pct=h.yearGoal?Math.min(100,Math.round(total/h.yearGoal*100)):0;
                return(
                  <tr key={h.id} className="hrow">
                    <td style={{padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",background:"rgba(0,0,0,0.2)",position:"sticky",left:0,zIndex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:4,height:18,borderRadius:2,background:h.color,flexShrink:0,boxShadow:`0 0 8px ${h.color}88`}}/>
                        <span style={{fontSize:16}}>{h.icon}</span>
                        <span style={{color:"#cbd5e1",fontWeight:500}}>{h.name}</span>
                      </div>
                    </td>
                    {MONTHS_SHORT.map((_,m)=>{
                      const cnt=monthCount(h.id,m);
                      return(
                        <td key={m} style={{padding:"10px 3px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.04)",
                          color:cnt>0?h.color:"#2d3748",fontWeight:cnt>0?700:400,cursor:"pointer",
                          fontFamily:cnt>0?"'JetBrains Mono',monospace":"inherit",fontSize:cnt>0?12:11,
                          transition:"all .15s"
                        }}
                          onClick={()=>onMonthClick(m)}
                          onMouseEnter={e=>e.currentTarget.style.background=`${h.color}11`}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        >
                          {cnt||"—"}
                        </td>
                      );
                    })}
                    <td style={{padding:"10px 8px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.04)",color:h.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{total}</td>
                    <td style={{padding:"10px 8px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.04)",color:"#475569",fontFamily:"'JetBrains Mono',monospace"}}>{h.yearGoal}</td>
                    <td style={{padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><ProgressBar pct={pct} color={h.color}/></td>
                  </tr>
                );
              })}
              <tr>
                <td style={{padding:"10px 16px",background:"rgba(129,140,248,0.05)",fontWeight:700,color:"#818cf8",fontSize:11,letterSpacing:"0.08em",position:"sticky",left:0,zIndex:1}}>СРЕДНЕЕ</td>
                {MONTHS.map((_,m)=><td key={m} style={{background:"rgba(129,140,248,0.05)",borderTop:"1px solid rgba(255,255,255,0.04)"}}/>)}
                <td style={{background:"rgba(129,140,248,0.05)",borderTop:"1px solid rgba(255,255,255,0.04)"}}/><td style={{background:"rgba(129,140,248,0.05)"}}/>
                <td style={{padding:"10px 16px",background:"rgba(129,140,248,0.05)",borderTop:"1px solid rgba(255,255,255,0.04)"}}><ProgressBar pct={avgPct} color="#818cf8"/></td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div style={{color:"#475569",fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>Динамика по месяцам</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}}>
        {habits.map((h,i)=>{
          const data=MONTHS_SHORT.map((name,m)=>({name,value:monthCount(h.id,m)}));
          return(
            <div key={h.id} className="stagger-child card-lift" style={{
              background:"rgba(15,23,42,0.6)",
              backdropFilter:"blur(20px)",
              border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:16,padding:16,
              boxShadow:"0 4px 30px rgba(0,0,0,0.3)",
              cursor:"default",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:4,height:16,borderRadius:2,background:h.color,boxShadow:`0 0 8px ${h.color}88`}}/>
                <span style={{fontSize:16}}>{h.icon}</span>
                <span style={{fontWeight:600,fontSize:13,color:"#cbd5e1"}}>{h.name}</span>
                <span style={{marginLeft:"auto",fontSize:12,color:h.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{yearCount(h.id)}/{h.yearGoal}</span>
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <AreaChart data={data} margin={{top:2,right:2,left:-22,bottom:0}}>
                  <defs>
                    <linearGradient id={`g${h.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={h.color} stopOpacity={0.35}/>
                      <stop offset="95%" stopColor={h.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                  <XAxis dataKey="name" tick={{fontSize:9,fill:"#475569"}}/>
                  <YAxis tick={{fontSize:9,fill:"#475569"}} allowDecimals={false}/>
                  <Tooltip contentStyle={{background:"rgba(15,23,42,0.95)",border:`1px solid ${h.color}44`,borderRadius:10,fontSize:12,backdropFilter:"blur(10px)"}}/>
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
  const [birthdateStr, setBirthdateStr] = useState(()=>{
    try{ const v=localStorage.getItem("ht-birthdate"); return v||"2008-10-17"; }catch{ return "2008-10-17"; }
  });
  const [editingBirth, setEditingBirth] = useState(false);
  const [tempBirth, setTempBirth] = useState(birthdateStr);

  const birthdate = new Date(birthdateStr+"T00:00:00");
  const saveBirthdate = () => {
    if(!tempBirth) return;
    setBirthdateStr(tempBirth);
    try{ localStorage.setItem("ht-birthdate", tempBirth); }catch{}
    setEditingBirth(false);
  };

  const totalWeeks=LIFE_YEARS*52;
  const livedWeeks=Math.floor((now-birthdate)/MS_WEEK);
  const remainingWeeks=totalWeeks-livedWeeks;
  const livedPct=Math.round(livedWeeks/totalWeeks*100);
  const [hovered,setHovered]=useState(null);

  let ageY=now.getFullYear()-birthdate.getFullYear();
  let ageM=now.getMonth()-birthdate.getMonth();
  if(ageM<0){ageY--;ageM+=12;}

  // Days to 18
  const birthday18 = new Date(birthdate.getFullYear()+18, birthdate.getMonth(), birthdate.getDate());
  const msTo18 = birthday18 - now;
  const daysTo18 = Math.ceil(msTo18 / (1000*60*60*24));
  const is18 = daysTo18 <= 0;

  const milestoneAges={18:"🔞 18",21:"21",25:"25",30:"30",40:"40",50:"50",60:"60",65:"65"};

  const getWeekDate=idx=>{
    const d=new Date(birthdate.getTime()+idx*MS_WEEK);
    return d.toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"});
  };
  const getWeekAge=idx=>{
    const days=idx*7;
    const y=Math.floor(days/365.25);
    const m=Math.floor((days%365.25)/30.4);
    return `${y} лет ${m} мес.`;
  };

  const birthFmt = birthdate.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"});
  const turn70 = new Date(birthdate.getFullYear()+70, birthdate.getMonth(), birthdate.getDate());
  const turn70Fmt = turn70.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"});

  const CELL=9; const GAP=2; const COLS=52;

  const stats=[
    {label:"Возраст",value:`${ageY}л ${ageM}м`,color:"#818cf8",icon:"🎂"},
    {label:"Недель прожито",value:livedWeeks.toLocaleString(),color:"#10b981",icon:"✅"},
    {label:"Недель осталось",value:remainingWeeks.toLocaleString(),color:"#f59e0b",icon:"⏳"},
    {label:"Прожито жизни",value:`${livedPct}%`,color:"#ef4444",icon:"📊"},
    is18
      ? {label:"18 лет уже есть 🎉",value:"Взрослый!",color:"#10b981",icon:"🔞"}
      : {label:"До 18-летия",value:`${daysTo18} дн.`,color:"#ec4899",icon:"🎂"},
  ];

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
        {stats.map((s,i)=>(
          <div key={s.label} className="stagger-child card-lift" style={{
            background:"rgba(15,23,42,0.7)",backdropFilter:"blur(20px)",
            border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"16px 16px",
            boxShadow:"0 4px 30px rgba(0,0,0,0.3)",
          }}>
            <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
            <div className="stat-num" style={{fontSize:22,color:s.color,lineHeight:1,textShadow:`0 0 20px ${s.color}55`}}>{s.value}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Life progress */}
      <GlassCard style={{padding:"16px 20px",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:10}}>
          <span style={{fontWeight:700,color:"#94a3b8",fontSize:14}}>Прогресс жизни</span>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span className="stat-num" style={{color:"#818cf8",fontWeight:700,fontSize:16}}>{livedPct}%</span>
            {editingBirth ? (
              <div style={{display:"flex",gap:8,alignItems:"center",animation:"floatIn .2s ease"}}>
                <input type="date" value={tempBirth} onChange={e=>setTempBirth(e.target.value)}
                  style={{padding:"5px 10px",borderRadius:8,border:"1px solid rgba(129,140,248,0.4)",background:"rgba(255,255,255,0.06)",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
                <button onClick={saveBirthdate}
                  style={{padding:"5px 12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#818cf8,#a78bfa)",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  ОК
                </button>
                <button onClick={()=>setEditingBirth(false)}
                  style={{padding:"5px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#64748b",fontSize:12,cursor:"pointer"}}>
                  ✕
                </button>
              </div>
            ) : (
              <button onClick={()=>{setTempBirth(birthdateStr);setEditingBirth(true);}}
                style={{padding:"5px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#64748b",fontSize:12,cursor:"pointer",transition:"all .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="#818cf8";e.currentTarget.style.borderColor="rgba(129,140,248,0.4)";}}
                onMouseLeave={e=>{e.currentTarget.style.color="#64748b";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>
                ✏️ Дата рождения
              </button>
            )}
          </div>
        </div>
        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,height:14,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{
            width:`${livedPct}%`,height:"100%",borderRadius:8,
            background:"linear-gradient(90deg,#6366f1,#818cf8,#a78bfa)",
            transition:"width 1.2s cubic-bezier(.34,1.2,.64,1)",
            boxShadow:"0 0 20px rgba(129,140,248,0.5)",
            position:"relative",overflow:"hidden",
          }}>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",animation:"shimmer 2.5s linear infinite",backgroundSize:"200% 100%"}}/>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,color:"#334155"}}>
          <span>Рождение: {birthFmt}</span>
          <span>70 лет: {turn70Fmt}</span>
        </div>
        {!is18 && (
          <div style={{marginTop:12,padding:"10px 14px",borderRadius:10,background:"rgba(236,72,153,0.08)",border:"1px solid rgba(236,72,153,0.2)",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>🎂</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#ec4899"}}>До 18-летия: {daysTo18} дней</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                {birthday18.toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}
                {" · "}ещё {Math.floor(daysTo18/365)}г {Math.floor((daysTo18%365)/30)}м {daysTo18%30}д
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard style={{padding:20,overflowX:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontWeight:800,fontSize:17,color:"#e2e8f0",letterSpacing:"-0.5px"}}>⏳ 70 лет в неделях</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:3}}>70 строк × 52 недели = {totalWeeks.toLocaleString()} клеток · Наведи курсор</div>
          </div>
          <div style={{display:"flex",gap:16,fontSize:11,color:"#64748b",flexWrap:"wrap",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:12,borderRadius:3,background:"#818cf8",boxShadow:"0 0 8px #818cf888"}}/>Прожито</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:12,borderRadius:3,background:"#f59e0b",boxShadow:"0 0 8px #f59e0b88"}}/>Сейчас</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:12,borderRadius:3,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}/>Будущее</div>
          </div>
        </div>

        <div style={{display:"flex",marginLeft:62,marginBottom:4}}>
          {[1,10,20,30,40,52].map((w,i,arr)=>(
            <div key={w} style={{width:i<arr.length-1?(arr[i+1]-w)*(CELL+GAP):CELL+GAP,fontSize:9,color:"#2d3748",whiteSpace:"nowrap"}}>
              Нед {w}
            </div>
          ))}
        </div>

        {Array.from({length:LIFE_YEARS},(_,year)=>{
          const ms=milestoneAges[year+1];
          return(
            <div key={year} style={{display:"flex",alignItems:"center",marginBottom:GAP}}>
              <div style={{width:58,fontSize:9,textAlign:"right",paddingRight:7,flexShrink:0,color:ms?"#f59e0b":"#1e293b",fontWeight:ms?700:400,whiteSpace:"nowrap",fontFamily:ms?"'JetBrains Mono',monospace":"inherit"}}>
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
                      style={{width:CELL,height:CELL,borderRadius:2,flexShrink:0,cursor:"default",position:"relative",
                        background:current?"#f59e0b":lived?"#818cf8":"rgba(255,255,255,0.04)",
                        border:current?"2px solid #fbbf24":lived?"none":"1px solid rgba(255,255,255,0.06)",
                        opacity:lived||current?1:0.5,
                        boxShadow:current?"0 0 8px #f59e0baa":hovered===idx?"0 0 0 1.5px #818cf8":"none",
                        zIndex:hovered===idx?10:1,
                        transition:"transform .1s,box-shadow .1s",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {hovered!==null&&(
          <div style={{
            marginTop:16,padding:"10px 18px",
            background:"rgba(15,23,42,0.95)",backdropFilter:"blur(12px)",
            borderRadius:12,border:"1px solid rgba(129,140,248,0.3)",
            fontSize:12,color:"#94a3b8",display:"inline-flex",gap:14,flexWrap:"wrap",alignItems:"center",
            animation:"floatIn .2s ease",boxShadow:"0 8px 30px rgba(0,0,0,0.4),0 0 0 1px rgba(129,140,248,0.1)",
          }}>
            <span style={{color:"#818cf8",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>Неделя {hovered+1}</span>
            <span>Возраст: <span style={{color:"#e2e8f0"}}>{getWeekAge(hovered)}</span></span>
            <span>Начало: <span style={{color:"#e2e8f0"}}>{getWeekDate(hovered)}</span></span>
            {hovered<livedWeeks&&<span style={{color:"#10b981"}}>✅ Прожито</span>}
            {hovered===livedWeeks&&<span style={{color:"#f59e0b"}}>⭐ Текущая неделя!</span>}
            {hovered>livedWeeks&&<span style={{color:"#475569"}}>⏳ Впереди</span>}
          </div>
        )}
      </GlassCard>
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

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"195px 1fr",gap:14,marginBottom:16}}>
        {/* Mini calendar */}
        <GlassCard style={{padding:14}}>
          <div style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:12,color:"#818cf8",marginBottom:10,letterSpacing:"0.1em"}}>{MONTHS[month].toUpperCase()}</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{DAYS_RU.map(d=><th key={d} style={{padding:"3px 0",textAlign:"center",color:"#334155",fontSize:10,fontWeight:600}}>{d}</th>)}</tr></thead>
            <tbody>
              {calWeeks.map((wk,wi)=>(
                <tr key={wi}>{wk.map((d,di)=>(
                  <td key={di} style={{padding:"2px 0",textAlign:"center"}}>
                    <span style={{
                      display:"inline-flex",alignItems:"center",justifyContent:"center",width:24,height:24,borderRadius:"50%",
                      background:isToday(d)?"linear-gradient(135deg,#818cf8,#a78bfa)":"transparent",
                      color:isToday(d)?"white":d?"#94a3b8":"transparent",
                      fontSize:10,fontWeight:isToday(d)?700:400,
                      boxShadow:isToday(d)?"0 2px 8px rgba(129,140,248,0.5)":"none",
                    }}>
                      {d||""}
                    </span>
                  </td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </GlassCard>

        {/* Goal card */}
        <GlassCard style={{padding:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <span style={{fontWeight:700,fontSize:15,color:"#818cf8"}}>🎯 Цель месяца</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowMgr(!showMgr)}
                style={{background:showMgr?"rgba(129,140,248,0.15)":"rgba(255,255,255,0.06)",color:showMgr?"#818cf8":"#94a3b8",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,transition:"all .2s"}}>
                {showMgr?"✕ Скрыть":"⚙️ Задачи"}
              </button>
              {editGoal
                ?<><button onClick={saveGoal} style={{background:"linear-gradient(135deg,#818cf8,#a78bfa)",color:"white",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:12,boxShadow:"0 2px 12px rgba(129,140,248,0.4)"}}>Сохранить</button>
                   <button onClick={()=>{setEditGoal(false);setGoalText(monthGoals[goalKey]||"");}} style={{background:"rgba(255,255,255,0.06)",color:"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12}}>Отмена</button></>
                :<button onClick={()=>setEditGoal(true)} style={{background:"rgba(255,255,255,0.06)",color:"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,transition:"all .2s"}}>✏️ Редактировать</button>
              }
            </div>
          </div>
          {editGoal
            ?<textarea value={goalText} onChange={e=>setGoalText(e.target.value)} placeholder="Опишите цели на месяц…"
                style={{width:"100%",minHeight:90,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:12,color:"#e2e8f0",fontSize:13,outline:"none",resize:"vertical",lineHeight:1.7,backdropFilter:"blur(4px)"}}/>
            :<div style={{color:goalText?"#cbd5e1":"#334155",fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap",fontStyle:goalText?"normal":"italic",minHeight:60}}>
                {goalText||"Нажмите «Редактировать» чтобы добавить цели на месяц"}
              </div>
          }
        </GlassCard>
      </div>

      {showMgr&&(
        <div style={{marginBottom:16,animation:"fadeUp .3s ease"}}>
          <HabitManager habits={habits} saveHabits={saveHabits} onClose={()=>setShowMgr(false)}/>
        </div>
      )}

      <GlassCard style={{overflow:"hidden",marginBottom:14}}>
        <div style={{
          padding:"12px 18px",
          background:"linear-gradient(135deg,rgba(129,140,248,0.12),rgba(167,139,250,0.06))",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{fontWeight:800,fontSize:15,color:"#e2e8f0",letterSpacing:"-0.3px"}}>📋 Ежедневные задачи — {MONTHS[month]} {YEAR}</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr>
                <th rowSpan={2} style={{padding:"8px 16px",textAlign:"left",borderBottom:"2px solid rgba(255,255,255,0.06)",borderRight:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.4)",position:"sticky",left:0,zIndex:3,minWidth:185,color:"#64748b",fontSize:11,fontWeight:700,letterSpacing:"0.08em"}}>ЗАДАЧА</th>
                {gridWeeks.map((wk,wi)=>(
                  <th key={wi} colSpan={7} style={{padding:"6px 2px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.04)",borderLeft:"2px solid rgba(255,255,255,0.06)",background:wi%2===0?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.2)",color:"#475569",fontSize:10,fontWeight:600}}>
                    Нед. {wi+1}
                  </th>
                ))}
                <th colSpan={3} style={{padding:"6px 9px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.04)",borderLeft:"2px solid rgba(255,255,255,0.06)",background:"rgba(129,140,248,0.1)",color:"#818cf8",fontSize:10,fontWeight:600,minWidth:135}}>ПРОГРЕСС</th>
              </tr>
              <tr>
                {gridWeeks.map((wk,wi)=>wk.map((d,di)=>(
                  <th key={`${wi}-${di}`} style={{padding:"4px 1px",textAlign:"center",borderBottom:"2px solid rgba(255,255,255,0.06)",borderLeft:di===0?"2px solid rgba(255,255,255,0.06)":"1px solid rgba(255,255,255,0.03)",width:28,minWidth:28,background:isToday(d)?"rgba(129,140,248,0.15)":wi%2===0?"rgba(0,0,0,0.25)":"rgba(0,0,0,0.15)"}}>
                    <div style={{fontSize:9,fontWeight:isToday(d)?700:400,color:isToday(d)?"#818cf8":d?"#475569":"transparent"}}>{d||""}</div>
                    <div style={{fontSize:8,color:"#2d3748"}}>{d?DAYS_RU[(new Date(YEAR,month,d).getDay()+6)%7]:""}</div>
                  </th>
                )))}
                <th style={{padding:"4px 5px",borderLeft:"2px solid rgba(255,255,255,0.06)",background:"rgba(129,140,248,0.1)",fontSize:10,color:"#818cf8",textAlign:"center"}}>✓</th>
                <th style={{padding:"4px 5px",background:"rgba(129,140,248,0.1)",fontSize:10,color:"#64748b",textAlign:"center"}}>Цель</th>
                <th style={{padding:"4px 9px",background:"rgba(129,140,248,0.1)",fontSize:10,color:"#64748b",textAlign:"left",minWidth:110}}>%</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h,hi)=>{
                const total=monthCount(h.id,month);
                const goal=hMonthGoal(h);
                const pct=goal?Math.min(100,Math.round(total/goal*100)):0;
                return(
                  <tr key={h.id} className="hrow" style={{background:hi%2===0?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.12)"}}>
                    <td style={{padding:"6px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",borderRight:"1px solid rgba(255,255,255,0.04)",background:hi%2===0?"rgba(0,0,0,0.35)":"rgba(0,0,0,0.25)",position:"sticky",left:0,zIndex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,whiteSpace:"nowrap"}}>
                        <div style={{width:3,height:14,borderRadius:2,background:h.color,boxShadow:`0 0 6px ${h.color}88`}}/>
                        <span style={{fontSize:15}}>{h.icon}</span>
                        <span style={{color:"#cbd5e1",fontWeight:500,fontSize:12}}>{h.name}</span>
                      </div>
                    </td>
                    {gridWeeks.map((wk,wi)=>wk.map((d,di)=>{
                      const ds=d?mkDate(month,d):null;
                      const checked=ds&&completions[ds]?.[h.id];
                      return(
                        <td key={`${wi}-${di}`} style={{padding:"3px 1px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.04)",borderLeft:di===0?"2px solid rgba(255,255,255,0.05)":"1px solid rgba(255,255,255,0.02)",background:isToday(d)?"rgba(129,140,248,0.08)":"transparent"}}>
                          {d?<CheckCell checked={!!checked} today={isToday(d)} future={isFuture(d)} color={h.color} onToggle={()=>toggle(ds,h.id)}/>:null}
                        </td>
                      );
                    }))}
                    <td style={{padding:"6px 5px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.04)",borderLeft:"2px solid rgba(255,255,255,0.05)",color:h.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{total}</td>
                    <td style={{padding:"6px 5px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.04)",color:"#475569",fontFamily:"'JetBrains Mono',monospace"}}>{goal}</td>
                    <td style={{padding:"6px 9px",borderBottom:"1px solid rgba(255,255,255,0.04)",minWidth:110}}><ProgressBar pct={pct} color={h.color} height={6}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCE VIEW
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

  const bankMap = {};
  finances.forEach(f => {
    if (!bankMap[f.bank]) bankMap[f.bank] = { income: 0, expense: 0 };
    bankMap[f.bank][f.type] += f.amount;
  });

  const fmt = n => n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const inp = {
    padding:"10px 13px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10,
    background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:13, outline:"none",
    backdropFilter:"blur(4px)", transition:"all .2s",
  };

  const summaryCards = [
    { label:"Баланс", value:`${balance >= 0 ? "+" : ""}${fmt(balance)} ₽`, color: balance >= 0 ? "#10b981" : "#ef4444", icon:"💳", glow: balance >= 0 ? "#10b981" : "#ef4444" },
    { label:"Доходы", value:`+${fmt(totalIncome)} ₽`, color:"#10b981", icon:"📈", glow:"#10b981" },
    { label:"Расходы", value:`−${fmt(totalExpense)} ₽`, color:"#ef4444", icon:"📉", glow:"#ef4444" },
    { label:"Записей", value:finances.length, color:"#818cf8", icon:"📝", glow:"#818cf8" },
  ];

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:20 }}>
        {summaryCards.map((s,i) => (
          <div key={s.label} className="stagger-child card-lift" style={{
            background:"rgba(15,23,42,0.7)",backdropFilter:"blur(20px)",
            border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"18px 18px",
            boxShadow:`0 4px 30px rgba(0,0,0,0.3), 0 0 40px ${s.glow}11`,
          }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
            <div className="stat-num" style={{ fontSize:20, color:s.color, lineHeight:1, textShadow:`0 0 20px ${s.color}44` }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#64748b", marginTop:5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {Object.keys(bankMap).length > 0 && (
        <GlassCard style={{ padding:18, marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#94a3b8", marginBottom:14 }}>🏦 Балансы по счетам</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            {Object.entries(bankMap).map(([bank, {income, expense}]) => {
              const bal = income - expense;
              return (
                <div key={bank} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"12px 18px", minWidth:150, transition:"all .2s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
                >
                  <div style={{ fontSize:12, color:"#64748b", marginBottom:5 }}>🏦 {bank}</div>
                  <div className="stat-num" style={{ fontSize:18, color: bal >= 0 ? "#10b981" : "#ef4444", textShadow:`0 0 16px ${bal >= 0 ? "#10b981" : "#ef4444"}44` }}>
                    {bal >= 0 ? "+" : ""}{fmt(bal)} ₽
                  </div>
                  <div style={{ fontSize:10, color:"#475569", marginTop:4 }}>↑{fmt(income)} · ↓{fmt(expense)}</div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:16, alignItems:"start" }}>
        <GlassCard style={{ overflow:"hidden" }}>
          <div style={{ padding:"13px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"linear-gradient(135deg,rgba(129,140,248,0.1),rgba(167,139,250,0.05))" }}>
            <span style={{ fontWeight:700, fontSize:14, color:"#e2e8f0" }}>➕ Новая запись</span>
            <button onClick={()=>setShowForm(!showForm)} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8", cursor:"pointer", fontSize:13, borderRadius:8, padding:"4px 10px", transition:"all .2s" }}>
              {showForm ? "▲" : "▼"}
            </button>
          </div>

          {showForm && (
            <div style={{ padding:18, display:"flex", flexDirection:"column", gap:12, animation:"fadeUp .3s ease" }}>
              <div style={{ display:"flex", borderRadius:11, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)" }}>
                {[{v:"income",label:"📈 Доход",c:"#10b981"},{v:"expense",label:"📉 Расход",c:"#ef4444"}].map(t=>(
                  <button key={t.v} onClick={()=>setForm(p=>({...p,type:t.v}))}
                    style={{ flex:1, padding:"10px 6px", border:"none", cursor:"pointer", fontWeight:700, fontSize:12,
                      background: form.type===t.v ? `${t.c}22` : "rgba(255,255,255,0.03)",
                      color: form.type===t.v ? t.c : "#475569",
                      borderRight: t.v==="income" ? "1px solid rgba(255,255,255,0.06)" : "none",
                      transition:"all .2s",boxShadow:form.type===t.v?`inset 0 0 20px ${t.c}11`:"none" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:6, fontWeight:600, letterSpacing:"0.06em" }}>🏦 Банк / Счёт</div>
                {customBank
                  ? <div style={{ display:"flex", gap:8 }}>
                      <input value={form.bank} onChange={e=>setForm(p=>({...p,bank:e.target.value}))} placeholder="Введите название" style={{...inp,flex:1}}/>
                      <button onClick={()=>{setCustomBank(false);setForm(p=>({...p,bank:""}));}} style={{background:"rgba(255,255,255,0.06)",color:"#94a3b8",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,padding:"0 12px",cursor:"pointer",fontSize:12}}>✕</button>
                    </div>
                  : <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {PRESET_BANKS.map(b => (
                        <button key={b} onClick={()=>{ if(b==="Другой"){setCustomBank(true);setForm(p=>({...p,bank:""}));}else setForm(p=>({...p,bank:b})); }}
                          style={{ padding:"7px 12px", borderRadius:9, border:"1px solid", cursor:"pointer", fontSize:12, fontWeight:500, transition:"all .2s",
                            borderColor: form.bank===b ? "rgba(129,140,248,0.5)" : "rgba(255,255,255,0.08)",
                            background: form.bank===b ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.04)",
                            color: form.bank===b ? "#c7d2fe" : "#64748b",
                            boxShadow: form.bank===b ? "0 0 12px rgba(129,140,248,0.2)" : "none" }}>
                          {b}
                        </button>
                      ))}
                      {banks.filter(b=>!PRESET_BANKS.includes(b)).map(b=>(
                        <button key={b} onClick={()=>setForm(p=>({...p,bank:b}))}
                          style={{ padding:"7px 12px", borderRadius:9, border:"1px solid", cursor:"pointer", fontSize:12, fontWeight:500, transition:"all .2s",
                            borderColor: form.bank===b ? "rgba(129,140,248,0.5)" : "rgba(255,255,255,0.08)",
                            background: form.bank===b ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.04)",
                            color: form.bank===b ? "#c7d2fe" : "#64748b" }}>
                          {b}
                        </button>
                      ))}
                    </div>
                }
              </div>

              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:6, fontWeight:600, letterSpacing:"0.06em" }}>💰 Сумма (₽)</div>
                <input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
                  placeholder="0.00" min="0" style={{...inp,width:"100%",fontSize:16,fontFamily:"'JetBrains Mono',monospace",color:form.type==="income"?"#10b981":"#ef4444"}}/>
              </div>

              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:6, fontWeight:600, letterSpacing:"0.06em" }}>📝 Описание</div>
                <input value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}
                  placeholder="За что? (необязательно)" style={{...inp,width:"100%"}}
                  onKeyDown={e=>e.key==="Enter"&&addTx()}/>
              </div>

              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:6, fontWeight:600, letterSpacing:"0.06em" }}>📅 Дата</div>
                <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
                  style={{...inp,width:"100%"}}/>
              </div>

              <button onClick={addTx}
                style={{
                  background: form.type==="income" ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)",
                  color:"white", border:"none", borderRadius:11, padding:"12px", cursor:"pointer",
                  fontWeight:700, fontSize:14, marginTop:2, transition:"all .2s",
                  boxShadow: form.type==="income" ? "0 4px 20px rgba(16,185,129,0.4)" : "0 4px 20px rgba(239,68,68,0.4)",
                }}>
                {form.type==="income" ? "📈 Добавить доход" : "📉 Добавить расход"}
              </button>
            </div>
          )}
        </GlassCard>

        <GlassCard style={{ overflow:"hidden" }}>
          <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"linear-gradient(135deg,rgba(129,140,248,0.08),transparent)" }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#e2e8f0", marginBottom:10 }}>📋 История транзакций</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[
                <select key="type" value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ padding:"6px 10px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, background:"rgba(255,255,255,0.05)", color:"#94a3b8", fontSize:12, outline:"none", backdropFilter:"blur(4px)" }}>
                  <option value="all">Все типы</option>
                  <option value="income">Доходы</option>
                  <option value="expense">Расходы</option>
                </select>,
                <select key="bank" value={filterBank} onChange={e=>setFilterBank(e.target.value)} style={{ padding:"6px 10px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, background:"rgba(255,255,255,0.05)", color:"#94a3b8", fontSize:12, outline:"none", backdropFilter:"blur(4px)" }}>
                  <option value="all">Все счета</option>
                  {banks.map(b=><option key={b} value={b}>{b}</option>)}
                </select>,
                <select key="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{ padding:"6px 10px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, background:"rgba(255,255,255,0.05)", color:"#94a3b8", fontSize:12, outline:"none", backdropFilter:"blur(4px)" }}>
                  <option value="all">Все месяцы</option>
                  {MONTHS_SHORT.map((m,i)=><option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>)}
                </select>,
              ]}
              <span style={{ marginLeft:"auto", fontSize:12, color:"#475569", alignSelf:"center" }}>{filtered.length} записей</span>
            </div>
          </div>

          <div style={{ maxHeight:520, overflowY:"auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding:50, textAlign:"center", color:"#475569", fontSize:13 }}>
                <div style={{ fontSize:36, marginBottom:12, opacity:0.5 }}>📭</div>
                Записей нет. Добавьте первую транзакцию!
              </div>
            ) : filtered.map((tx, i) => (
              <div key={tx.id} className="tx-row"
                style={{ display:"flex", alignItems:"center", gap:13, padding:"12px 18px",
                  borderBottom: i < filtered.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  background: "transparent", transition:"background .15s" }}>
                <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17,
                  background: tx.type==="income" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  border: `1px solid ${tx.type==="income" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}>
                  {tx.type==="income" ? "📈" : "📉"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:"#cbd5e1", whiteSpace:"nowrap" }}>🏦 {tx.bank}</span>
                    {tx.desc && <span style={{ fontSize:12, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>· {tx.desc}</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#334155", fontFamily:"'JetBrains Mono',monospace" }}>{tx.date}</div>
                </div>
                <div className="stat-num" style={{ fontSize:15, flexShrink:0,
                  color: tx.type==="income" ? "#10b981" : "#ef4444",
                  textShadow:`0 0 12px ${tx.type==="income" ? "#10b98144" : "#ef444444"}`,
                }}>
                  {tx.type==="income" ? "+" : "−"}{fmt(tx.amount)} ₽
                </div>
                <button onClick={()=>deleteTx(tx.id)}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#2d3748", fontSize:16, padding:"3px 6px", flexShrink:0, transition:"color .15s", borderRadius:6 }}
                  onMouseOver={e=>e.target.style.color="#ef4444"} onMouseOut={e=>e.target.style.color="#2d3748"}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI CHAT VIEW
// ═══════════════════════════════════════════════════════════════════════════════
const MISTRAL_API_KEY = "Ygx6OSFbtJRKDeHuJ0VrHU5lyAh2w1Md";

const CHAT_STORAGE_KEY = "ht-ai-chat-messages";

function AIChatView({ habits, finances, monthCount, yearCount }) {
  const [messages, setMessages] = useState(() => {
    try { const v = localStorage.getItem(CHAT_STORAGE_KEY); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

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
    const bankStats = Object.entries(bankMap).map(([bank, {income, expense}]) =>
      `  • ${bank}: баланс ${(income-expense).toFixed(0)} ₽ (доходы ${income.toFixed(0)}, расходы ${expense.toFixed(0)})`
    ).join("\n");

    return `Ты личный коуч и аналитик. Отвечай кратко, по делу, на русском. Используй данные пользователя:

ЗАДАЧИ (${YEAR}):
${habitsStats || "  нет данных"}

ФИНАНСЫ:
  Баланс: ${balance.toFixed(0)} ₽
  Доходы: ${totalIncome.toFixed(0)} ₽
  Расходы: ${totalExpense.toFixed(0)} ₽
${bankStats ? `По счетам:\n${bankStats}` : ""}

Давай конкретные, мотивирующие советы. Будь кратким (до 200 слов).`;
  };

  const QUICK_PROMPTS = ["📊 Анализ задач", "💪 Слабые места", "💰 Финансы", "🎯 Что улучшить?", "🔥 Мотивируй!"];

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
          messages: [{ role: "system", content: buildSystemPrompt() }, ...newMessages]
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
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 140px)", minHeight:500 }}>
      {/* Header */}
      <div style={{
        padding:"14px 20px",display:"flex",alignItems:"center",gap:14,
        background:"rgba(15,23,42,0.8)",backdropFilter:"blur(20px)",
        border:"1px solid rgba(255,255,255,0.08)",borderRadius:"16px 16px 0 0",
        borderBottom:"none",
        background:"linear-gradient(135deg,rgba(129,140,248,0.15),rgba(167,139,250,0.08))",
      }}>
        <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#818cf8,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, boxShadow:"0 4px 20px rgba(129,140,248,0.5)" }}>🤖</div>
        <div>
          <div style={{ fontWeight:800, fontSize:16, color:"#e2e8f0", letterSpacing:"-0.4px" }}>ИИ Ассистент</div>
          <div style={{ fontSize:11, color:"#64748b", marginTop:1 }}>Анализирует задачи и финансы · Mistral AI</div>
        </div>
        {messages.length > 0 && (
          showClearConfirm ? (
            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center", animation:"floatIn .2s ease" }}>
              <span style={{ fontSize:12, color:"#94a3b8" }}>Удалить историю?</span>
              <button onClick={()=>{ setMessages([]); try{localStorage.removeItem(CHAT_STORAGE_KEY);}catch{} setShowClearConfirm(false); }}
                style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
                Да
              </button>
              <button onClick={()=>setShowClearConfirm(false)}
                style={{ background:"rgba(255,255,255,0.06)", color:"#64748b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12 }}>
                Отмена
              </button>
            </div>
          ) : (
            <button onClick={()=>setShowClearConfirm(true)} style={{ marginLeft:"auto", background:"rgba(255,255,255,0.06)", color:"#64748b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, padding:"7px 14px", cursor:"pointer", fontSize:12, transition:"all .2s" }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,0.1)";e.currentTarget.style.color="#ef4444";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="#64748b";}}>
              🗑️ Удалить историю
            </button>
          )
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", background:"rgba(6,11,24,0.6)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.06)", borderTop:"none", borderBottom:"none", padding:"20px", display:"flex", flexDirection:"column", gap:14 }}>
        {messages.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:24 }}>
            <div style={{ fontSize:56, animation:"pulse 3s ease infinite" }}>🤖</div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontWeight:800, fontSize:18, color:"#e2e8f0", marginBottom:8, letterSpacing:"-0.5px" }}>Привет! Я твой личный коуч.</div>
              <div style={{ fontSize:13, color:"#64748b", maxWidth:400, lineHeight:1.7 }}>Я вижу твои задачи и финансы. Спроси что угодно — проанализирую и дам советы.</div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", maxWidth:480 }}>
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={()=>send(p)}
                  style={{ padding:"9px 16px", borderRadius:22, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#94a3b8", cursor:"pointer", fontSize:12, fontWeight:500, transition:"all .2s", backdropFilter:"blur(8px)" }}
                  onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(129,140,248,0.5)";e.currentTarget.style.color="#c7d2fe";e.currentTarget.style.background="rgba(129,140,248,0.1)";}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#94a3b8";e.currentTarget.style.background="rgba(255,255,255,0.05)";}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ display:"flex", gap:11, alignItems:"flex-start", flexDirection: m.role==="user" ? "row-reverse" : "row", animation:"floatIn .3s ease" }}>
              <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17,
                background: m.role==="user" ? "rgba(129,140,248,0.2)" : "linear-gradient(135deg,#818cf8,#a78bfa)",
                border: m.role==="user" ? "1px solid rgba(129,140,248,0.3)" : "none",
                boxShadow: m.role==="assistant" ? "0 4px 16px rgba(129,140,248,0.4)" : "none",
              }}>
                {m.role==="user" ? "👤" : "🤖"}
              </div>
              <div style={{ maxWidth:"72%", padding:"12px 16px",
                borderRadius: m.role==="user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                background: m.role==="user" ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${m.role==="user" ? "rgba(129,140,248,0.3)" : "rgba(255,255,255,0.08)"}`,
                backdropFilter:"blur(12px)",
                color:"#e2e8f0", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap",
              }}>
                {m.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display:"flex", gap:11, alignItems:"flex-start", animation:"floatIn .3s ease" }}>
            <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, background:"linear-gradient(135deg,#818cf8,#a78bfa)", boxShadow:"0 4px 16px rgba(129,140,248,0.4)" }}>🤖</div>
            <div style={{ padding:"14px 18px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"4px 16px 16px 16px", display:"flex", gap:6, alignItems:"center", backdropFilter:"blur(12px)" }}>
              {[0,1,2].map(i=>(
                <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#818cf8", animation:`bounce 1.2s ${i*0.2}s infinite`, boxShadow:"0 0 8px rgba(129,140,248,0.6)" }}/>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ background:"rgba(15,23,42,0.9)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)", borderTop:"1px solid rgba(255,255,255,0.06)", borderRadius:"0 0 16px 16px", padding:"13px 16px", display:"flex", gap:10, alignItems:"flex-end" }}>
        <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Напиши вопрос или попроси анализ… (Enter — отправить)"
          rows={1} style={{ flex:1, padding:"11px 15px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:13, outline:"none", resize:"none", lineHeight:1.5, minHeight:44, maxHeight:120, transition:"all .2s", backdropFilter:"blur(4px)" }}
          onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}/>
        <button onClick={()=>send()} disabled={!input.trim()||loading}
          style={{ width:44, height:44, borderRadius:12, border:"none", cursor:input.trim()&&!loading?"pointer":"not-allowed", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, transition:"all .25s",
            background: input.trim()&&!loading ? "linear-gradient(135deg,#818cf8,#a78bfa)" : "rgba(255,255,255,0.06)",
            opacity: input.trim()&&!loading ? 1 : 0.4,
            boxShadow: input.trim()&&!loading ? "0 4px 20px rgba(129,140,248,0.5)" : "none",
          }}>
          {loading ? <div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid white",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> : "➤"}
        </button>
      </div>

      {messages.length > 0 && (
        <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:10 }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={()=>send(p)} disabled={loading}
              style={{ padding:"6px 13px", borderRadius:16, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"#64748b", cursor:"pointer", fontSize:11, transition:"all .2s", backdropFilter:"blur(4px)" }}
              onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(129,140,248,0.4)";e.currentTarget.style.color="#c7d2fe";}}
              onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.color="#64748b";}}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function MotivationView() {
  const [videos, setVideos] = useState(() => {
    try { const v = localStorage.getItem("ht-motivation-videos"); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState("");

  const extractVideoId = (url) => {
    try {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      ];
      for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
    } catch {}
    return null;
  };

  const addVideo = () => {
    const url = input.trim();
    if (!url) return;
    const id = extractVideoId(url);
    if (!id) { setError("❌ Не удалось распознать ссылку YouTube"); return; }
    if (videos.find(v => v.id === id)) { setError("⚠️ Это видео уже добавлено"); return; }
    const newVideos = [...videos, { id, url, addedAt: Date.now() }];
    setVideos(newVideos);
    localStorage.setItem("ht-motivation-videos", JSON.stringify(newVideos));
    setActiveIdx(newVideos.length - 1);
    setInput("");
    setError("");
  };

  const removeVideo = (idx) => {
    const newVideos = videos.filter((_, i) => i !== idx);
    setVideos(newVideos);
    localStorage.setItem("ht-motivation-videos", JSON.stringify(newVideos));
    setActiveIdx(Math.min(activeIdx, newVideos.length - 1));
  };

  const inp = {
    padding:"10px 14px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:11,
    background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:13, outline:"none",
    backdropFilter:"blur(4px)", transition:"all .2s",
  };

  return (
    <div>
      {/* Header */}
      <GlassCard style={{padding:"18px 22px",marginBottom:20,overflow:"hidden"}} glow="#ef4444">
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:52,height:52,borderRadius:16,background:"linear-gradient(135deg,#ef4444,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,boxShadow:"0 6px 24px rgba(239,68,68,0.5)"}}>🔥</div>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:"#e2e8f0",letterSpacing:"-0.5px"}}>Мотивационные видео</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:3}}>Добавляй YouTube ссылки — смотри прямо здесь · <span style={{color:"#94a3b8"}}>{videos.length} видео</span></div>
          </div>
        </div>
      </GlassCard>

      {/* Add input */}
      <GlassCard style={{padding:20,marginBottom:20}}>
        <div style={{fontSize:11,color:"#64748b",marginBottom:10,fontWeight:700,letterSpacing:"0.1em"}}>ДОБАВИТЬ ВИДЕО</div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <input
            value={input}
            onChange={e=>{setInput(e.target.value);setError("");}}
            onKeyDown={e=>e.key==="Enter"&&addVideo()}
            placeholder="Вставь ссылку YouTube (youtu.be/... или youtube.com/watch?v=...)"
            style={{...inp,flex:1}}
          />
          <button
            onClick={addVideo}
            style={{padding:"10px 22px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#ef4444,#f97316)",color:"white",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",boxShadow:"0 4px 16px rgba(239,68,68,0.4)",transition:"all .2s"}}>
            + Добавить
          </button>
        </div>
        {error && <div style={{marginTop:10,fontSize:12,color:"#ef4444",padding:"8px 12px",background:"rgba(239,68,68,0.1)",borderRadius:8,border:"1px solid rgba(239,68,68,0.2)",animation:"floatIn .2s ease"}}>{error}</div>}
      </GlassCard>

      {videos.length === 0 ? (
        <GlassCard style={{padding:"70px 20px",textAlign:"center"}}>
          <div style={{fontSize:60,marginBottom:18,opacity:0.6}}>🎬</div>
          <div style={{fontWeight:800,fontSize:18,color:"#e2e8f0",marginBottom:8,letterSpacing:"-0.5px"}}>Пока нет видео</div>
          <div style={{fontSize:13,color:"#64748b",maxWidth:380,margin:"0 auto",lineHeight:1.7}}>Вставь ссылку на YouTube видео выше — оно появится здесь с встроенным плеером</div>
        </GlassCard>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:16,alignItems:"start"}}>
          {/* Player */}
          <GlassCard style={{overflow:"hidden"}}>
            <div style={{position:"relative",paddingBottom:"56.25%",height:0,background:"#000",borderRadius:"16px 16px 0 0",overflow:"hidden"}}>
              <iframe
                key={videos[activeIdx]?.id}
                src={`https://www.youtube.com/embed/${videos[activeIdx]?.id}?autoplay=0&rel=0&modestbranding=1`}
                title="YouTube player"
                style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div style={{padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:12,color:"#64748b",fontFamily:"'JetBrains Mono',monospace"}}>Видео {activeIdx+1}/{videos.length}</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setActiveIdx(i=>Math.max(0,i-1))} disabled={activeIdx===0}
                  style={{padding:"6px 14px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.05)",color:activeIdx===0?"#2d3748":"#94a3b8",cursor:activeIdx===0?"not-allowed":"pointer",fontSize:12,fontWeight:600,transition:"all .2s"}}>
                  ← Пред
                </button>
                <button onClick={()=>setActiveIdx(i=>Math.min(videos.length-1,i+1))} disabled={activeIdx===videos.length-1}
                  style={{padding:"6px 14px",borderRadius:9,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.05)",color:activeIdx===videos.length-1?"#2d3748":"#94a3b8",cursor:activeIdx===videos.length-1?"not-allowed":"pointer",fontSize:12,fontWeight:600,transition:"all .2s"}}>
                  След →
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Playlist */}
          <GlassCard style={{overflow:"hidden",maxHeight:600}}>
            <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.03)"}}>
              <span style={{fontWeight:700,fontSize:13,color:"#e2e8f0"}}>📋 Плейлист ({videos.length})</span>
            </div>
            <div style={{overflowY:"auto",maxHeight:540}}>
              {videos.map((v, i) => (
                <div key={v.id}
                  onClick={()=>setActiveIdx(i)}
                  style={{display:"flex",gap:10,padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.04)",background:i===activeIdx?"rgba(239,68,68,0.1)":"transparent",transition:"background .2s",alignItems:"center"}}
                  onMouseEnter={e=>{if(i!==activeIdx)e.currentTarget.style.background="rgba(255,255,255,0.04)";}}
                  onMouseLeave={e=>{if(i!==activeIdx)e.currentTarget.style.background="transparent";}}>
                  <div style={{position:"relative",flexShrink:0}}>
                    <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt=""
                      style={{width:78,height:44,objectFit:"cover",borderRadius:8,display:"block",border:i===activeIdx?"2px solid rgba(239,68,68,0.6)":"2px solid transparent",transition:"border .2s"}}/>
                    {i===activeIdx&&(
                      <div style={{position:"absolute",inset:0,background:"rgba(239,68,68,0.4)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>▶</div>
                    )}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,color:"#475569",fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      youtu.be/{v.id}
                    </div>
                    {i===activeIdx&&<div style={{fontSize:10,color:"#ef4444",fontWeight:700,marginTop:3}}>● Сейчас играет</div>}
                  </div>
                  <button onClick={e=>{e.stopPropagation();removeVideo(i);}}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#334155",fontSize:15,padding:"3px 5px",flexShrink:0,borderRadius:6,transition:"color .15s"}}
                    title="Удалить"
                    onMouseOver={e=>e.currentTarget.style.color="#ef4444"}
                    onMouseOut={e=>e.currentTarget.style.color="#334155"}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// POMODORO VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function PomodoroView() {
  const [settings, setSettings] = useState(() => {
    try { const v = localStorage.getItem("ht-pomo-settings"); return v ? JSON.parse(v) : { work: 25, short: 5, long: 15, longAfter: 4 }; } catch { return { work: 25, short: 5, long: 15, longAfter: 4 }; }
  });
  const [mode, setMode] = useState("work"); // work | short | long
  const [timeLeft, setTimeLeft] = useState(settings.work * 60);
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [editSettings, setEditSettings] = useState({ ...settings });
  const [log, setLog] = useState(() => {
    try { const v = localStorage.getItem("ht-pomo-log"); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const intervalRef = useRef(null);
  const audioCtx = useRef(null);

  const MODES = {
    work:  { label: "Работа",       color: "#818cf8", icon: "💼", dur: settings.work  },
    short: { label: "Короткий перерыв", color: "#10b981", icon: "☕", dur: settings.short },
    long:  { label: "Длинный перерыв",  color: "#f59e0b", icon: "🌿", dur: settings.long  },
  };

  const playBeep = () => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      // Three loud beeps with longer duration
      const beeps = [
        { delay: 0,    freq: 880, dur: 0.6 },
        { delay: 0.75, freq: 880, dur: 0.6 },
        { delay: 1.5,  freq: 1046, dur: 1.0 },
      ];
      beeps.forEach(({ delay, freq, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + delay + 0.05);
        gain.gain.setValueAtTime(0.5, ctx.currentTime + delay + dur - 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      });
    } catch {}
  };

  const switchMode = (newMode, newSession) => {
    setMode(newMode);
    setTimeLeft(MODES[newMode] ? (newMode === "work" ? settings.work : newMode === "short" ? settings.short : settings.long) * 60 : settings.work * 60);
    setRunning(false);
    if (newSession !== undefined) setSession(newSession);
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            playBeep();
            setRunning(false);
            // Log completed session
            if (mode === "work") {
              const entry = { id: Date.now(), date: new Date().toISOString().slice(0,10), duration: settings.work, ts: Date.now() };
              setLog(prev => {
                const next = [entry, ...prev].slice(0, 200);
                try { localStorage.setItem("ht-pomo-log", JSON.stringify(next)); } catch {}
                return next;
              });
              const nextSess = session + 1;
              setSession(nextSess);
              if ((nextSess - 1) % settings.longAfter === 0) {
                switchMode("long");
              } else {
                switchMode("short");
              }
            } else {
              switchMode("work");
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, session]);

  const reset = () => { setRunning(false); setTimeLeft(MODES[mode].dur * 60); };

  const saveSettings = () => {
    const s = { work: parseInt(editSettings.work)||25, short: parseInt(editSettings.short)||5, long: parseInt(editSettings.long)||15, longAfter: parseInt(editSettings.longAfter)||4 };
    setSettings(s);
    try { localStorage.setItem("ht-pomo-settings", JSON.stringify(s)); } catch {}
    setShowSettings(false);
    setTimeLeft(s.work * 60);
    setMode("work");
    setRunning(false);
  };

  const totalToday = log.filter(e => e.date === new Date().toISOString().slice(0,10)).length;
  const totalAll = log.length;
  const cur = MODES[mode];
  const total = cur.dur * 60;
  const pct = total > 0 ? ((total - timeLeft) / total) * 100 : 0;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const radius = 110;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (1 - pct / 100);

  const inp = { padding:"9px 13px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:14, outline:"none", width:"100%" };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <GlassCard style={{ padding:"18px 22px", marginBottom:20 }} glow="#818cf8">
        <div style={{ display:"flex", alignItems:"center", gap:16, justifyContent:"space-between", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#818cf8,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, boxShadow:"0 6px 24px rgba(129,140,248,0.5)" }}>⏱️</div>
            <div>
              <div style={{ fontWeight:800, fontSize:18, color:"#e2e8f0", letterSpacing:"-0.5px" }}>Таймер Помодоро</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>Сегодня: <span style={{ color:"#818cf8", fontWeight:700 }}>{totalToday} сессий</span> · Всего: <span style={{ color:"#a78bfa" }}>{totalAll}</span></div>
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)}
            style={{ background:"rgba(255,255,255,0.06)", color:"#94a3b8", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontSize:13 }}>
            ⚙️ Настройки
          </button>
        </div>
      </GlassCard>

      {/* Settings panel */}
      {showSettings && (
        <GlassCard style={{ padding:20, marginBottom:20, animation:"fadeUp .3s ease" }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#e2e8f0", marginBottom:16 }}>Настройки таймера</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[["work","💼 Работа (мин)"],["short","☕ Короткий перерыв (мин)"],["long","🌿 Длинный перерыв (мин)"],["longAfter","🔄 Длинный через N сессий"]].map(([k,l])=>(
              <div key={k}>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:6, fontWeight:600 }}>{l}</div>
                <input type="number" value={editSettings[k]} onChange={e=>setEditSettings(p=>({...p,[k]:e.target.value}))} style={inp} min={1} max={120}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button onClick={saveSettings} style={{ background:"linear-gradient(135deg,#818cf8,#a78bfa)", color:"white", border:"none", borderRadius:10, padding:"10px 24px", cursor:"pointer", fontWeight:700, fontSize:13, boxShadow:"0 4px 16px rgba(129,140,248,0.4)" }}>Сохранить</button>
            <button onClick={()=>setShowSettings(false)} style={{ background:"rgba(255,255,255,0.06)", color:"#94a3b8", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 16px", cursor:"pointer", fontSize:13 }}>Отмена</button>
          </div>
        </GlassCard>
      )}

      {/* Mode switcher */}
      <div style={{ display:"flex", gap:10, marginBottom:24, justifyContent:"center" }}>
        {Object.entries(MODES).map(([k, m]) => (
          <button key={k} onClick={() => switchMode(k)}
            style={{ padding:"9px 20px", borderRadius:12, border:`1px solid ${mode===k ? m.color+"66" : "rgba(255,255,255,0.08)"}`, background: mode===k ? m.color+"22" : "rgba(255,255,255,0.04)", color: mode===k ? m.color : "#64748b", cursor:"pointer", fontWeight:mode===k?700:500, fontSize:13, transition:"all .2s" }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <GlassCard style={{ padding:"40px 20px", textAlign:"center", marginBottom:20 }} glow={cur.color}>
        <div style={{ position:"relative", display:"inline-block", marginBottom:30 }}>
          <svg width={260} height={260} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={130} cy={130} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={12}/>
            <circle cx={130} cy={130} r={radius} fill="none" stroke={cur.color} strokeWidth={12}
              strokeDasharray={circ} strokeDashoffset={dash}
              strokeLinecap="round"
              style={{ transition: running ? "stroke-dashoffset 1s linear" : "none", filter:`drop-shadow(0 0 12px ${cur.color}88)` }}
            />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontSize:14, color:cur.color, fontWeight:700, marginBottom:4 }}>{cur.icon} {cur.label}</div>
            <div style={{ fontSize:60, fontWeight:800, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace", lineHeight:1, letterSpacing:"-2px", textShadow:`0 0 40px ${cur.color}55` }}>{mm}:{ss}</div>
            <div style={{ fontSize:12, color:"#475569", marginTop:8 }}>Сессия #{session}</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:14, justifyContent:"center" }}>
          <button onClick={() => setRunning(r => !r)}
            style={{ padding:"14px 40px", borderRadius:14, border:"none", cursor:"pointer", fontWeight:800, fontSize:16, transition:"all .25s",
              background: running ? "rgba(239,68,68,0.2)" : `linear-gradient(135deg,${cur.color},${cur.color}cc)`,
              color: running ? "#ef4444" : "white",
              boxShadow: running ? "none" : `0 6px 28px ${cur.color}55`,
              border: running ? "1px solid rgba(239,68,68,0.4)" : "none",
            }}>
            {running ? "⏸ Пауза" : "▶ Старт"}
          </button>
          <button onClick={reset}
            style={{ padding:"14px 20px", borderRadius:14, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#64748b", cursor:"pointer", fontSize:16, transition:"all .2s" }}>
            ↺
          </button>
        </div>

        {/* Session dots */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:24 }}>
          {Array.from({length: settings.longAfter}, (_, i) => (
            <div key={i} style={{ width:12, height:12, borderRadius:"50%",
              background: (session - 1) % settings.longAfter > i ? cur.color : "rgba(255,255,255,0.1)",
              boxShadow: (session - 1) % settings.longAfter > i ? `0 0 8px ${cur.color}` : "none",
              transition:"all .3s" }}/>
          ))}
        </div>
        <div style={{ fontSize:11, color:"#475569", marginTop:8 }}>
          {settings.longAfter - ((session - 1) % settings.longAfter)} сессий до длинного перерыва
        </div>
      </GlassCard>

      {/* History */}
      {log.length > 0 && (
        <GlassCard style={{ padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#e2e8f0" }}>📋 История сессий</div>
            <button onClick={() => { if(window.confirm("Очистить историю?")) { setLog([]); try{localStorage.removeItem("ht-pomo-log");}catch{} } }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#334155", fontSize:13, transition:"color .15s" }}
              onMouseOver={e=>e.currentTarget.style.color="#ef4444"} onMouseOut={e=>e.currentTarget.style.color="#334155"}>
              🗑️ Очистить
            </button>
          </div>
          {/* Group by date */}
          {Object.entries(log.reduce((acc, e) => { (acc[e.date] = acc[e.date]||[]).push(e); return acc; }, {})).slice(0,7).map(([date, entries]) => (
            <div key={date} style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#475569", fontWeight:700, marginBottom:6, letterSpacing:"0.08em" }}>
                {new Date(date+"T00:00:00").toLocaleDateString("ru-RU",{weekday:"short",day:"numeric",month:"short"})} · {entries.length} сессий · {entries.reduce((s,e)=>s+e.duration,0)} мин
              </div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {entries.map(e => (
                  <div key={e.id} style={{ padding:"4px 10px", background:"rgba(129,140,248,0.15)", border:"1px solid rgba(129,140,248,0.25)", borderRadius:8, fontSize:11, color:"#818cf8", fontFamily:"'JetBrains Mono',monospace" }}>
                    {e.duration}м
                  </div>
                ))}
              </div>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
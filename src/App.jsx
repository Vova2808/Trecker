import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_SHORT = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const DAYS_RU = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const YEAR = 2026;
const BIRTHDATE = new Date(2008, 9, 17);
const LIFE_YEARS = 70;
const PALETTE = ["#818cf8","#f59e0b","#ef4444","#10b981","#3b82f6","#a78bfa","#ec4899","#14b8a6","#f97316","#84cc16","#06b6d4","#e879f9"];

// ─── User context для изоляции данных по юзеру ───────────────────────────────
import { createContext, useContext } from "react";
const UserCtx = createContext("");
const useUserId = () => useContext(UserCtx);
const userKey = (uid, k) => `ht-${uid}-${k}`;

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
    <div className={enterClass} style={{ willChange: phase !== "idle" ? "opacity, transform" : "auto", ...exitStyle }}>
      {displayChildren}
    </div>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
function ProgressBar({pct,color,height=8}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:11,color:"#94a3b8",minWidth:32,textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",animation:"countUp .4s cubic-bezier(.34,1.4,.64,1) both"}}>{pct}%</span>
      <div style={{flex:1,background:"rgba(255,255,255,0.04)",borderRadius:99,height,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
        <div className="progress-shimmer" style={{
          width:`${Math.min(pct,100)}%`,
          background:`linear-gradient(90deg,${color||"#818cf8"}88,${color||"#818cf8"})`,
          height:"100%",borderRadius:99,
          transition:"width .8s cubic-bezier(.34,1.2,.64,1)",
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
  const [hovered,setHovered]=useState(false);
  const handle=()=>{
    if(future)return;
    if(!checked){
      setBurst(true);
      setTimeout(()=>setBurst(false),500);
      if(Math.random()<.75){setConfetti(true);setTimeout(()=>setConfetti(false),850);}
    }
    onToggle();
  };
  return(
    <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
      {confetti&&<MiniConfetti color={color}/>}
      {/* Glow ring on hover */}
      {hovered&&!future&&!checked&&(
        <div style={{
          position:"absolute",inset:-4,borderRadius:12,
          border:`1px solid ${color}55`,
          animation:"glowRing .6s ease-out both",
          pointerEvents:"none",
        }}/>
      )}
      <div onClick={handle}
        onMouseEnter={()=>!future&&setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{
          width:26,height:26,
          border:`2px solid ${checked?color:hovered&&!future?`${color}99`:today?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.06)"}`,
          borderRadius:8,
          cursor:future?"default":"pointer",
          background:checked?`linear-gradient(135deg,${color}cc,${color})`:hovered&&!future?`${color}18`:"rgba(255,255,255,0.03)",
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"all .2s cubic-bezier(.34,1.4,.64,1)",
          opacity:future?.22:1,
          transform:burst?"scale(1.55) rotate(8deg)":hovered&&!future?"scale(1.12)":"scale(1)",
          boxShadow:checked?`0 0 14px ${color}88, 0 0 30px ${color}33`:hovered&&!future?`0 0 10px ${color}44`:today?`0 0 0 2px ${color}44, inset 0 0 8px rgba(255,255,255,0.05)`:"none",
          backdropFilter:"blur(4px)",
        }}>
        {checked&&<span style={{color:"#fff",fontSize:13,lineHeight:1,fontWeight:800,animation:"checkPop .4s cubic-bezier(.34,1.56,.64,1) both",textShadow:"0 1px 4px rgba(0,0,0,0.5)"}}>✓</span>}
      </div>
    </div>
  );
}

// ─── GlassCard ────────────────────────────────────────────────────────────────
function GlassCard({children, style={}, className="", glow=""}) {
  return (
    <div className={`glass-card ${className}`} style={{
      backdropFilter: "blur(20px)",
      borderRadius: 16,
      boxShadow: glow
        ? `0 4px 40px var(--shadow), 0 0 0 1px var(--card-border2), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 60px ${glow}22`
        : `0 4px 40px var(--shadow), 0 0 0 1px var(--card-border2), inset 0 1px 0 rgba(255,255,255,0.06)`,
      transition: "box-shadow .35s ease, transform .3s cubic-bezier(.34,1.2,.64,1), background .35s ease",
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
// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
// 1. Зайди на https://supabase.com и создай бесплатный проект
// 2. Settings → API → вставь свои значения ниже
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://hqyevjcnqedfywmhzpbj.supabase.co";   // https://xxxx.supabase.co
const SUPABASE_ANON = "sb_publishable_4R03wUmx57ecHjIjuUQfuA_17XVG8uL";        // eyJh...

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
// Email генерируется автоматически: nickname@tracker.app
// Пользователь видит только никнейм + пароль
function AuthScreen({ onLogin }) {
  const [mode, setMode]       = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const toEmail = (nick) => `${nick.trim().toLowerCase().replace(/[^a-z0-9_]/gi, "_")}@tracker.app`;

  const inp = {
    width:"100%", padding:"13px 16px", borderRadius:12,
    border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)",
    color:"#e2e8f0", fontSize:15, outline:"none", transition:"border-color .2s",
  };

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    const u = username.trim();
    if (!u) { setError("Введи никнейм"); return; }
    if (u.length < 2) { setError("Никнейм минимум 2 символа"); return; }
    if (!password) { setError("Введи пароль"); return; }
    if (password.length < 6) { setError("Пароль минимум 6 символов"); return; }
    if (mode === "register" && password !== confirmPw) { setError("Пароли не совпадают"); return; }

    setLoading(true);
    const fakeEmail = toEmail(u);
    try {
      if (mode === "register") {
        const { data, error: e } = await supabase.auth.signUp({
          email: fakeEmail, password,
          options: { data: { username: u } },
        });
        if (e) throw e;
        onLogin(data.user);
      } else {
        const { data, error: e } = await supabase.auth.signInWithPassword({
          email: fakeEmail, password,
        });
        if (e) throw e;
        onLogin(data.user);
      }
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("Invalid login credentials")) setError("Неверный никнейм или пароль");
      else if (msg.includes("already registered") || msg.includes("User already registered")) setError("Этот никнейм уже занят");
      else setError(msg || "Что-то пошло не так");
    } finally {
      setLoading(false);
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
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes glowPulse{0%,100%{box-shadow:0 8px 32px rgba(129,140,248,0.5);}50%{box-shadow:0 8px 48px rgba(167,139,250,0.8);}}
        @keyframes textShimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
      `}</style>

      <div style={{ width:"100%", maxWidth:420, padding:24, position:"relative", zIndex:1, animation:"fadeUp .55s cubic-bezier(.22,.68,0,1.15)" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:"linear-gradient(135deg,#818cf8,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 16px", boxShadow:"0 8px 32px rgba(129,140,248,0.5)", animation:"glowPulse 3s ease infinite" }}>🎯</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:20, background:"linear-gradient(90deg,#c7d2fe,#a78bfa,#818cf8,#c7d2fe)", backgroundSize:"300% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"textShimmer 4s linear infinite" }}>ТРЕКЕР 2026</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:6, animation:"fadeUp .5s .2s ease both" }}>Личный трекер задач и продуктивности</div>
        </div>

        {/* Card */}
        <div style={{ background:"rgba(15,23,42,0.85)", backdropFilter:"blur(24px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:32, boxShadow:"0 8px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)", animation:"fadeUp .55s .1s cubic-bezier(.22,.68,0,1.15) both" }}>
          {/* Tabs */}
          <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:12, padding:4, marginBottom:28 }}>
            {[["login","Войти"],["register","Регистрация"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setError("");setSuccess("");setConfirmPw("");}}
                style={{ flex:1, padding:"9px", borderRadius:9, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, transition:"all .25s cubic-bezier(.34,1.2,.64,1)",
                  background: mode===m ? "linear-gradient(135deg,#818cf8,#a78bfa)" : "transparent",
                  color: mode===m ? "white" : "#64748b",
                  boxShadow: mode===m ? "0 4px 16px rgba(129,140,248,0.4)" : "none",
                  transform: mode===m ? "scale(1.02)" : "scale(1)",
                }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Никнейм */}
            <div>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:7, fontWeight:600, letterSpacing:"0.08em" }}>НИКНЕЙМ</div>
              <input value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={handleKey}
                placeholder="твой_никнейм" style={inp}
                onFocus={e=>e.target.style.borderColor="rgba(129,140,248,0.5)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
            </div>

            {/* Пароль */}
            <div>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:7, fontWeight:600, letterSpacing:"0.08em" }}>ПАРОЛЬ</div>
              <div style={{ position:"relative" }}>
                <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={handleKey}
                  placeholder="••••••••" style={{...inp, paddingRight:46}}
                  onFocus={e=>e.target.style.borderColor="rgba(129,140,248,0.5)"}
                  onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
                <button onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:16, lineHeight:1, padding:0 }}>
                  {showPw?"🙈":"👁️"}
                </button>
              </div>
            </div>

            {/* Повтор пароля — только при регистрации */}
            {mode === "register" && (
              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:7, fontWeight:600, letterSpacing:"0.08em" }}>ПОВТОРИ ПАРОЛЬ</div>
                <div style={{ position:"relative" }}>
                  <input type={showPw?"text":"password"} value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} onKeyDown={handleKey}
                    placeholder="••••••••" style={{...inp, paddingRight:46, borderColor: confirmPw && confirmPw!==password ? "rgba(239,68,68,0.5)" : confirmPw && confirmPw===password ? "rgba(16,185,129,0.5)" : undefined}}
                    onFocus={e=>e.target.style.borderColor="rgba(129,140,248,0.5)"}
                    onBlur={e=>e.target.style.borderColor=confirmPw&&confirmPw!==password?"rgba(239,68,68,0.5)":confirmPw&&confirmPw===password?"rgba(16,185,129,0.5)":"rgba(255,255,255,0.1)"}/>
                  {confirmPw && <div style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>{confirmPw===password?"✅":"❌"}</div>}
                </div>
              </div>
            )}

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

            <button onClick={handleSubmit} disabled={loading}
              className="btn-ripple"
              style={{ padding:"14px", borderRadius:12, border:"none", cursor: loading ? "not-allowed" : "pointer", fontWeight:800, fontSize:15, marginTop:4, transition:"all .25s",
                background:"linear-gradient(135deg,#6366f1,#818cf8,#a78bfa)",
                backgroundSize:"200% auto",
                color:"white", boxShadow:"0 6px 28px rgba(129,140,248,0.5)",
                opacity: loading ? 0.7 : 1,
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              }}
              onMouseEnter={e=>{ if(!loading) e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              {loading
                ? <><div style={{ width:17,height:17,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",animation:"spin .7s linear infinite" }}/> Загрузка...</>
                : mode==="login" ? "→ Войти" : "✦ Создать аккаунт"
              }
            </button>
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:"#334155" }}>
          Никнейм + пароль — больше ничего не нужно
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получить текущую сессию при загрузке
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Слушать изменения сессии (логин / логаут / обновление токена)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#060b18", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center", animation:"fadeUp .4s ease" }}>
        <div style={{
          width:56, height:56, borderRadius:18,
          background:"linear-gradient(135deg,#818cf8,#a78bfa)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:26, margin:"0 auto 20px",
          boxShadow:"0 8px 32px rgba(129,140,248,0.5)",
          animation:"glowPulse 2s ease infinite",
        }}>🎯</div>
        <div style={{ width:36, height:36, border:"3px solid rgba(129,140,248,0.15)", borderTopColor:"#818cf8", borderRadius:"50%", animation:"spin .7s linear infinite", margin:"0 auto 16px" }}/>
        <div style={{ color:"#475569", fontSize:13 }}>Загрузка...</div>
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:none;}}
        @keyframes glowPulse{0%,100%{box-shadow:0 8px 32px rgba(129,140,248,0.5);}50%{box-shadow:0 8px 48px rgba(167,139,250,0.8);}}
      `}</style>
    </div>
  );

  if (!user) return <AuthScreen onLogin={setUser} />;

  const displayName = user.user_metadata?.username || user.email?.split("@")[0] || "Пользователь";
  return <AppInner currentUser={displayName} userId={user.id} onLogout={handleLogout} />;
}

function AppInner({ currentUser, userId, onLogout }){
  const K = (k) => `ht-${userId}-${k}`;
  const [habits, setHabits] = useState(() => storageGet(K("habits")) || DEFAULT_HABITS);
  const [completions, setCompletions] = useState(() => storageGet(K("completions")) || {});
  const [monthGoals, setMonthGoals] = useState(() => storageGet(K("monthgoals")) || {});
  const [finances, setFinances] = useState(() => storageGet(K("finances")) || []);
  const [bigGoals, setBigGoals] = useState(() => storageGet(K("biggoals")) || []);
  const [view, setView] = useState(() => storageGet(K("view")) || "year");
  const [theme, setTheme] = useState(() => localStorage.getItem(K("theme")) || "original");
  const [curMonth, setCurMonth] = useState(() => {
    const saved = storageGet(K("curmonth"));
    return saved !== null ? saved : new Date().getMonth();
  });
  const [animDir, setAnimDir] = useState("fade");
  const prevViewRef = useRef(view);
  const prevMonthRef = useRef(curMonth);
  const VIEW_ORDER = ["year", "life", "finance", "ai", "motivation", "pomodoro", "content", "board"];

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
    if (newView) { setView(newView); storageSet(K("view"), newView); }
    if (newMonth !== undefined) { setCurMonth(newMonth); storageSet(K("curmonth"), newMonth); }
  }, []);

  const saveHabits = useCallback(h => { setHabits(h); storageSet(K("habits"), h); }, []);
  const saveCompletions = useCallback(c => { setCompletions(c); storageSet(K("completions"), c); }, []);
  const saveGoals = useCallback(g => { setMonthGoals(g); storageSet(K("monthgoals"), g); }, []);
  const saveFinances = useCallback(f => { setFinances(f); storageSet(K("finances"), f); }, []);
  const saveBigGoals = useCallback(g => { setBigGoals(g); storageSet(K("biggoals"), g); }, []);

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === "original" ? "mono" : "original";
      localStorage.setItem(K("theme"), next);
      return next;
    });
  }, []);

  const toggle = useCallback((ds, hid) => {
    setCompletions(prev => {
      const next = {...prev, [ds]: {...(prev[ds]||{}), [hid]: !prev[ds]?.[hid]}};
      storageSet(K("completions"), next);
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

  // ── Pomodoro — глобальный стейт, живёт вне вкладки ──────────────────────────
  const [pomoSettings, setPomoSettings] = useState(() => {
    try { const v = localStorage.getItem("ht-pomo-settings"); return v ? JSON.parse(v) : { work:25, short:5, long:15, longAfter:4 }; } catch { return { work:25, short:5, long:15, longAfter:4 }; }
  });
  const [pomoMode,        setPomoMode]        = useState("work");
  const [pomoTimeLeft,    setPomoTimeLeft]    = useState(() => {
    try { const v = localStorage.getItem("ht-pomo-settings"); const s = v ? JSON.parse(v) : { work:25 }; return s.work * 60; } catch { return 25*60; }
  });
  const [pomoRunning,     setPomoRunning]     = useState(false);
  const [pomoSession,     setPomoSession]     = useState(1);
  const [pomoShowSettings,setPomoShowSettings]= useState(false);
  const [pomoEditSettings,setPomoEditSettings]= useState({ ...pomoSettings });
  const [pomoLog,         setPomoLog]         = useState(() => {
    try { const v = localStorage.getItem("ht-pomo-log"); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const pomoIntervalRef  = useRef(null);
  const pomoAudioCtxRef  = useRef(null);
  const pomoModeRef      = useRef(pomoMode);
  const pomoSessionRef   = useRef(pomoSession);
  const pomoSettingsRef  = useRef(pomoSettings);
  useEffect(() => { pomoModeRef.current     = pomoMode;     }, [pomoMode]);
  useEffect(() => { pomoSessionRef.current  = pomoSession;  }, [pomoSession]);
  useEffect(() => { pomoSettingsRef.current = pomoSettings; }, [pomoSettings]);

  const POMO_MODES = {
    work:  { label:"Работа",           color:"#818cf8", icon:"💼", dur: pomoSettings.work  },
    short: { label:"Короткий перерыв", color:"#10b981", icon:"☕", dur: pomoSettings.short },
    long:  { label:"Длинный перерыв",  color:"#f59e0b", icon:"🌿", dur: pomoSettings.long  },
  };

  const pomoPlayBeep = useCallback(() => {
    try {
      if (!pomoAudioCtxRef.current) pomoAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = pomoAudioCtxRef.current;
      [{ delay:0, freq:880, dur:0.6 }, { delay:0.75, freq:880, dur:0.6 }, { delay:1.5, freq:1046, dur:1.0 }].forEach(({ delay, freq, dur }) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + delay + 0.05);
        gain.gain.setValueAtTime(0.5, ctx.currentTime + delay + dur - 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + dur);
      });
    } catch {}
  }, []);

  const pomoSwitchMode = useCallback((newMode, newSession) => {
    const s = pomoSettingsRef.current;
    setPomoMode(newMode);
    setPomoTimeLeft((newMode === "work" ? s.work : newMode === "short" ? s.short : s.long) * 60);
    setPomoRunning(false);
    if (newSession !== undefined) setPomoSession(newSession);
  }, []);

  useEffect(() => {
    if (pomoRunning) {
      pomoIntervalRef.current = setInterval(() => {
        setPomoTimeLeft(t => {
          if (t <= 1) {
            clearInterval(pomoIntervalRef.current);
            pomoPlayBeep();
            setPomoRunning(false);
            const mode = pomoModeRef.current;
            const session = pomoSessionRef.current;
            const s = pomoSettingsRef.current;
            if (mode === "work") {
              const entry = { id:Date.now(), date:new Date().toISOString().slice(0,10), duration:s.work, ts:Date.now() };
              setPomoLog(prev => { const next=[entry,...prev].slice(0,200); try{localStorage.setItem("ht-pomo-log",JSON.stringify(next));}catch{} return next; });
              const nextSess = session + 1;
              setPomoSession(nextSess);
              if ((nextSess - 1) % s.longAfter === 0) pomoSwitchMode("long");
              else pomoSwitchMode("short");
            } else {
              pomoSwitchMode("work");
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(pomoIntervalRef.current);
    }
    return () => clearInterval(pomoIntervalRef.current);
  }, [pomoRunning, pomoPlayBeep, pomoSwitchMode]);

  const pomoReset = useCallback(() => {
    setPomoRunning(false);
    setPomoTimeLeft(pomoSettingsRef.current[pomoModeRef.current] * 60);
  }, []);

  const pomoSaveSettings = useCallback(() => {
    setPomoEditSettings(es => {
      const s = { work:parseInt(es.work)||25, short:parseInt(es.short)||5, long:parseInt(es.long)||15, longAfter:parseInt(es.longAfter)||4 };
      setPomoSettings(s);
      try { localStorage.setItem("ht-pomo-settings", JSON.stringify(s)); } catch {}
      setPomoTimeLeft(s.work * 60);
      setPomoMode("work");
      setPomoRunning(false);
      setPomoShowSettings(false);
      return es;
    });
  }, []);

  const pomoProps = {
    settings:pomoSettings, mode:pomoMode, timeLeft:pomoTimeLeft, running:pomoRunning,
    session:pomoSession, log:pomoLog, showSettings:pomoShowSettings, editSettings:pomoEditSettings,
    setRunning:setPomoRunning, setEditSettings:setPomoEditSettings, setShowSettings:setPomoShowSettings,
    setLog:setPomoLog, switchMode:pomoSwitchMode, reset:pomoReset, saveSettings:pomoSaveSettings,
    MODES:POMO_MODES,
  };

  // форматированное время для мини-виджета
  const pomoMM = String(Math.floor(pomoTimeLeft / 60)).padStart(2,"0");
  const pomoSS = String(pomoTimeLeft % 60).padStart(2,"0");

  const NAV_ITEMS = [
    {id:"year",label:"Год",icon:"📊"},
    {id:"life",label:"70 лет",icon:"⏳"},
    {id:"finance",label:"Финансы",icon:"💰"},
    {id:"ai",label:"ИИ",icon:"🤖"},
    {id:"motivation",label:"Мотивация",icon:"🔥"},
    {id:"pomodoro",label:"Помодоро",icon:"⏱️"},
    {id:"content",label:"Контент",icon:"🎥"},
    {id:"board",label:"Доска идей",icon:"💡"},
  ];

  return(
    <UserCtx.Provider value={userId}>
    <div data-theme={theme} style={{minHeight:"100vh",background:"var(--app-bg)",fontFamily:"'Inter',system-ui,sans-serif",color:"var(--app-fg)",position:"relative",overflow:"hidden",transition:"filter .35s ease, background .35s ease, color .35s ease", filter: theme === "mono" ? "grayscale(1)" : "none"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}

        /* ── CSS VARIABLES ── */
        :root, [data-theme="original"] {
          --app-bg: #060b18;
          --app-fg: #e2e8f0;
          --app-fg2: #94a3b8;
          --app-fg3: #64748b;
          --app-fg4: #475569;
          --app-fg5: #334155;
          --accent: #818cf8;
          --accent2: #a78bfa;
          --accent-glow: rgba(129,140,248,0.4);
          --card-bg: rgba(15,23,42,0.7);
          --card-border: rgba(255,255,255,0.08);
          --card-border2: rgba(255,255,255,0.06);
          --nav-bg: rgba(6,11,24,0.85);
          --inp-bg: rgba(255,255,255,0.05);
          --inp-border: rgba(255,255,255,0.1);
          --grid-color: rgba(255,255,255,0.02);
          --shadow: rgba(0,0,0,0.4);
          --shadow-lg: rgba(0,0,0,0.5);
          --aurora-vis: 1;
          --nav-active-bg: linear-gradient(135deg,rgba(129,140,248,0.25),rgba(167,139,250,0.15));
          --nav-active-color: #c7d2fe;
          --nav-active-border: rgba(129,140,248,0.4);
          --nav-active-shadow: 0 0 20px rgba(129,140,248,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
          --scrollbar: rgba(129,140,248,0.3);
          --scrollbar-hover: rgba(129,140,248,0.5);
          --hover-overlay: rgba(129,140,248,0.15);
          --separator: rgba(255,255,255,0.06);
        }

        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:var(--scrollbar);border-radius:4px;}
        ::-webkit-scrollbar-thumb:hover{background:var(--scrollbar-hover);}

        /* Background Aurora */
        .bg-aurora{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;opacity:var(--aurora-vis);transition:opacity .35s ease;}
        .aurora-1{position:absolute;width:800px;height:800px;top:-200px;left:-200px;border-radius:50%;background:radial-gradient(ellipse,rgba(99,102,241,0.12) 0%,transparent 70%);animation:auroraFloat 18s ease-in-out infinite;}
        .aurora-2{position:absolute;width:600px;height:600px;top:30%;right:-100px;border-radius:50%;background:radial-gradient(ellipse,rgba(167,139,250,0.09) 0%,transparent 70%);animation:auroraFloat 24s ease-in-out infinite reverse;}
        .aurora-3{position:absolute;width:500px;height:500px;bottom:-100px;left:40%;border-radius:50%;background:radial-gradient(ellipse,rgba(20,184,166,0.07) 0%,transparent 70%);animation:auroraFloat 20s ease-in-out infinite 3s;}
        @keyframes auroraFloat{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(30px,-20px) scale(1.05);}66%{transform:translate(-20px,15px) scale(0.95);};}

        /* Grid lines bg */
        .bg-grid{position:fixed;inset:0;pointer-events:none;z-index:0;
          background-image:linear-gradient(var(--grid-color) 1px,transparent 1px),linear-gradient(90deg,var(--grid-color) 1px,transparent 1px);
          background-size:60px 60px;transition:background .35s ease;}

        /* Nav */
        .nav-btn{position:relative;transition:all .25s cubic-bezier(.34,1.2,.64,1);overflow:hidden;color:var(--app-fg3);}
        .nav-btn::before{content:'';position:absolute;inset:0;background:var(--hover-overlay);opacity:0;transition:opacity .2s;border-radius:inherit;}
        .nav-btn:hover::before{opacity:1;}
        .nav-btn:hover{transform:translateY(-1px);}
        .nav-btn:active{transform:scale(.95);}
        .nav-btn-active{background:var(--nav-active-bg) !important;color:var(--nav-active-color) !important;border-color:var(--nav-active-border) !important;box-shadow:var(--nav-active-shadow) !important;}

        /* Glass card */
        .glass-card{
          background:var(--card-bg) !important;
          border-color:var(--card-border) !important;
          backdrop-filter:blur(20px);
          transition:box-shadow .35s ease, transform .3s ease, background .35s ease !important;
        }
        .card-lift{transition:transform .25s cubic-bezier(.34,1.2,.64,1),box-shadow .25s ease;}
        .card-lift:hover{transform:translateY(-3px);box-shadow:0 16px 50px var(--shadow-lg),0 0 0 1px var(--card-border2) !important;}
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

        /* ── NEW ANIMATIONS ── */
        @keyframes particleFloat{
          0%{transform:translate(0,0) scale(1);opacity:.6;}
          25%{transform:translate(12px,-18px) scale(1.15);opacity:.9;}
          50%{transform:translate(-8px,-32px) scale(.85);opacity:.5;}
          75%{transform:translate(18px,-22px) scale(1.05);opacity:.8;}
          100%{transform:translate(0,0) scale(1);opacity:.6;}
        }
        @keyframes gradientFlow{
          0%,100%{background-position:0% 50%;}
          50%{background-position:100% 50%;}
        }
        @keyframes navIndicator{
          from{transform:scaleX(0);opacity:0;}
          to{transform:scaleX(1);opacity:1;}
        }
        @keyframes rippleOut{
          0%{transform:scale(0);opacity:.5;}
          100%{transform:scale(4);opacity:0;}
        }
        @keyframes badgePop{
          0%{transform:scale(0) rotate(-20deg);opacity:0;}
          60%{transform:scale(1.25) rotate(6deg);opacity:1;}
          100%{transform:scale(1) rotate(0);opacity:1;}
        }
        @keyframes morphBorder{
          0%,100%{border-radius:16px;}
          50%{border-radius:20px 12px 18px 14px;}
        }
        @keyframes shimmerMove{
          0%{transform:translateX(-100%);}
          100%{transform:translateX(200%);}
        }
        @keyframes orbFloat{
          0%,100%{transform:translate(0,0) scale(1);}
          33%{transform:translate(-15px,20px) scale(1.08);}
          66%{transform:translate(20px,-10px) scale(.93);}
        }
        @keyframes logoSpin{
          0%{transform:rotate(0deg);}
          100%{transform:rotate(360deg);}
        }
        @keyframes starTwinkle{
          0%,100%{opacity:0;transform:scale(0);}
          50%{opacity:1;transform:scale(1);}
        }
        @keyframes slideUp{
          from{opacity:0;transform:translateY(14px);}
          to{opacity:1;transform:translateY(0);}
        }
        @keyframes glowRing{
          0%,100%{box-shadow:0 0 0 0 var(--accent-glow);}
          50%{box-shadow:0 0 0 6px transparent;}
        }
        @keyframes countUp{
          from{opacity:0;transform:translateY(8px) scale(.9);}
          to{opacity:1;transform:none;}
        }
        @keyframes hoverLift{
          to{transform:translateY(-4px) scale(1.01);}
        }
        @keyframes textShimmer{
          0%{background-position:200% center;}
          100%{background-position:-200% center;}
        }

        /* Gradient animated text */
        .grad-text-anim{
          background:linear-gradient(90deg,#c7d2fe,#a78bfa,#818cf8,#c7d2fe);
          background-size:300% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          animation:textShimmer 4s linear infinite;
        }

        /* Shimmer progress overlay */
        .progress-shimmer{position:relative;overflow:hidden;}
        .progress-shimmer::after{
          content:'';position:absolute;top:0;left:0;width:40%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent);
          animation:shimmerMove 2.5s ease-in-out infinite;
          border-radius:99px;
        }

        /* Ripple button */
        .btn-ripple{position:relative;overflow:hidden;}
        .btn-ripple::after{
          content:'';position:absolute;top:50%;left:50%;
          width:8px;height:8px;border-radius:50%;
          background:rgba(255,255,255,0.35);
          transform:scale(0);
          animation:none;
          transform-origin:center;
          margin:-4px 0 0 -4px;
        }
        .btn-ripple:active::after{animation:rippleOut .5s ease-out forwards;}

        /* Glow ring on focus */
        .glow-ring:focus{animation:glowRing .6s ease-out;}

        /* Nav indicator bar */
        .nav-active-line{
          position:absolute;bottom:-1px;left:10%;right:10%;height:2px;
          background:linear-gradient(90deg,transparent,var(--accent),transparent);
          border-radius:99px;animation:navIndicator .3s cubic-bezier(.34,1.4,.64,1) both;
        }

        /* Floating particle */
        .particle{
          position:absolute;border-radius:50%;pointer-events:none;
          background:radial-gradient(circle,currentColor 0%,transparent 70%);
        }
        .p1{width:5px;height:5px;top:18%;left:8%;color:rgba(129,140,248,0.6);animation:particleFloat 14s ease-in-out infinite;}
        .p2{width:4px;height:4px;top:55%;left:15%;color:rgba(167,139,250,0.5);animation:particleFloat 18s ease-in-out infinite 2s;}
        .p3{width:6px;height:6px;top:30%;right:12%;color:rgba(20,184,166,0.4);animation:particleFloat 16s ease-in-out infinite 5s;}
        .p4{width:3px;height:3px;top:70%;right:20%;color:rgba(236,72,153,0.5);animation:particleFloat 20s ease-in-out infinite 3s;}
        .p5{width:5px;height:5px;bottom:20%;left:45%;color:rgba(59,130,246,0.45);animation:particleFloat 22s ease-in-out infinite 7s;}
        .p6{width:4px;height:4px;top:45%;left:60%;color:rgba(245,158,11,0.35);animation:particleFloat 17s ease-in-out infinite 1s;}
        .p7{width:3px;height:3px;top:80%;left:30%;color:rgba(129,140,248,0.4);animation:particleFloat 25s ease-in-out infinite 9s;}
        .p8{width:6px;height:6px;top:10%;right:35%;color:rgba(167,139,250,0.3);animation:particleFloat 19s ease-in-out infinite 4s;}

        /* Card entrance */
        .card-enter{animation:fadeUp .5s cubic-bezier(.22,.68,0,1.2) both;}

        /* Stat pop animation */
        .stat-pop{animation:countUp .4s cubic-bezier(.34,1.4,.64,1) both;}

        /* Hover glow card */
        .glass-card:hover{
          box-shadow:0 8px 50px var(--shadow-lg),0 0 0 1px var(--card-border2),inset 0 1px 0 rgba(255,255,255,0.1),0 0 40px rgba(129,140,248,0.08) !important;
          transform:translateY(-1px);
        }

        /* Table */
        .hrow{transition:background .15s;}
        .hrow:hover>td{background:var(--hover-overlay) !important;}
        .tx-row:hover{background:var(--hover-overlay) !important;}
        .weekcell{transition:transform .12s cubic-bezier(.34,1.4,.64,1);}
        .weekcell:hover{transform:scale(1.9);z-index:20;}

        textarea:focus,input:focus{outline:none !important;border-color:var(--accent-glow) !important;box-shadow:0 0 0 3px var(--accent-glow) !important;}
        button:active:not(:disabled){transform:scale(.94);}

        /* Stat number */
        .stat-num{font-family:'JetBrains Mono',monospace;font-weight:700;}

        /* Theme switcher pill */
        .theme-pill {
          display: flex; align-items: center; gap: 2px;
          background: var(--inp-bg); border: 1px solid var(--card-border);
          border-radius: 20px; padding: 3px; transition: all .25s ease;
        }
        .theme-opt {
          width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; font-size: 13px;
          transition: all .2s cubic-bezier(.34,1.2,.64,1);
        }
        .theme-opt-active-orig { background: linear-gradient(135deg,#818cf8,#a78bfa); box-shadow: 0 2px 10px rgba(129,140,248,0.5); }
        .theme-opt-active-mono { background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.2); border: 1px solid rgba(0,0,0,0.1) !important; }
        .theme-opt-inactive { background: transparent; color: var(--app-fg4); }
      `}</style>

      {/* Ambient background */}
      <div className="bg-grid"/>
      <div className="bg-aurora">
        <div className="aurora-1"/>
        <div className="aurora-2"/>
        <div className="aurora-3"/>
      </div>
      {/* Floating particles */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden",opacity:"var(--aurora-vis)"}}>
        <div className="particle p1"/><div className="particle p2"/><div className="particle p3"/>
        <div className="particle p4"/><div className="particle p5"/><div className="particle p6"/>
        <div className="particle p7"/><div className="particle p8"/>
      </div>

      {/* NAV */}
      <div style={{
        position:"sticky",top:0,zIndex:100,
        background:"var(--nav-bg)",
        backdropFilter:"blur(24px) saturate(180%)",
        borderBottom:"1px solid var(--separator)",
        boxShadow:"0 4px 30px var(--shadow), 0 1px 0 var(--card-border2)",
        transition:"background .35s ease, border-color .35s ease",
      }}>
        <div style={{maxWidth:1900,margin:"0 auto",display:"flex",alignItems:"center",gap:5,overflowX:"auto",padding:"10px 16px"}}>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginRight:12,flexShrink:0}}>
            <div style={{position:"relative"}}>
              <div style={{
                width:32,height:32,borderRadius:10,
                background:"linear-gradient(135deg,#818cf8,#a78bfa)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,
                boxShadow:"0 4px 15px rgba(129,140,248,0.5)",
                animation:"glowPulse 3s ease infinite",
                color:"white",
              }}>🎯</div>
              {/* Orbiting dot */}
              <div style={{
                position:"absolute",top:"50%",left:"50%",width:28,height:28,
                marginTop:-14,marginLeft:-14,
                animation:"logoSpin 6s linear infinite",
                pointerEvents:"none",
              }}>
                <div style={{
                  position:"absolute",top:-3,left:"50%",marginLeft:-2,
                  width:4,height:4,borderRadius:"50%",
                  background:"#c7d2fe",
                  boxShadow:"0 0 6px #818cf8",
                  animation:"starTwinkle 2s ease-in-out infinite",
                }}/>
              </div>
            </div>
            <span style={{
              fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:13,letterSpacing:"0.05em",
              background:"linear-gradient(90deg,#c7d2fe,#a78bfa,#818cf8,#c7d2fe)",
              backgroundSize:"300% auto",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              whiteSpace:"nowrap",
              animation:"textShimmer 4s linear infinite",
            }}>ТРЕКЕР</span>
          </div>

          {/* Main nav */}
          {NAV_ITEMS.map(v=>(
            <button key={v.id}
              className={`nav-btn btn-ripple${view===v.id?" nav-btn-active":""}`}
              onClick={()=>navigateTo(v.id)}
              style={{
                padding:"7px 16px",borderRadius:10,
                border:`1px solid ${view===v.id?"var(--nav-active-border)":"var(--card-border)"}`,
                cursor:"pointer",flexShrink:0,
                background:view===v.id?"var(--nav-active-bg)":"transparent",
                color:view===v.id?"var(--nav-active-color)":"var(--app-fg3)",
                fontWeight:600,fontSize:13,letterSpacing:"-0.2px",
                position:"relative",
              }}>
              <span style={{marginRight:6}}>{v.icon}</span>{v.label}
              {view===v.id && <div className="nav-active-line"/>}
            </button>
          ))}

          <div style={{width:1,height:24,background:"var(--separator)",flexShrink:0,margin:"0 5px"}}/>

          {/* Month nav */}
          {MONTHS_SHORT.map((m,i)=>(
            <button key={i} className="nav-btn btn-ripple"
              onClick={()=>navigateTo("month", i)}
              style={{
                padding:"7px 11px",borderRadius:9,
                border:`1px solid ${view==="month"&&curMonth===i?"var(--nav-active-border)":"transparent"}`,
                cursor:"pointer",flexShrink:0,
                background:view==="month"&&curMonth===i?"var(--nav-active-bg)":"transparent",
                color:view==="month"&&curMonth===i?"var(--nav-active-color)":"var(--app-fg4)",
                fontWeight:view==="month"&&curMonth===i?700:500,fontSize:13,
                position:"relative",
              }}>
              {m}
              {view==="month"&&curMonth===i && <div className="nav-active-line"/>}
            </button>
          ))}

          {/* User + theme + logout */}
          <div style={{marginLeft:"auto",flexShrink:0,display:"flex",alignItems:"center",gap:8}}>

            {/* Мини-виджет помодоро — виден когда таймер идёт и ты не на вкладке помодоро */}
            {pomoRunning && view !== "pomodoro" && (
              <button onClick={() => navigateTo("pomodoro")}
                style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"8px 16px", borderRadius:20,
                  background:`linear-gradient(135deg,${POMO_MODES[pomoMode].color}22,${POMO_MODES[pomoMode].color}11)`,
                  border:`1px solid ${POMO_MODES[pomoMode].color}55`,
                  cursor:"pointer", flexShrink:0, transition:"all .2s",
                  boxShadow:`0 0 14px ${POMO_MODES[pomoMode].color}22`,
                }}
                onMouseEnter={e=>e.currentTarget.style.background=`${POMO_MODES[pomoMode].color}33`}
                onMouseLeave={e=>e.currentTarget.style.background=`linear-gradient(135deg,${POMO_MODES[pomoMode].color}22,${POMO_MODES[pomoMode].color}11)`}
                title="Перейти к помодоро">
                <span style={{fontSize:11}}>{POMO_MODES[pomoMode].icon}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,color:POMO_MODES[pomoMode].color,letterSpacing:"0.5px"}}>{pomoMM}:{pomoSS}</span>
                <span style={{width:6,height:6,borderRadius:"50%",background:POMO_MODES[pomoMode].color,animation:"pulse 1s ease-in-out infinite",flexShrink:0}}/>
              </button>
            )}

            <span style={{fontSize:12,color:"var(--app-fg4)",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>👤 {currentUser}</span>

            {/* Theme switcher */}
            <div className="theme-pill" title="Сменить тему">
              <button
                className={`theme-opt ${theme==="original" ? "theme-opt-active-orig" : "theme-opt-inactive"}`}
                onClick={()=>{ if(theme!=="original"){ setTheme("original"); localStorage.setItem(K("theme"),"original"); } }}
                title="Оригинальная тема"
                style={{color: theme==="original" ? "white" : "var(--app-fg3)"}}>
                🌙
              </button>
              <button
                className={`theme-opt ${theme==="mono" ? "theme-opt-active-mono" : "theme-opt-inactive"}`}
                onClick={()=>{ if(theme!=="mono"){ setTheme("mono"); localStorage.setItem(K("theme"),"mono"); } }}
                title="Чёрно-белая (iOS)"
                style={{color: theme==="mono" ? "#1c1c1e" : "var(--app-fg3)"}}>
                ☀️
              </button>
            </div>

            <button onClick={onLogout}
              style={{padding:"6px 12px",borderRadius:8,border:"1px solid var(--card-border)",background:"var(--inp-bg)",color:"var(--app-fg4)",cursor:"pointer",fontSize:12,transition:"all .2s",whiteSpace:"nowrap"}}
              onMouseEnter={e=>{e.currentTarget.style.color="#ef4444";e.currentTarget.style.borderColor="rgba(239,68,68,0.3)";}}
              onMouseLeave={e=>{e.currentTarget.style.color="var(--app-fg4)";e.currentTarget.style.borderColor="var(--card-border)";}}>
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
          {view==="pomodoro"   && <PomodoroView {...pomoProps}/>}
          {view==="content"    && <ContentPlanView/>}
          {view==="board"      && <IdeaBoardView/>}
        </AnimatedSection>
      </div>
    </div>
  </UserCtx.Provider>
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
// WEEKLY PLANNER
// ═══════════════════════════════════════════════════════════════════════════════
const WEEK_DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const WEEK_DAYS_FULL = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
const TASK_COLORS = [
  {id:"indigo", label:"Учёба",    color:"#818cf8"},
  {id:"emerald",label:"Здоровье", color:"#10b981"},
  {id:"amber",  label:"Контент",  color:"#f59e0b"},
  {id:"rose",   label:"Личное",   color:"#f43f5e"},
  {id:"sky",    label:"Работа",   color:"#38bdf8"},
  {id:"violet", label:"Другое",   color:"#a78bfa"},
];

function getWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function fmtDate(d) {
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}`;
}
function weekKey(monday) {
  return monday.toISOString().slice(0,10);
}

function WeeklyPlanner() {
  const uid = useUserId();
  const WK = k => `ht-${uid}-wplanner-${k}`;

  const [weekStart, setWeekStart] = useState(() => getWeekMonday(new Date()));
  // tasks: { [weekKey]: { [dayIdx]: [{id, text, done, color}] } }
  const [allTasks, setAllTasks] = useState(() => {
    try { const v = localStorage.getItem(WK("tasks")); return v ? JSON.parse(v) : {}; } catch { return {}; }
  });
  const [addingDay, setAddingDay] = useState(null); // dayIdx being edited
  const [draftText, setDraftText] = useState("");
  const [draftColor, setDraftColor] = useState("indigo");
  const [editId, setEditId] = useState(null); // {dayIdx, taskId}
  const [editText, setEditText] = useState("");

  const saveTasks = (next) => {
    setAllTasks(next);
    try { localStorage.setItem(WK("tasks"), JSON.stringify(next)); } catch {}
  };

  const wk = weekKey(weekStart);
  const dayTasks = (dayIdx) => allTasks[wk]?.[dayIdx] || [];

  const addTask = (dayIdx) => {
    if (!draftText.trim()) return;
    const task = { id: Date.now(), text: draftText.trim(), done: false, color: draftColor };
    const next = {
      ...allTasks,
      [wk]: { ...(allTasks[wk] || {}), [dayIdx]: [...dayTasks(dayIdx), task] }
    };
    saveTasks(next);
    setDraftText("");
    setAddingDay(null);
  };

  const toggleTask = (dayIdx, taskId) => {
    const next = {
      ...allTasks,
      [wk]: {
        ...(allTasks[wk] || {}),
        [dayIdx]: dayTasks(dayIdx).map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      }
    };
    saveTasks(next);
  };

  const deleteTask = (dayIdx, taskId) => {
    const next = {
      ...allTasks,
      [wk]: {
        ...(allTasks[wk] || {}),
        [dayIdx]: dayTasks(dayIdx).filter(t => t.id !== taskId)
      }
    };
    saveTasks(next);
  };

  const saveEdit = (dayIdx, taskId) => {
    if (!editText.trim()) return;
    const next = {
      ...allTasks,
      [wk]: {
        ...(allTasks[wk] || {}),
        [dayIdx]: dayTasks(dayIdx).map(t => t.id === taskId ? { ...t, text: editText.trim() } : t)
      }
    };
    saveTasks(next);
    setEditId(null);
  };

  const now = new Date();
  now.setHours(0,0,0,0);
  const todayIdx = (() => {
    for (let i = 0; i < 7; i++) {
      if (addDays(weekStart, i).getTime() === now.getTime()) return i;
    }
    return -1;
  })();

  const isCurrentWeek = weekKey(getWeekMonday(new Date())) === wk;

  // week stats
  const totalTasks = WEEK_DAYS.reduce((s,_,i) => s + dayTasks(i).length, 0);
  const doneTasks  = WEEK_DAYS.reduce((s,_,i) => s + dayTasks(i).filter(t=>t.done).length, 0);
  const weekPct    = totalTasks ? Math.round(doneTasks/totalTasks*100) : 0;

  return (
    <GlassCard style={{ marginTop: 28, overflow:"hidden" }} glow="#10b981">
      {/* ── Header ── */}
      <div style={{
        padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        background:"linear-gradient(135deg,rgba(16,185,129,0.1),rgba(59,130,246,0.05))",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:"#e2e8f0", letterSpacing:"-0.5px", display:"flex", alignItems:"center", gap:8 }}>
              📅 Планировщик недели
              {isCurrentWeek && (
                <span style={{ fontSize:11, fontWeight:700, background:"linear-gradient(135deg,#10b981,#34d399)", color:"white", borderRadius:20, padding:"2px 10px", letterSpacing:"0.04em" }}>
                  СЕЙЧАС
                </span>
              )}
            </div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>
              {fmtDate(weekStart)} — {fmtDate(addDays(weekStart,6))}
              {totalTasks > 0 && (
                <span style={{ marginLeft:10 }}>
                  <span style={{ color:"#34d399", fontWeight:700 }}>{doneTasks}</span>
                  <span style={{ color:"#475569" }}>/{totalTasks} выполнено</span>
                  <span style={{ marginLeft:6, color:"#818cf8", fontWeight:700 }}>{weekPct}%</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Week nav */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={() => setWeekStart(getWeekMonday(addDays(weekStart,-7)))}
            className="btn-ripple"
            style={{ width:34, height:34, borderRadius:9, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#94a3b8", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#e2e8f0";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="#94a3b8";}}>
            ←
          </button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekStart(getWeekMonday(new Date()))}
              className="btn-ripple"
              style={{ padding:"7px 14px", borderRadius:9, border:"1px solid rgba(16,185,129,0.35)", background:"rgba(16,185,129,0.1)", color:"#34d399", cursor:"pointer", fontSize:12, fontWeight:700, transition:"all .2s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(16,185,129,0.18)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(16,185,129,0.1)"}>
              Сегодня
            </button>
          )}
          <button onClick={() => setWeekStart(getWeekMonday(addDays(weekStart,7)))}
            className="btn-ripple"
            style={{ width:34, height:34, borderRadius:9, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#94a3b8", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#e2e8f0";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="#94a3b8";}}>
            →
          </button>
        </div>
      </div>

      {/* ── Week progress bar ── */}
      {totalTasks > 0 && (
        <div style={{ height:3, background:"rgba(255,255,255,0.04)" }}>
          <div className="progress-shimmer" style={{ width:`${weekPct}%`, height:"100%", background:"linear-gradient(90deg,#10b981,#34d399)", transition:"width .7s cubic-bezier(.34,1.2,.64,1)", boxShadow:"0 0 10px #10b98155" }}/>
        </div>
      )}

      {/* ── Days grid ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:0 }}>
        {WEEK_DAYS.map((day, dayIdx) => {
          const date   = addDays(weekStart, dayIdx);
          const tasks  = dayTasks(dayIdx);
          const isToday = dayIdx === todayIdx;
          const isWeekend = dayIdx >= 5;
          const doneCount = tasks.filter(t=>t.done).length;
          const isAdding  = addingDay === dayIdx;

          return (
            <div key={dayIdx} style={{
              borderRight: dayIdx < 6 ? "1px solid rgba(255,255,255,0.05)" : "none",
              background: isToday
                ? "linear-gradient(180deg,rgba(16,185,129,0.07) 0%,rgba(16,185,129,0.03) 100%)"
                : isWeekend ? "rgba(255,255,255,0.008)" : "transparent",
              display:"flex", flexDirection:"column",
              minHeight: 200,
              transition:"background .2s",
              animation:`fadeUp .4s ${dayIdx*0.05}s cubic-bezier(.22,.68,0,1.2) both`,
            }}>
              {/* Day header */}
              <div style={{
                padding:"12px 10px 8px",
                borderBottom:"1px solid rgba(255,255,255,0.05)",
                display:"flex", flexDirection:"column", gap:2,
                background: isToday ? "rgba(16,185,129,0.06)" : "transparent",
              }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{
                    fontSize:11, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase",
                    color: isToday ? "#34d399" : isWeekend ? "#f43f5e" : "#64748b",
                  }}>{day}</span>
                  {tasks.length > 0 && (
                    <span style={{
                      fontSize:10, fontWeight:700, color: doneCount===tasks.length ? "#34d399" : "#475569",
                      fontFamily:"'JetBrains Mono',monospace",
                      background: doneCount===tasks.length ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                      borderRadius:20, padding:"1px 7px",
                      transition:"all .3s",
                    }}>{doneCount}/{tasks.length}</span>
                  )}
                </div>
                <div style={{
                  fontSize: isToday ? 22 : 18,
                  fontWeight:800,
                  color: isToday ? "#34d399" : "#e2e8f0",
                  fontFamily:"'JetBrains Mono',monospace",
                  lineHeight:1,
                  transition:"font-size .2s",
                }}>
                  {String(date.getDate()).padStart(2,"0")}
                  {isToday && <span style={{ fontSize:9, marginLeft:4, color:"#10b981", verticalAlign:"middle", letterSpacing:"0.05em" }}>СЕГОДНЯ</span>}
                </div>
              </div>

              {/* Tasks list */}
              <div style={{ flex:1, padding:"8px 8px 4px", display:"flex", flexDirection:"column", gap:4 }}>
                {tasks.map(task => {
                  const tc = TASK_COLORS.find(c=>c.id===task.color) || TASK_COLORS[0];
                  const isEditing = editId?.dayIdx===dayIdx && editId?.taskId===task.id;
                  return (
                    <div key={task.id}
                      style={{
                        display:"flex", alignItems:"flex-start", gap:6, padding:"6px 7px",
                        borderRadius:8,
                        background: task.done ? "rgba(255,255,255,0.02)" : `${tc.color}0d`,
                        border:`1px solid ${task.done ? "rgba(255,255,255,0.04)" : `${tc.color}28`}`,
                        transition:"all .2s",
                        cursor:"default",
                        animation:"fadeUp .25s ease both",
                      }}
                      onMouseEnter={e=>e.currentTarget.querySelector(".task-del")?.style && (e.currentTarget.querySelector(".task-del").style.opacity="1")}
                      onMouseLeave={e=>e.currentTarget.querySelector(".task-del")?.style && (e.currentTarget.querySelector(".task-del").style.opacity="0")}
                    >
                      {/* Color dot / checkbox */}
                      <div onClick={() => toggleTask(dayIdx, task.id)}
                        style={{
                          flexShrink:0, marginTop:1,
                          width:14, height:14, borderRadius:4,
                          border:`2px solid ${task.done ? tc.color : `${tc.color}66`}`,
                          background: task.done ? `linear-gradient(135deg,${tc.color}cc,${tc.color})` : "transparent",
                          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                          transition:"all .2s cubic-bezier(.34,1.4,.64,1)",
                          boxShadow: task.done ? `0 0 6px ${tc.color}55` : "none",
                        }}>
                        {task.done && <span style={{ color:"white", fontSize:9, fontWeight:900, animation:"checkPop .3s ease both" }}>✓</span>}
                      </div>

                      {/* Text */}
                      <div style={{ flex:1, minWidth:0 }}>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key==="Enter") saveEdit(dayIdx, task.id);
                              if (e.key==="Escape") setEditId(null);
                            }}
                            onBlur={() => saveEdit(dayIdx, task.id)}
                            style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:"#e2e8f0", fontSize:12, fontFamily:"'Inter',sans-serif" }}
                          />
                        ) : (
                          <span
                            onDoubleClick={() => { setEditId({dayIdx, taskId:task.id}); setEditText(task.text); }}
                            style={{
                              fontSize:12, color: task.done ? "#475569" : "#cbd5e1",
                              textDecoration: task.done ? "line-through" : "none",
                              lineHeight:1.4,
                              wordBreak:"break-word",
                              transition:"color .2s",
                              cursor:"text",
                            }}>
                            {task.text}
                          </span>
                        )}
                      </div>

                      {/* Delete */}
                      <button className="task-del" onClick={() => deleteTask(dayIdx, task.id)}
                        style={{ flexShrink:0, background:"none", border:"none", cursor:"pointer", color:"#334155", fontSize:12, padding:"0 2px", opacity:0, transition:"opacity .15s, color .15s", lineHeight:1 }}
                        onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
                        onMouseLeave={e=>e.currentTarget.style.color="#334155"}>
                        ×
                      </button>
                    </div>
                  );
                })}

                {/* Add task area */}
                {isAdding ? (
                  <div style={{ animation:"fadeUp .2s ease" }}>
                    <div style={{ display:"flex", gap:5, marginBottom:5, flexWrap:"wrap" }}>
                      {TASK_COLORS.map(tc => (
                        <div key={tc.id} onClick={() => setDraftColor(tc.id)}
                          title={tc.label}
                          style={{
                            width:16, height:16, borderRadius:"50%", background:tc.color,
                            cursor:"pointer", border: draftColor===tc.id ? "2px solid white" : "2px solid transparent",
                            transform: draftColor===tc.id ? "scale(1.25)" : "scale(1)",
                            transition:"all .15s", boxShadow: draftColor===tc.id ? `0 0 6px ${tc.color}` : "none",
                          }}/>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <input
                        autoFocus
                        value={draftText}
                        onChange={e => setDraftText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key==="Enter") addTask(dayIdx);
                          if (e.key==="Escape") { setAddingDay(null); setDraftText(""); }
                        }}
                        placeholder="Задача…"
                        style={{
                          flex:1, padding:"6px 9px", borderRadius:8,
                          border:`1px solid ${TASK_COLORS.find(c=>c.id===draftColor)?.color||"#818cf8"}55`,
                          background:"rgba(255,255,255,0.05)", color:"#e2e8f0",
                          fontSize:12, outline:"none",
                        }}
                      />
                      <button onClick={() => addTask(dayIdx)}
                        style={{ padding:"6px 10px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${TASK_COLORS.find(c=>c.id===draftColor)?.color||"#818cf8"},${TASK_COLORS.find(c=>c.id===draftColor)?.color||"#818cf8"}bb)`, color:"white", cursor:"pointer", fontSize:13, fontWeight:700, transition:"all .15s" }}>
                        +
                      </button>
                    </div>
                    <div style={{ fontSize:10, color:"#334155", marginTop:4, textAlign:"center" }}>Enter — добавить · Esc — отмена</div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingDay(dayIdx); setDraftText(""); setDraftColor("indigo"); }}
                    style={{
                      width:"100%", padding:"5px", borderRadius:8,
                      border:"1px dashed rgba(255,255,255,0.08)",
                      background:"transparent", color:"#334155",
                      cursor:"pointer", fontSize:11, transition:"all .2s",
                      marginTop: tasks.length ? 2 : 0,
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(16,185,129,0.4)";e.currentTarget.style.color="#10b981";e.currentTarget.style.background="rgba(16,185,129,0.05)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.color="#334155";e.currentTarget.style.background="transparent";}}>
                    + задача
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer: color legend ── */}
      <div style={{ padding:"10px 18px", borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
        <span style={{ fontSize:10, color:"#334155", fontWeight:700, letterSpacing:"0.08em" }}>КАТЕГОРИИ:</span>
        {TASK_COLORS.map(tc => (
          <div key={tc.id} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:tc.color, boxShadow:`0 0 5px ${tc.color}66` }}/>
            <span style={{ fontSize:11, color:"#475569" }}>{tc.label}</span>
          </div>
        ))}
        <span style={{ marginLeft:"auto", fontSize:11, color:"#2d3748" }}>двойной клик — редактировать</span>
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
              Задач: <span style={{color:"#94a3b8",fontWeight:600,animation:"countUp .4s ease both"}}>{habits.length}</span>
              {" · "}Средний прогресс: <span style={{
                fontWeight:700,fontSize:14,
                background:"linear-gradient(90deg,#818cf8,#a78bfa,#c7d2fe,#818cf8)",
                backgroundSize:"300% auto",
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                animation:"textShimmer 3s linear infinite",
              }}>{avgPct}%</span>
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

      {/* Weekly Planner */}
      <WeeklyPlanner />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFE IN WEEKS
// ═══════════════════════════════════════════════════════════════════════════════
function LifeView(){
  const _uid = useUserId();
  const now=new Date();
  const [birthdateStr, setBirthdateStr] = useState(()=>{
    try{ const v=localStorage.getItem(userKey(_uid, "birthdate")); return v||"2008-10-17"; }catch{ return "2008-10-17"; }
  });
  const [editingBirth, setEditingBirth] = useState(false);
  const [tempBirth, setTempBirth] = useState(birthdateStr);

  const birthdate = new Date(birthdateStr+"T00:00:00");
  const saveBirthdate = () => {
    if(!tempBirth) return;
    setBirthdateStr(tempBirth);
    try{ localStorage.setItem(userKey(_uid, "birthdate"), tempBirth); }catch{}
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

// CHAT_STORAGE_KEY is now dynamic (see AIChatView);

function AIChatView({ habits, finances, monthCount, yearCount }) {
  const _uid = useUserId();
  const CHAT_STORAGE_KEY = userKey(_uid, "ai-chat-messages");
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
  const _uid = useUserId();
  const [videos, setVideos] = useState(() => {
    try { const v = localStorage.getItem(userKey(_uid, "motivation-videos")); return v ? JSON.parse(v) : []; } catch { return []; }
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
    localStorage.setItem(userKey(_uid, "motivation-videos"), JSON.stringify(newVideos));
    setActiveIdx(newVideos.length - 1);
    setInput("");
    setError("");
  };

  const removeVideo = (idx) => {
    const newVideos = videos.filter((_, i) => i !== idx);
    setVideos(newVideos);
    localStorage.setItem(userKey(_uid, "motivation-videos"), JSON.stringify(newVideos));
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
function PomodoroView({ settings, mode, timeLeft, running, session, log, showSettings, editSettings,
  setRunning, setEditSettings, setShowSettings, setLog, switchMode, reset, saveSettings, MODES }) {

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
// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT PLAN VIEW
// ═══════════════════════════════════════════════════════════════════════════════
const CHANNELS = [
  { id: "yt",  label: "YouTube",   icon: "🎬", color: "#ef4444" },
  { id: "tt",  label: "TikTok",    icon: "📱", color: "#ec4899" },
  { id: "vk",  label: "VK",        icon: "💙", color: "#3b82f6" },
  { id: "tg",  label: "Telegram",  icon: "✈️", color: "#06b6d4" },
  { id: "inst",label: "Instagram", icon: "📸", color: "#a78bfa" },
  { id: "other",label:"Другое",    icon: "🌐", color: "#94a3b8" },
];
const STATUSES = [
  { id: "idea",       label: "Идея",         color: "#64748b", bg: "rgba(100,116,139,0.15)" },
  { id: "script",     label: "Сценарий",     color: "#f59e0b", bg: "rgba(245,158,11,0.15)"  },
  { id: "filming",    label: "Съёмка",       color: "#3b82f6", bg: "rgba(59,130,246,0.15)"  },
  { id: "editing",    label: "Монтаж",       color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  { id: "ready",      label: "Готово",       color: "#10b981", bg: "rgba(16,185,129,0.15)"  },
  { id: "published",  label: "Опубликовано", color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
];

function ContentPlanView() {
  const _uid = useUserId();
  const [videos, setVideos] = useState(() => storageGet(userKey(_uid, "content-videos")) || []);
  const [filterCh, setFilterCh]   = useState("all");
  const [filterSt, setFilterSt]   = useState("all");
  const [showForm, setShowForm]   = useState(false);
  const [editId,   setEditId]     = useState(null);
  const [search,   setSearch]     = useState("");

  const emptyForm = { title:"", channel:"yt", status:"idea", deadline:"", tags:"", notes:"", priority:"normal" };
  const [form, setForm] = useState(emptyForm);

  const save = (vids) => { setVideos(vids); storageSet(userKey(_uid, "content-videos"), vids); };

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (v) => { setForm({ title:v.title, channel:v.channel, status:v.status, deadline:v.deadline||"", tags:v.tags||"", notes:v.notes||"", priority:v.priority||"normal" }); setEditId(v.id); setShowForm(true); };

  const submit = () => {
    if (!form.title.trim()) return;
    if (editId) {
      save(videos.map(v => v.id === editId ? { ...v, ...form, title: form.title.trim() } : v));
    } else {
      save([{ id: Date.now(), createdAt: Date.now(), ...form, title: form.title.trim() }, ...videos]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const remove = (id) => save(videos.filter(v => v.id !== id));
  const setStatus = (id, status) => save(videos.map(v => v.id === id ? { ...v, status } : v));

  const filtered = videos.filter(v => {
    if (filterCh !== "all" && v.channel !== filterCh) return false;
    if (filterSt !== "all" && v.status  !== filterSt) return false;
    if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = STATUSES.map(s => ({ ...s, count: videos.filter(v => v.status === s.id).length }));
  const inp = { padding:"9px 13px", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:13, outline:"none", width:"100%", transition:"border-color .15s" };

  const chOf  = (id) => CHANNELS.find(c => c.id === id) || CHANNELS[5];
  const stOf  = (id) => STATUSES.find(s => s.id === id) || STATUSES[0];
  const prioColor = { low:"#64748b", normal:"#f59e0b", high:"#ef4444" };
  const prioLabel = { low:"Низкий", normal:"Средний", high:"Высокий" };

  return (
    <div>
      {/* Header */}
      <GlassCard style={{padding:"18px 22px",marginBottom:20}} glow="#ec4899">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:52,height:52,borderRadius:16,background:"linear-gradient(135deg,#ec4899,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,boxShadow:"0 6px 24px rgba(236,72,153,0.5)"}}>🎥</div>
            <div>
              <div style={{fontWeight:800,fontSize:18,color:"#e2e8f0",letterSpacing:"-0.5px"}}>Контент-план</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:3}}>Все ролики · <span style={{color:"#94a3b8"}}>{videos.length} идей</span></div>
            </div>
          </div>
          <button onClick={openNew} style={{padding:"10px 20px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#ec4899,#f97316)",color:"white",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:"0 4px 16px rgba(236,72,153,0.4)",transition:"all .2s",whiteSpace:"nowrap"}}>
            + Новый ролик
          </button>
        </div>
      </GlassCard>

      {/* Status pipeline */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:20}}>
        {stats.map(s => (
          <GlassCard key={s.id} style={{padding:"12px 14px",cursor:"pointer",border:`1px solid ${filterSt===s.id ? s.color+"66" : "rgba(255,255,255,0.06)"}`,transition:"all .2s"}}
            onClick={() => setFilterSt(filterSt === s.id ? "all" : s.id)}>
            <div style={{fontSize:18,fontWeight:800,color:s.color,fontFamily:"'JetBrains Mono',monospace"}}>{s.count}</div>
            <div style={{fontSize:10,color:"#64748b",marginTop:3,fontWeight:600}}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <GlassCard style={{padding:"12px 16px",marginBottom:16}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Поиск…"
            style={{...inp,width:180,flex:"0 0 auto"}}
            onFocus={e=>e.target.style.borderColor="rgba(236,72,153,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[{id:"all",label:"Все каналы",icon:"📋"},...CHANNELS].map(c => (
              <button key={c.id} onClick={()=>setFilterCh(c.id)} style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${filterCh===c.id?(c.color||"#ec4899")+"66":"rgba(255,255,255,0.08)"}`,background:filterCh===c.id?`${c.color||"#ec4899"}22`:"transparent",color:filterCh===c.id?(c.color||"#ec4899"):"#64748b",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Video cards */}
      {filtered.length === 0 ? (
        <GlassCard style={{padding:"60px 20px",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:14,opacity:0.4}}>🎥</div>
          <div style={{color:"#334155",fontSize:14,fontWeight:600}}>Нет роликов</div>
          <div style={{color:"#1e293b",fontSize:12,marginTop:6}}>{videos.length === 0 ? "Нажми «+ Новый ролик» чтобы начать" : "Попробуй другой фильтр"}</div>
        </GlassCard>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(v => {
            const ch = chOf(v.channel);
            const st = stOf(v.status);
            const tags = v.tags ? v.tags.split(",").map(t=>t.trim()).filter(Boolean) : [];
            const isOverdue = v.deadline && new Date(v.deadline) < new Date() && v.status !== "published";
            return (
              <GlassCard key={v.id} style={{padding:"14px 18px",transition:"all .2s"}} glow={ch.color}>
                <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  {/* Channel icon */}
                  <div style={{width:40,height:40,borderRadius:11,background:`${ch.color}22`,border:`1px solid ${ch.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                    {ch.icon}
                  </div>
                  {/* Content */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                      <span style={{fontWeight:700,fontSize:14,color:"#e2e8f0"}}>{v.title}</span>
                      {v.priority && v.priority !== "normal" && (
                        <span style={{fontSize:10,fontWeight:700,color:prioColor[v.priority],background:`${prioColor[v.priority]}18`,padding:"2px 7px",borderRadius:6}}>
                          {v.priority === "high" ? "🔥" : "⬇️"} {prioLabel[v.priority]}
                        </span>
                      )}
                      {isOverdue && <span style={{fontSize:10,fontWeight:700,color:"#ef4444",background:"rgba(239,68,68,0.12)",padding:"2px 7px",borderRadius:6}}>⚠️ Просрочено</span>}
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:v.notes?8:0}}>
                      <span style={{fontSize:10,color:ch.color,fontWeight:600}}>{ch.icon} {ch.label}</span>
                      <span style={{fontSize:10,color:"#334155"}}>·</span>
                      {/* Status selector */}
                      <select value={v.status} onChange={e=>setStatus(v.id,e.target.value)}
                        style={{fontSize:10,fontWeight:700,color:st.color,background:st.bg,border:`1px solid ${st.color}44`,borderRadius:6,padding:"2px 6px",cursor:"pointer",outline:"none"}}>
                        {STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      {v.deadline && (
                        <span style={{fontSize:10,color:isOverdue?"#ef4444":"#64748b"}}>
                          📅 {new Date(v.deadline).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
                        </span>
                      )}
                      {tags.map(t=>(
                        <span key={t} style={{fontSize:10,color:"#818cf8",background:"rgba(129,140,248,0.1)",padding:"2px 7px",borderRadius:6,fontWeight:600}}>#{t}</span>
                      ))}
                    </div>
                    {v.notes && <div style={{fontSize:12,color:"#475569",lineHeight:1.5,marginTop:4}}>{v.notes}</div>}
                  </div>
                  {/* Actions */}
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>openEdit(v)} style={{width:30,height:30,borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#64748b",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.color="#e2e8f0";e.currentTarget.style.borderColor="rgba(255,255,255,0.18)"}}
                      onMouseLeave={e=>{e.currentTarget.style.color="#64748b";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}}>✏️</button>
                    <button onClick={()=>remove(v.id)} style={{width:30,height:30,borderRadius:8,border:"1px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.05)",color:"#64748b",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.color="#ef4444";e.currentTarget.style.background="rgba(239,68,68,0.15)"}}
                      onMouseLeave={e=>{e.currentTarget.style.color="#64748b";e.currentTarget.style.background="rgba(239,68,68,0.05)"}}>✕</button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={e=>{if(e.target===e.currentTarget){setShowForm(false);setEditId(null);}}}>
          <div style={{background:"rgba(8,14,28,0.98)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:28,width:"100%",maxWidth:520,boxShadow:"0 24px 80px rgba(0,0,0,0.8)",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:800,fontSize:17,color:"#e2e8f0",marginBottom:22}}>{editId ? "✏️ Редактировать ролик" : "🎥 Новый ролик"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Title */}
              <div>
                <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:6,letterSpacing:"0.08em"}}>НАЗВАНИЕ *</div>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                  placeholder="Например: Как я похудел за 30 дней"
                  style={inp} onFocus={e=>e.target.style.borderColor="rgba(236,72,153,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              </div>
              {/* Channel + Status */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:6,letterSpacing:"0.08em"}}>КАНАЛ</div>
                  <select value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}
                    style={{...inp,cursor:"pointer"}}>
                    {CHANNELS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:6,letterSpacing:"0.08em"}}>СТАТУС</div>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
                    style={{...inp,cursor:"pointer"}}>
                    {STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              {/* Priority + Deadline */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:6,letterSpacing:"0.08em"}}>ПРИОРИТЕТ</div>
                  <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}
                    style={{...inp,cursor:"pointer"}}>
                    <option value="low">⬇️ Низкий</option>
                    <option value="normal">➡️ Средний</option>
                    <option value="high">🔥 Высокий</option>
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:6,letterSpacing:"0.08em"}}>ДЕДЛАЙН</div>
                  <input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))}
                    style={{...inp,colorScheme:"dark"}} />
                </div>
              </div>
              {/* Tags */}
              <div>
                <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:6,letterSpacing:"0.08em"}}>ТЕГИ (через запятую)</div>
                <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))}
                  placeholder="влог, туториал, реклама"
                  style={inp} onFocus={e=>e.target.style.borderColor="rgba(236,72,153,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              </div>
              {/* Notes */}
              <div>
                <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:6,letterSpacing:"0.08em"}}>ЗАМЕТКИ / ИДЕЯ</div>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  placeholder="Краткое описание, референсы, план сценария…"
                  rows={3}
                  style={{...inp,resize:"vertical",lineHeight:1.5}}
                  onFocus={e=>e.target.style.borderColor="rgba(236,72,153,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:22}}>
              <button onClick={submit} disabled={!form.title.trim()}
                style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:form.title.trim()?"linear-gradient(135deg,#ec4899,#f97316)":"rgba(255,255,255,0.05)",color:form.title.trim()?"white":"#334155",fontWeight:700,fontSize:14,cursor:form.title.trim()?"pointer":"default",boxShadow:form.title.trim()?"0 4px 16px rgba(236,72,153,0.4)":"none",transition:"all .2s"}}>
                {editId ? "Сохранить" : "Добавить ролик"}
              </button>
              <button onClick={()=>{setShowForm(false);setEditId(null);}}
                style={{padding:"12px 20px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#64748b",fontWeight:600,fontSize:14,cursor:"pointer",transition:"all .15s"}}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDEA BOARD VIEW — Infinite canvas with drawing, text, images + AI analysis
// ═══════════════════════════════════════════════════════════════════════════════
function IdeaBoardView() {
  const _uid = useUserId();
  // ─── State ────────────────────────────────────────────────────────────────────
  const [tool, setTool] = useState("pan"); // pan | draw | text | erase
  const [color, setColor] = useState("#818cf8");
  const [brushSize, setBrushSize] = useState(3);

  // Elements + undo history
  const [elements, setElements] = useState(() => {
    try { const v = localStorage.getItem(userKey(_uid, "board-elements")); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const historyRef = useRef([]); // stack of past element snapshots
  const MAX_HISTORY = 50;

  // Viewport
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  // Interaction
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPathRef = useRef(null);
  const [currentPathState, setCurrentPathState] = useState(null); // for canvas redraw only
  const [selectedEl, setSelectedEl] = useState(null);
  const draggingElRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Text
  const [editingText, setEditingText] = useState(null);
  const textInputRef = useRef(null);

  // AI Chat
  const [aiMessages, setAiMessages] = useState([]); // {role, content}
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const aiEndRef = useRef(null);

  // UI
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, left: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const colorBtnRef = useRef(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const elementsRef = useRef(elements);
  const resizingElRef = useRef(null); // { id, startWorld, startW, startH }

  const BOARD_COLORS = ["#818cf8","#f59e0b","#ef4444","#10b981","#3b82f6","#a78bfa","#ec4899","#14b8a6","#f97316","#ffffff","#e2e8f0","#94a3b8"];

  // ─── Keep refs in sync ────────────────────────────────────────────────────────
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { elementsRef.current = elements; }, [elements]);

  // ─── Persist + push history ───────────────────────────────────────────────────
  const saveElements = useCallback((els, pushHistory = true) => {
    if (pushHistory) {
      historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), elementsRef.current];
    }
    setElements(els);
    elementsRef.current = els;
    try { localStorage.setItem(userKey(_uid, "board-elements"), JSON.stringify(els)); } catch {}
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setElements(prev);
    elementsRef.current = prev;
    try { localStorage.setItem(userKey(_uid, "board-elements"), JSON.stringify(prev)); } catch {}
  }, []);

  // Ctrl+Z global + Escape fullscreen
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  // ─── Canvas draw ──────────────────────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(offsetRef.current.x, offsetRef.current.y);
    ctx.scale(scaleRef.current, scaleRef.current);

    const drawPath = (el) => {
      if (!el.points || el.points.length < 1) return;
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.92;
      if (el.points.length === 1) {
        ctx.arc(el.points[0].x, el.points[0].y, el.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = el.color;
        ctx.fill();
      } else {
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i].x, el.points[i].y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    elementsRef.current.forEach(el => { if (el.type === "path") drawPath(el); });
    if (currentPathRef.current) drawPath(currentPathRef.current);
    ctx.restore();
  }, []);

  useEffect(() => { redrawCanvas(); }, [elements, currentPathState, offset, scale, redrawCanvas]);

  // ─── Canvas resize ────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redrawCanvas]);

  // ─── Wheel (non-passive) ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const s = scaleRef.current;
      const o = offsetRef.current;
      const newScale = Math.max(0.1, Math.min(5, s * factor));
      const wx = (px - o.x) / s;
      const wy = (py - o.y) / s;
      const newOffset = { x: px - wx * newScale, y: py - wy * newScale };
      scaleRef.current = newScale;
      offsetRef.current = newOffset;
      setScale(newScale);
      setOffset(newOffset);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ─── Coord helpers ────────────────────────────────────────────────────────────
  const getEvtPos = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };
  const toWorld = (cx, cy) => ({
    x: (cx - offsetRef.current.x) / scaleRef.current,
    y: (cy - offsetRef.current.y) / scaleRef.current,
  });

  // ─── Pointer handlers ─────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    if (e.button === 1 || e.button === 2) return;
    const pos = getEvtPos(e);
    const world = toWorld(pos.x, pos.y);

    if (tool === "pan") {
      setIsPanning(true);
      panStartRef.current = { x: pos.x - offsetRef.current.x, y: pos.y - offsetRef.current.y };
    } else if (tool === "draw") {
      setIsDrawing(true);
      currentPathRef.current = { type: "path", id: Date.now(), points: [world], color, size: brushSize };
      setCurrentPathState(currentPathRef.current);
    } else if (tool === "erase") {
      const r = 16 / scaleRef.current;
      const next = elementsRef.current.filter(el => {
        if (el.type !== "path") return true;
        return !el.points.some(p => Math.hypot(p.x - world.x, p.y - world.y) < r);
      });
      saveElements(next);
    }
  };

  const handlePointerMove = (e) => {
    const pos = getEvtPos(e);
    const world = toWorld(pos.x, pos.y);

    if (isPanning && panStartRef.current) {
      const newOff = { x: pos.x - panStartRef.current.x, y: pos.y - panStartRef.current.y };
      offsetRef.current = newOff;
      setOffset(newOff);
    } else if (isDrawing && currentPathRef.current) {
      currentPathRef.current = { ...currentPathRef.current, points: [...currentPathRef.current.points, world] };
      setCurrentPathState({ ...currentPathRef.current });
    } else if (draggingElRef.current) {
      const d = dragOffsetRef.current;
      const next = elementsRef.current.map(el =>
        el.id === draggingElRef.current ? { ...el, x: world.x - d.x, y: world.y - d.y } : el
      );
      // live update without pushing history (history pushed on mouseup)
      setElements(next);
      elementsRef.current = next;
    } else if (resizingElRef.current) {
      const r = resizingElRef.current;
      const dx = world.x - r.startWorld.x;
      if (r.aspectRatio) {
        // Image: maintain aspect ratio
        const newW = Math.max(40, r.startW + dx);
        const newH = newW / r.aspectRatio;
        const next = elementsRef.current.map(el =>
          el.id === r.id ? { ...el, w: newW, h: newH } : el
        );
        setElements(next);
        elementsRef.current = next;
      } else {
        // Text box: free resize
        const newW = Math.max(60, r.startW + dx);
        const dy = world.y - r.startWorld.y;
        const newH = r.startH !== null ? Math.max(36, r.startH + dy) : null;
        const next = elementsRef.current.map(el =>
          el.id === r.id ? { ...el, width: newW, ...(newH !== null ? { height: newH } : {}) } : el
        );
        setElements(next);
        elementsRef.current = next;
      }
    }
  };

  const handlePointerUp = () => {
    if (isPanning) setIsPanning(false);
    if (isDrawing && currentPathRef.current && currentPathRef.current.points.length > 0) {
      saveElements([...elementsRef.current, currentPathRef.current]);
      currentPathRef.current = null;
      setCurrentPathState(null);
    }
    setIsDrawing(false);
    if (draggingElRef.current) {
      // push to history now that drag is done
      try { localStorage.setItem(userKey(_uid, "board-elements"), JSON.stringify(elementsRef.current)); } catch {}
      draggingElRef.current = null;
    }
    if (resizingElRef.current) {
      historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), historyRef.current[historyRef.current.length - 1] || elementsRef.current];
      try { localStorage.setItem(userKey(_uid, "board-elements"), JSON.stringify(elementsRef.current)); } catch {}
      resizingElRef.current = null;
    }
  };

  // ─── Text ─────────────────────────────────────────────────────────────────────
  const handleCanvasClick = (e) => {
    if (tool !== "text") return;
    const pos = getEvtPos(e);
    const world = toWorld(pos.x, pos.y);
    const id = Date.now();
    const newEl = { type: "text", id, x: world.x, y: world.y, text: "", color, fontSize: 15 };
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), elementsRef.current];
    const next = [...elementsRef.current, newEl];
    setElements(next);
    elementsRef.current = next;
    setEditingText(id);
    setTimeout(() => textInputRef.current?.focus(), 30);
  };

  const commitText = (id) => {
    setEditingText(null);
    const el = elementsRef.current.find(x => x.id === id);
    if (el && !el.text.trim()) {
      // undo the addition
      historyRef.current = historyRef.current.slice(0, -1);
      const next = elementsRef.current.filter(x => x.id !== id);
      setElements(next);
      elementsRef.current = next;
      try { localStorage.setItem(userKey(_uid, "board-elements"), JSON.stringify(next)); } catch {}
    } else {
      try { localStorage.setItem(userKey(_uid, "board-elements"), JSON.stringify(elementsRef.current)); } catch {}
    }
    setTool("pan");
  };

  // ─── Image upload ─────────────────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const s = scaleRef.current;
        const o = offsetRef.current;
        const cont = containerRef.current;
        const maxW = Math.min(img.width, 400) / s;
        const ratio = maxW / img.width;
        const w = img.width * ratio;
        const h = img.height * ratio;
        const cx = (cont.clientWidth / 2 - o.x) / s;
        const cy = (cont.clientHeight / 2 - o.y) / s;
        saveElements([...elementsRef.current, { type: "image", id: Date.now(), x: cx - w / 2, y: cy - h / 2, w, h, src: ev.target.result }]);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setTool("pan");
  };

  // ─── Element drag ─────────────────────────────────────────────────────────────
  const startDragEl = (e, elId) => {
    if (tool !== "pan") return;
    e.stopPropagation();
    const pos = getEvtPos(e);
    const world = toWorld(pos.x, pos.y);
    const el = elementsRef.current.find(x => x.id === elId);
    if (!el) return;
    // push snapshot for undo before dragging
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), elementsRef.current];
    draggingElRef.current = elId;
    dragOffsetRef.current = { x: world.x - el.x, y: world.y - el.y };
    setSelectedEl(elId);
  };

  const deleteEl = (id) => {
    saveElements(elementsRef.current.filter(el => el.id !== id));
    setSelectedEl(null);
  };

  // ─── AI Chat ──────────────────────────────────────────────────────────────────
  const getBoardContext = () => {
    const els = elementsRef.current;
    const texts = els.filter(e => e.type === "text" && e.text.trim()).map(e => `"${e.text.trim()}"`);
    const paths = els.filter(e => e.type === "path").length;
    const imgs = els.filter(e => e.type === "image").length;

    const parts = [];
    if (texts.length > 0) parts.push(`Текстовые заметки на доске (${texts.length} шт.): ${texts.join(", ")}`);
    else parts.push("Текстовых заметок на доске нет");
    if (paths > 0) parts.push(`Нарисованных линий/фигур: ${paths}`);
    if (imgs > 0) parts.push(`Загруженных изображений: ${imgs}`);

    return parts.join(". ");
  };

  const sendAiMessage = async (text) => {
  if (!text.trim() || aiLoading) return;

  const newMessages = [...aiMessages, { role: "user", content: text.trim() }];
  setAiMessages(newMessages);
  setAiInput("");
  setAiLoading(true);

  const boardCtx = getBoardContext();

  const systemPrompt = `Ты — креативный аналитик идей и помощник по доске идей. Отвечай ТОЛЬКО на русском языке, живо и по делу.

ТЕКУЩЕЕ СОСТОЯНИЕ ДОСКИ:
${boardCtx}

Твоя задача: анализировать идеи с доски, находить связи, предлагать следующие шаги, развивать концепции. Если на доске есть заметки — работай с ними конкретно. Если доска пуста — предложи с чего начать.

Форматируй ответ с **жирным** для ключевых мыслей. Будь конкретным и полезным.`;

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MISTRAL_API_KEY}` },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: systemPrompt },
          ...aiMessages.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: text.trim() },
        ],
      }),
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "Не удалось получить ответ.";
    setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
  } catch {
    setAiMessages(prev => [...prev, { role: "assistant", content: "⚠️ Ошибка соединения. Попробуй ещё раз." }]);
  } finally {
    setAiLoading(false);
  }
};

  const startAnalysis = () => {
    setShowAiPanel(true);
    sendAiMessage("Проанализируй мою доску идей и дай развёрнутый разбор: ключевые темы, связи между идеями, что интересного видишь, и 3 конкретных следующих шага.");
  };

  useEffect(() => {
    if (showAiPanel) aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, showAiPanel]);

  // ─── Format AI markdown ───────────────────────────────────────────────────────
  const formatMsg = (text) => text.split("\n").map((line, i) => {
    const html = line.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").replace(/\*(.*?)\*/g, "<i>$1</i>");
    return <div key={i} style={{ marginBottom: line.trim() ? 4 : 8 }} dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />;
  });

  // ─── Cursor ───────────────────────────────────────────────────────────────────
  const cursorStyle = { pan: isPanning ? "grabbing" : "grab", draw: "crosshair", text: "crosshair", erase: "cell" }[tool] || "default";

  // ─── Overlay elements (text + images) use CSS transform container ─────────────
  const renderOverlay = () => (
    <div style={{
      position: "absolute", left: 0, top: 0,
      transformOrigin: "0 0",
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
      pointerEvents: "none",
    }}>
      {elements.filter(el => el.type === "text" || el.type === "image").map(el => {
        const isSelected = selectedEl === el.id;
        const isEditing = editingText === el.id;

        if (el.type === "text") return (
          <div key={el.id} style={{
            position: "absolute", left: el.x, top: el.y,
            pointerEvents: "all",
            cursor: tool === "pan" ? (draggingElRef.current === el.id ? "grabbing" : "grab") : "default",
            zIndex: isSelected ? 20 : 10,
            userSelect: "none",
          }}
            onMouseDown={ev => startDragEl(ev, el.id)}
            onTouchStart={ev => startDragEl(ev, el.id)}
            onClick={ev => { if (tool === "pan") { ev.stopPropagation(); setSelectedEl(el.id); } }}
          >
            {isEditing ? (
              <textarea ref={textInputRef}
                value={el.text}
                onChange={ev => {
                  const next = elementsRef.current.map(x => x.id === el.id ? { ...x, text: ev.target.value } : x);
                  setElements(next); elementsRef.current = next;
                }}
                onBlur={() => commitText(el.id)}
                onKeyDown={ev => { if (ev.key === "Escape") commitText(el.id); ev.stopPropagation(); }}
                style={{
                  background: "rgba(8,12,24,0.94)", border: `2px solid ${el.color}`,
                  borderRadius: 10, color: el.color, fontSize: el.fontSize,
                  padding: "8px 12px",
                  width: el.width ? el.width : undefined,
                  height: el.height ? el.height : undefined,
                  minWidth: 140, minHeight: 60, outline: "none",
                  resize: "none", fontFamily: "'Inter',system-ui,sans-serif", fontWeight: 600,
                  boxShadow: `0 0 24px ${el.color}44`, backdropFilter: "blur(12px)",
                  lineHeight: 1.5,
                }} autoFocus />
            ) : (
              <div
                style={{
                  background: "rgba(8,12,24,0.88)", border: `2px solid ${isSelected ? el.color : el.color + "55"}`,
                  borderRadius: 10, color: el.color, fontSize: el.fontSize,
                  padding: "8px 12px",
                  width: el.width ? el.width : undefined,
                  height: el.height ? el.height : undefined,
                  minWidth: 60, maxWidth: el.width ? undefined : 320,
                  fontFamily: "'Inter',system-ui,sans-serif", fontWeight: 600,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  boxShadow: isSelected ? `0 0 24px ${el.color}66` : "0 4px 20px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(12px)", transition: "border-color .15s, box-shadow .15s",
                  lineHeight: 1.5, overflow: el.height ? "auto" : undefined,
                }}
                onDoubleClick={ev => { ev.stopPropagation(); historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), elementsRef.current]; setEditingText(el.id); }}
              >
                {el.text || <span style={{ opacity: 0.3, fontStyle: "italic", fontSize: "0.9em" }}>двойной клик</span>}
              </div>
            )}
            {isSelected && !isEditing && tool === "pan" && (
              <>
                {/* Delete button */}
                <button onClick={ev => { ev.stopPropagation(); deleteEl(el.id); }}
                  style={{
                    position: "absolute", top: -9, right: -9, width: 20, height: 20,
                    borderRadius: "50%", background: "#ef4444", border: "2px solid rgba(0,0,0,0.3)",
                    color: "white", fontSize: 10, cursor: "pointer", fontWeight: 900,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(239,68,68,0.6)", lineHeight: 1,
                  }}>✕</button>

                {/* Font size controls */}
                <div
                  onMouseDown={ev => ev.stopPropagation()}
                  style={{
                    position: "absolute", top: -34, left: 0,
                    display: "flex", alignItems: "center", gap: 4,
                    background: "rgba(8,12,24,0.95)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8, padding: "3px 6px", backdropFilter: "blur(16px)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                  }}>
                  <button
                    onClick={ev => { ev.stopPropagation(); const next = elementsRef.current.map(x => x.id === el.id ? { ...x, fontSize: Math.max(8, (x.fontSize||15) - 2) } : x); setElements(next); elementsRef.current = next; try { localStorage.setItem(userKey(_uid, "board-elements"), JSON.stringify(next)); } catch {} }}
                    style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "rgba(255,255,255,0.07)", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>−</button>
                  <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, minWidth: 22, textAlign: "center", fontFamily: "'JetBrains Mono',monospace" }}>{el.fontSize||15}</span>
                  <button
                    onClick={ev => { ev.stopPropagation(); const next = elementsRef.current.map(x => x.id === el.id ? { ...x, fontSize: Math.min(96, (x.fontSize||15) + 2) } : x); setElements(next); elementsRef.current = next; try { localStorage.setItem(userKey(_uid, "board-elements"), JSON.stringify(next)); } catch {} }}
                    style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "rgba(255,255,255,0.07)", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
                  <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />
                  <span style={{ fontSize: 9, color: "#475569" }}>px</span>
                </div>

                {/* Resize handle — bottom-right corner */}
                <div
                  onMouseDown={ev => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    const pos = getEvtPos(ev);
                    const world = toWorld(pos.x, pos.y);
                    const curEl = elementsRef.current.find(x => x.id === el.id);
                    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), elementsRef.current];
                    resizingElRef.current = {
                      id: el.id,
                      startWorld: world,
                      startW: curEl.width || (ev.currentTarget.parentElement.querySelector("div")?.offsetWidth || 120),
                      startH: curEl.height || null,
                    };
                  }}
                  style={{
                    position: "absolute", bottom: -7, right: -7,
                    width: 14, height: 14, borderRadius: 4,
                    background: el.color, border: "2px solid rgba(0,0,0,0.4)",
                    cursor: "nwse-resize", zIndex: 30,
                    boxShadow: `0 0 8px ${el.color}88`,
                  }}
                />
              </>
            )}
          </div>
        );

        if (el.type === "image") return (
          <div key={el.id} style={{
            position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h,
            pointerEvents: "all",
            cursor: tool === "pan" ? (draggingElRef.current === el.id ? "grabbing" : "grab") : "default",
            zIndex: isSelected ? 20 : 10,
            border: `2px solid ${isSelected ? "#818cf8" : "transparent"}`,
            borderRadius: 12, overflow: "visible",
            boxShadow: isSelected ? "0 0 24px rgba(129,140,248,0.6)" : "0 8px 32px rgba(0,0,0,0.5)",
            transition: "border-color .15s, box-shadow .15s",
          }}
            onMouseDown={ev => startDragEl(ev, el.id)}
            onTouchStart={ev => startDragEl(ev, el.id)}
            onClick={ev => { if (tool === "pan") { ev.stopPropagation(); setSelectedEl(el.id); } }}
          >
            <div style={{ width: "100%", height: "100%", borderRadius: 10, overflow: "hidden" }}>
              <img src={el.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} draggable={false} />
            </div>
            {isSelected && tool === "pan" && (
              <>
                <button onClick={ev => { ev.stopPropagation(); deleteEl(el.id); }}
                  style={{
                    position: "absolute", top: 5, right: 5, width: 22, height: 22,
                    borderRadius: "50%", background: "#ef4444", border: "2px solid rgba(0,0,0,0.3)",
                    color: "white", fontSize: 11, cursor: "pointer", fontWeight: 900,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(239,68,68,0.6)",
                  }}>✕</button>
                {/* Resize handle — bottom-right corner */}
                <div
                  onMouseDown={ev => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    const pos = getEvtPos(ev);
                    const world = toWorld(pos.x, pos.y);
                    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), elementsRef.current];
                    resizingElRef.current = {
                      id: el.id,
                      startWorld: world,
                      startW: el.w,
                      startH: el.h,
                      aspectRatio: el.w / el.h,
                    };
                  }}
                  style={{
                    position: "absolute", bottom: -7, right: -7,
                    width: 14, height: 14, borderRadius: 4,
                    background: "#818cf8", border: "2px solid rgba(0,0,0,0.4)",
                    cursor: "nwse-resize", zIndex: 30,
                    boxShadow: "0 0 8px rgba(129,140,248,0.8)",
                  }}
                />
              </>
            )}
          </div>
        );
        return null;
      })}
    </div>
  );

  // ─── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 0,
      ...(isFullscreen
        ? { position: "fixed", inset: 0, zIndex: 9999, background: "#060b18", padding: 10 }
        : { height: "calc(100vh - 80px)" }
      )
    }}>
      {/* Header toolbar */}
      <GlassCard style={{ padding: "10px 14px", marginBottom: 10, flexShrink: 0 }} glow="#818cf8">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#818cf8,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 14px rgba(129,140,248,0.5)", flexShrink: 0 }}>💡</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#e2e8f0" }}>Доска идей</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{elements.length} эл. · {Math.round(scale * 100)}%</div>
            </div>
          </div>

          {/* Tool group */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11, padding: "4px" }}>
            {[
              { id: "pan", icon: "✋", tip: "Перемещение (V)" },
              { id: "draw", icon: "✏️", tip: "Рисование (D)" },
              { id: "text", icon: "T", tip: "Текст (T)" },
              { id: "erase", icon: "⌫", tip: "Ластик (E)" },
            ].map(t => (
              <button key={t.id} onClick={() => setTool(t.id)} title={t.tip}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer",
                  background: tool === t.id ? "linear-gradient(135deg,#6366f1,#a78bfa)" : "transparent",
                  color: tool === t.id ? "white" : "#475569",
                  fontSize: t.id === "text" ? 13 : 16, fontWeight: 800,
                  boxShadow: tool === t.id ? "0 2px 10px rgba(129,140,248,0.5)" : "none",
                  transition: "all .18s",
                }}>{t.icon}</button>
            ))}
          </div>

          {/* Color picker */}
          {(tool === "draw" || tool === "text") && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative" }}>
                <button
                  ref={colorBtnRef}
                  onClick={() => {
                    if (!showColorPicker && colorBtnRef.current) {
                      const rect = colorBtnRef.current.getBoundingClientRect();
                      setColorPickerPos({ top: rect.bottom + 6, left: rect.left });
                    }
                    setShowColorPicker(p => !p);
                  }}
                  style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${showColorPicker ? "white" : "rgba(255,255,255,0.2)"}`, background: color, cursor: "pointer", boxShadow: `0 0 14px ${color}88`, flexShrink: 0 }} />
                {showColorPicker && createPortal(
                  <>
                    <div onClick={() => setShowColorPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 99998 }} />
                    <div style={{ position: "fixed", top: colorPickerPos.top, left: colorPickerPos.left, zIndex: 99999, background: "rgba(8,12,24,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 10, display: "flex", flexWrap: "wrap", gap: 5, width: 160, backdropFilter: "blur(20px)", boxShadow: "0 10px 40px rgba(0,0,0,0.7)" }}>
                      {BOARD_COLORS.map(c => (
                        <div key={c} onClick={() => { setColor(c); setShowColorPicker(false); }}
                          style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? "3px solid white" : "2px solid transparent", transform: color === c ? "scale(1.22)" : "scale(1)", transition: "all .14s", boxShadow: color === c ? `0 0 8px ${c}` : "none" }} />
                      ))}
                    </div>
                  </>,
                  document.body
                )}
              </div>
              {tool === "draw" && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {[2, 4, 8, 14].map(s => (
                    <div key={s} onClick={() => setBrushSize(s)}
                      style={{ width: s * 2 + 2, height: s * 2 + 2, minWidth: 14, minHeight: 14, borderRadius: "50%", background: brushSize === s ? color : "#1e293b", cursor: "pointer", border: brushSize === s ? `2px solid ${color}` : "2px solid #334155", transition: "all .14s", boxShadow: brushSize === s ? `0 0 8px ${color}` : "none" }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Undo button */}
          <button onClick={undo} title="Отменить (Ctrl+Z)"
            style={{ padding: "7px 13px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all .18s", display: "flex", alignItems: "center", gap: 5 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#a78bfa"; e.currentTarget.style.borderColor = "rgba(167,139,250,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
            ↩ Отмена
          </button>

          {/* Image upload */}
          <button onClick={() => fileInputRef.current?.click()}
            style={{ padding: "7px 13px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all .18s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(129,140,248,0.4)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}>
            🖼️ Фото
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />

          {/* Reset view */}
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); scaleRef.current = 1; offsetRef.current = { x: 0, y: 0 }; }}
            style={{ padding: "7px 13px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#64748b", cursor: "pointer", fontSize: 12, transition: "all .18s" }}>
            ⊙ Сброс вида
          </button>

          {/* Clear all */}
          <button onClick={() => { if (window.confirm("Очистить доску?")) { saveElements([]); setSelectedEl(null); } }}
            style={{ padding: "7px 13px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "#334155", cursor: "pointer", fontSize: 12, transition: "all .18s", marginLeft: 2 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#334155"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
            🗑️ Очистить
          </button>

          {/* AI Chat button */}
          <button onClick={() => { setShowAiPanel(p => !p); }}
            style={{
              padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer", marginLeft: "auto",
              background: showAiPanel ? "rgba(129,140,248,0.2)" : "linear-gradient(135deg,#6366f1,#a78bfa)",
              color: showAiPanel ? "#818cf8" : "white", fontWeight: 700, fontSize: 13,
              border: showAiPanel ? "1px solid rgba(129,140,248,0.4)" : "none",
              boxShadow: showAiPanel ? "none" : "0 4px 14px rgba(129,140,248,0.5)",
              transition: "all .2s", display: "flex", alignItems: "center", gap: 6,
            }}>
            🤖 {showAiPanel ? "Скрыть ИИ" : "ИИ-чат"}
          </button>

          {/* Analyze board shortcut */}
          <button onClick={startAnalysis}
            style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(129,140,248,0.3)", background: "rgba(129,140,248,0.08)", color: "#818cf8", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all .18s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(129,140,248,0.16)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(129,140,248,0.08)"}>
            ✦ Анализ доски
          </button>

          {/* Fullscreen button */}
          <button onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? "Выйти из полного экрана (Esc)" : "Открыть на весь экран"}
            style={{ padding: "7px 13px", borderRadius: 9, border: `1px solid ${isFullscreen ? "rgba(129,140,248,0.5)" : "rgba(255,255,255,0.08)"}`, background: isFullscreen ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.04)", color: isFullscreen ? "#818cf8" : "#94a3b8", cursor: "pointer", fontSize: 15, transition: "all .18s", lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(129,140,248,0.4)"; e.currentTarget.style.color = "#818cf8"; }}
            onMouseLeave={e => { if (!isFullscreen) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#94a3b8"; } }}>
            {isFullscreen ? "⛶" : "⛶"}
          </button>
        </div>
      </GlassCard>

      {/* Board + AI row */}
      <div style={{ flex: 1, display: "flex", gap: 10, minHeight: 0 }}>
        {/* Canvas container */}
        <div ref={containerRef}
          style={{
            flex: 1, position: "relative", borderRadius: 14,
            background: "rgba(4,8,18,0.85)",
            border: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden", cursor: cursorStyle,
            backgroundImage: "radial-gradient(circle, rgba(129,140,248,0.035) 1px, transparent 1px)",
            backgroundSize: `${28 * scale}px ${28 * scale}px`,
            backgroundPosition: `${offset.x % (28 * scale)}px ${offset.y % (28 * scale)}px`,
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onClick={e => {
            if (tool === "text") handleCanvasClick(e);
            else if (tool === "pan") setSelectedEl(null);
          }}
        >
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
          {renderOverlay()}

          {elements.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", gap: 10 }}>
              <div style={{ fontSize: 44, opacity: 0.1 }}>💡</div>
              <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, textAlign: "center", lineHeight: 1.6 }}>
                Пустая доска<br />
                <span style={{ fontSize: 11, fontWeight: 400, color: "#0f172a" }}>
                  ✏️ рисуй · T текст · 🖼️ картинки · колёсико = зум
                </span>
              </div>
            </div>
          )}

          {/* Status bar */}
          <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, display: "flex", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
            <div style={{ background: "rgba(4,8,18,0.8)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 7, padding: "4px 10px", fontSize: 10, color: "#334155", backdropFilter: "blur(8px)" }}>
              {tool === "pan" && "✋ Тяни · скролл = зум · клик на элемент · двойной клик = редактировать текст"}
              {tool === "draw" && "✏️ Зажми и рисуй · Ctrl+Z = отмена"}
              {tool === "text" && "T Кликни чтобы добавить заметку · Esc чтобы завершить"}
              {tool === "erase" && "⌫ Нажми на линию чтобы удалить"}
            </div>
            <div style={{ background: "rgba(4,8,18,0.8)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 7, padding: "4px 10px", fontSize: 10, color: "#334155", backdropFilter: "blur(8px)", fontFamily: "'JetBrains Mono',monospace" }}>
              {Math.round(scale * 100)}%
            </div>
          </div>
        </div>

        {/* AI Chat panel */}
        {showAiPanel && (
          <GlassCard style={{ width: 340, padding: 0, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }} glow="#818cf8">
            {/* Panel header */}
            <div style={{ padding: "12px 16px", background: "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(167,139,250,0.08))", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>ИИ-помощник</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>знает контекст доски</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {aiMessages.length > 0 && (
                  <button onClick={() => setAiMessages([])}
                    style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 11, padding: "3px 7px", borderRadius: 6, transition: "color .15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"} onMouseLeave={e => e.currentTarget.style.color = "#334155"}>
                    очистить
                  </button>
                )}
                <button onClick={() => setShowAiPanel(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 4px" }}>✕</button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {aiMessages.length === 0 && !aiLoading && (
                <div style={{ textAlign: "center", paddingTop: 30, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 28, opacity: 0.3 }}>🤖</div>
                  <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.6 }}>
                    Спроси что угодно о доске<br />или нажми «Анализ доски»
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {["Проанализируй мою доску", "Как связаны эти идеи?", "Предложи следующий шаг"].map(q => (
                      <button key={q} onClick={() => sendAiMessage(q)}
                        style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(129,140,248,0.2)", background: "rgba(129,140,248,0.06)", color: "#818cf8", cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all .15s", textAlign: "left" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(129,140,248,0.14)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(129,140,248,0.06)"}>
                        {q} →
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {aiMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "88%", padding: "9px 12px", borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                    background: msg.role === "user" ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "rgba(255,255,255,0.05)",
                    border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.07)",
                    color: msg.role === "user" ? "white" : "#cbd5e1",
                    fontSize: 12.5, lineHeight: 1.65,
                    boxShadow: msg.role === "user" ? "0 2px 12px rgba(79,70,229,0.4)" : "none",
                  }}>
                    {msg.role === "assistant" ? formatMsg(msg.content) : msg.content}
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 3px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#818cf8", animation: `bounce .8s ${i * 0.14}s ease-in-out infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={aiEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", gap: 7 }}>
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(aiInput); } }}
                placeholder="Напиши сообщение…"
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.09)",
                  background: "rgba(255,255,255,0.04)", color: "#e2e8f0", fontSize: 12.5, outline: "none",
                  transition: "border-color .15s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(129,140,248,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
              />
              <button onClick={() => sendAiMessage(aiInput)} disabled={aiLoading || !aiInput.trim()}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: "none", cursor: aiLoading || !aiInput.trim() ? "default" : "pointer",
                  background: aiInput.trim() ? "linear-gradient(135deg,#6366f1,#a78bfa)" : "rgba(255,255,255,0.05)",
                  color: aiInput.trim() ? "white" : "#334155", fontSize: 16, flexShrink: 0,
                  boxShadow: aiInput.trim() ? "0 2px 10px rgba(99,102,241,0.5)" : "none",
                  transition: "all .18s", display: "flex", alignItems: "center", justifyContent: "center",
                }}>→</button>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
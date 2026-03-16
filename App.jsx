import{useState,useMemo,useCallback,useEffect,useRef}from"react";

/* ══ §1 CONSTANTS ═══════════════════════════════════════════ */
const VENDOR_NAME="PT. API DISTRIBUSI INDONESIA";
const VENDOR_ADDR="Jl. Industri Raya No.123, Medan, Sumatera Utara";
const VENDOR_CONTACT="Tel: +62-61-XXXX-XXXX  |  po@apidistribusi.co.id";
const PPN_RATE=0.11;const PAGE_SIZE=50;
const DEFAULT_DO_FIELDS=[
  {key:"driverName",   label:"Nama Supir",    enabled:true, type:"text"},
  {key:"vehiclePlate", label:"No. Polisi",    enabled:true, type:"text"},
  {key:"personInCharge",label:"PIC",          enabled:false,type:"text"},
  {key:"sealNo",       label:"No. Seal",      enabled:false,type:"text"},
  {key:"remarks",      label:"Keterangan",    enabled:true, type:"textarea"},
];
const INIT_SETTINGS={overdueDays:7,doFormat:"DO/{YYYY}/{NNN}",doFields:DEFAULT_DO_FIELDS};
const INIT_COMPANIES=["PT. AGRO MURNI","PT. SIMPANG KANAN LESTARINDO","PT. SUMBER JAYA INDUSTRI OLEO","PT. PACIFIC PALMINDO INDUSTRI","PT. ABLE COMMODITIES INDONESIA","PT. KENCANA INTI PERKASA","PT. INNO WANGSA OIL & FATS"];
const INIT_ZONE_TYPES=["Zone 1 – Lokal","Zone 2 – Regional","Zone 3 – Nasional","Zone 4 – Import","Boned Zone"];
const UNITS=["pcs","set","roll","meter","kg","liter","box","unit","lot","batang","lembar","drum","koli","sheet"];
const INIT_SUPPLIERS=[
  {id:"SUP001",name:"CV. Teknik Jaya",       contact:"Budi Santoso", phone:"0812-3456-7890",email:"teknikjaya@email.com",address:"Jl. Industri No.5, Medan",         tags:["hydraulic","fitting","hose"],        notes:"Supplier lokal Medan",createdAt:"2024-01-15",deletedAt:null},
  {id:"SUP002",name:"UD. Belt Nusantara",     contact:"Siti Rahayu",  phone:"0813-9876-5432",email:"belt@email.com",       address:"Jl. Pahlawan No.12, Medan",        tags:["v-belt","belt","mechanical"],        notes:"Spesialis belt",      createdAt:"2024-02-01",deletedAt:null},
  {id:"SUP003",name:"PT. Flanges Indonesia",  contact:"Ahmad Fauzi",  phone:"0811-2233-4455",email:"flanges@email.com",    address:"Jl. Raya Industri No.88, Batam",   tags:["flange","fitting","piping"],         notes:"Supplier flanges",    createdAt:"2024-02-15",deletedAt:null},
  {id:"SUP004",name:"PT. Pompa Sentosa",      contact:"Rudi Hermawan",phone:"0815-6677-8899",email:"pompa@email.com",      address:"Jl. Sisingamangaraja No.45, Medan",tags:["pump","impeller","centrifugal"],     notes:"Spesialis pompa",     createdAt:"2024-03-01",deletedAt:null},
  {id:"SUP005",name:"CV. Valve Indonesia",    contact:"Dewi Kusuma",  phone:"0817-1122-3344",email:"valve@email.com",      address:"Jl. Gatot Subroto No.22, Jakarta", tags:["valve","control valve","ball valve"],notes:"Supplier valve",      createdAt:"2024-03-10",deletedAt:null},
  {id:"SUP006",name:"PT. Grundfos Indonesia", contact:"Joko Prabowo", phone:"0818-9988-7766",email:"grundfos@email.com",   address:"Jl. TB Simatupang No.1, Jakarta",  tags:["pump","dosing pump","industrial"],   notes:"Brand pump premium",  createdAt:"2024-04-01",deletedAt:null},
];
const INIT_PO_STATUS={
  draft:      {label:"Draft",        color:"#64748b",bg:"#f1f5f9",ring:"#cbd5e1"},
  pending:    {label:"Pending",      color:"#b45309",bg:"#fef3c7",ring:"#fbbf24"},
  confirmed:  {label:"Confirmed",    color:"#1d4ed8",bg:"#dbeafe",ring:"#93c5fd"},
  revision:   {label:"Revision",     color:"#c2410c",bg:"#ffedd5",ring:"#fb923c"},
  on_hold:    {label:"On Hold",      color:"#6d28d9",bg:"#ede9fe",ring:"#a78bfa"},
  partial_del:{label:"Partial Del.", color:"#0369a1",bg:"#e0f2fe",ring:"#7dd3fc"},
  delivered:  {label:"Delivered",    color:"#1e40af",bg:"#dbeafe",ring:"#6b9ffd"},
  invoiced:   {label:"Invoiced",     color:"#0e7490",bg:"#cffafe",ring:"#67e8f9"},
  partial_pay:{label:"Partial Pay",  color:"#15803d",bg:"#dcfce7",ring:"#86efac"},
  paid:       {label:"Paid",         color:"#166534",bg:"#bbf7d0",ring:"#4ade80"},
  cancelled:  {label:"Cancelled",    color:"#991b1b",bg:"#fee2e2",ring:"#fca5a5"},
};
const ITEM_STATUS={
  pending:  {label:"Pending",  color:"#64748b",bg:"#f1f5f9",ring:"#cbd5e1"},
  ordered:  {label:"Ordered",  color:"#b45309",bg:"#fef3c7",ring:"#fbbf24"},
  partial:  {label:"Partial",  color:"#0369a1",bg:"#e0f2fe",ring:"#7dd3fc"},
  delivered:{label:"Delivered",color:"#166534",bg:"#bbf7d0",ring:"#4ade80"},
  invoiced: {label:"Invoiced", color:"#0e7490",bg:"#cffafe",ring:"#67e8f9"},
  paid:     {label:"Paid",     color:"#166534",bg:"#dcfce7",ring:"#86efac"},
  returned: {label:"Returned", color:"#c2410c",bg:"#ffedd5",ring:"#fb923c"},
  cancelled:{label:"Cancelled",color:"#991b1b",bg:"#fee2e2",ring:"#fca5a5"},
};
const mkItem=(o={})=>({id:"",poId:"",itemName:"",desc:"",qty:1,unit:"pcs",unitPrice:0,discount:0,discountPct:0,supplierAssignments:[],status:"pending",deliveryDate:"",doNos:[],invoiceNo:"",zoneType:"",hsCode:"",...o});
const mkAsgn=(o={})=>({id:"",supplierId:"",pricePerUnit:0,shippingTotal:0,role:"main",link:"",notes:"",...o});
const INIT_POS=[
  {id:"po001",quoteRef:"019/MIA/V/2024",      orderNo:"PTAM/PO/NT/24/00497",   company:"PT. AGRO MURNI",               orderDate:"2024-05-21",prNo:"PTAM/PR/00497",notes:"",folder:"",status:"paid",      priority:"normal",totalLocked:false,manualExPPN:0,       manualPPN:0},
  {id:"po002",quoteRef:"1500/API/09/MDN/2024", orderNo:"SJIO/REF/PO2411/372",   company:"PT. SUMBER JAYA INDUSTRI OLEO",orderDate:"2024-11-26",prNo:"",           notes:"",folder:"",status:"paid",      priority:"normal",totalLocked:true, manualExPPN:1778600, manualPPN:195646},
  {id:"po003",quoteRef:"1529/API/10/MDN/2024", orderNo:"SJIO/PROJ/PO2410/074",  company:"PT. SUMBER JAYA INDUSTRI OLEO",orderDate:"2024-10-16",prNo:"",           notes:"",folder:"",status:"invoiced",  priority:"urgent",totalLocked:true, manualExPPN:27748250,manualPPN:3052307},
  {id:"po004",quoteRef:"1295/API/05/MDN/2024", orderNo:"SKL/PO/NT/24/00478",    company:"PT. SIMPANG KANAN LESTARINDO", orderDate:"2024-05-28",prNo:"",           notes:"",folder:"",status:"confirmed", priority:"normal",totalLocked:false,manualExPPN:0,       manualPPN:0},
  {id:"po005",quoteRef:"1530/API/10/MDN/2024", orderNo:"SJIO/PROJ/PO2410/068",  company:"PT. SUMBER JAYA INDUSTRI OLEO",orderDate:"2024-10-13",prNo:"",           notes:"QUOTATION PRJ",folder:"",status:"pending",priority:"urgent",totalLocked:false,manualExPPN:0,manualPPN:0},
];
const INIT_ITEMS=[
  mkItem({id:"item001",poId:"po001",itemName:'Hydraulic Hose 1"',    desc:"High pressure hose",         qty:10,unit:"meter",unitPrice:285000, supplierAssignments:[mkAsgn({id:"sa001",supplierId:"SUP001",pricePerUnit:220000,shippingTotal:0,    role:"main"})],                                                                                        status:"delivered",deliveryDate:"2024-06-01",doNos:["DO/2024/001"],invoiceNo:"INV/TJ/2024/045",zoneType:"Zone 1 – Lokal",  hsCode:"3917.32.00"}),
  mkItem({id:"item002",poId:"po001",itemName:'Hydraulic Fitting 1"', desc:"Male/female coupling",       qty:20,unit:"pcs",  unitPrice:45000,  supplierAssignments:[mkAsgn({id:"sa002",supplierId:"SUP001",pricePerUnit:32000, shippingTotal:0,    role:"main"}),mkAsgn({id:"sa003",supplierId:"SUP003",pricePerUnit:31000,shippingTotal:50000,role:"backup",notes:"Cek stok dulu"})],status:"delivered",deliveryDate:"2024-06-01",doNos:["DO/2024/001"],invoiceNo:"INV/TJ/2024/045",zoneType:"Zone 1 – Lokal",  hsCode:"7307.99.90"}),
  mkItem({id:"item003",poId:"po002",itemName:"Pump Impeller",         desc:"Centrifugal pump impeller",  qty:2, unit:"pcs",  unitPrice:750000, supplierAssignments:[mkAsgn({id:"sa004",supplierId:"SUP004",pricePerUnit:580000,shippingTotal:25000,role:"main"})],                                                                                        status:"paid",     deliveryDate:"2024-12-01",doNos:["DO/2411/001"],invoiceNo:"INV/PS/2411/021",zoneType:"Zone 3 – Nasional",hsCode:"8413.91.90"}),
  mkItem({id:"item004",poId:"po003",itemName:"Control Valve DN50",    desc:"Ball valve flanged DN50 PN16",qty:4, unit:"pcs",  unitPrice:1250000,supplierAssignments:[mkAsgn({id:"sa005",supplierId:"SUP005",pricePerUnit:950000, shippingTotal:0,   role:"main",link:"https://valve.co.id/dn50"}),mkAsgn({id:"sa006",supplierId:"SUP003",pricePerUnit:980000,role:"backup"})],status:"invoiced", deliveryDate:"2024-10-20",doNos:["DO/2410/011"],invoiceNo:"INV/VI/2410/055",zoneType:"Zone 2 – Regional",hsCode:"8481.20.00"}),
  mkItem({id:"item005",poId:"po004",itemName:"Coupling Flange DN80",  desc:"PN16 slip-on flange CS",     qty:8, unit:"pcs",  unitPrice:275000, supplierAssignments:[mkAsgn({id:"sa007",supplierId:"SUP003",pricePerUnit:200000,shippingTotal:15000,role:"main"})],                                                                                        status:"ordered",  zoneType:"Zone 1 – Lokal",  hsCode:"7307.91.00"}),
  mkItem({id:"item006",poId:"po005",itemName:"Chemical Dosing Pump",  desc:"Dosing pump 50 L/h",         qty:2, unit:"unit", unitPrice:4500000,supplierAssignments:[mkAsgn({id:"sa008",supplierId:"SUP006",pricePerUnit:3800000,shippingTotal:150000,role:"main",link:"https://grundfos.com"}),mkAsgn({id:"sa009",supplierId:"SUP004",pricePerUnit:3900000,role:"backup"})],status:"pending",hsCode:"8413.81.90"}),
];
const INIT_DOS=[
  {id:"do001",doNo:"DO/2024/001",poId:"po001",createdAt:"2024-06-01",deliveryDate:"2024-06-01",fieldValues:{driverName:"Budi Santoso",vehiclePlate:"BK 1234 AB",remarks:"Pengiriman batch pertama"},lines:[{itemId:"item001",qtyDelivered:10,hsCode:"3917.32.00",notes:""},{itemId:"item002",qtyDelivered:20,hsCode:"7307.99.90",notes:""}]},
  {id:"do002",doNo:"DO/2411/001",poId:"po002",createdAt:"2024-12-01",deliveryDate:"2024-12-01",fieldValues:{driverName:"Joko Prabowo",vehiclePlate:"BK 5678 CD",remarks:""},lines:[{itemId:"item003",qtyDelivered:2,hsCode:"8413.91.90",notes:""}]},
  {id:"do003",doNo:"DO/2410/011",poId:"po003",createdAt:"2024-10-20",deliveryDate:"2024-10-20",fieldValues:{driverName:"Ahmad",vehiclePlate:"B 9901 ZZ",remarks:""},lines:[{itemId:"item004",qtyDelivered:4,hsCode:"8481.20.00",notes:""}]},
];

/* ══ §2 HELPERS ══════════════════════════════════════════════ */
const uid=()=>"x"+Math.random().toString(36).slice(2,9);
const today=()=>new Date().toISOString().slice(0,10);
const diffDays=d=>d?Math.floor((Date.now()-new Date(d))/(864e5)):-1;
const isOverdue=(p,days=7)=>["pending","confirmed"].includes(p.status)&&p.orderDate&&diffDays(p.orderDate)>days;
const isIncompletePO=p=>!p.orderNo||!p.orderNo.trim()||p.orderNo.trim()==="Order"||!p.orderDate||p.orderDate==="dd/mm/yyyy"||!p.company||!p.company.trim();
const parseIDR=s=>{if(!s&&s!==0)return 0;return parseFloat(String(s).replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,""))||0;};
const parseCSVLine=line=>{const res=[];let cur="";let inQ=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;}else inQ=!inQ;}else if(c===","&&!inQ){res.push(cur.trim());cur="";}else cur+=c;}res.push(cur.trim());return res;};
const parseSmartDate=raw=>{if(!raw||!raw.trim())return"";const s=raw.trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const parts=s.split(/[.\-\/]/);if(parts.length===3){let[d,m,y]=parts.map(Number);if(y<100)y+=y<50?2000:1900;if(d>0&&m>0&&m<=12&&y>1900)return`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}return"";};
const CSV_PO_ST={"complete":"paid","do needed":"pending","cancel":"cancelled","urgent":"pending","masalah":"on_hold","rev 1":"revision","p0":"draft","inv blm print":"invoiced","invoice request":"invoiced","quick do":"pending","partial":"partial_del"};
const CSV_IT_ST={"complete":"paid","delivered":"delivered","delivering":"delivered","ongoing":"ordered","ongoing or partial":"partial","ordered":"ordered","ready in office":"ordered","shipped":"delivered","stocked dumai":"ordered","stocked office":"ordered"};
const mapPOSt=s=>CSV_PO_ST[(s||"").toLowerCase().trim()]||"draft";
const mapItemSt=s=>CSV_IT_ST[(s||"").toLowerCase().trim()]||"pending";
const formatDO=(fmt,seq)=>{const n=new Date();return(fmt||"DO/{YYYY}/{NNN}").replace(/{YYYY}/g,n.getFullYear()).replace(/{YY}/g,String(n.getFullYear()).slice(2)).replace(/{MM}/g,String(n.getMonth()+1).padStart(2,"0")).replace(/{NNN}/g,String(seq).padStart(3,"0")).replace(/{NN}/g,String(seq).padStart(2,"0")).replace(/{N}/g,String(seq));};
const nextDOSeq=dos=>{const nums=(dos||[]).flatMap(d=>(d.doNo||"").split(/[\/\-_]/).filter(p=>/^\d{2,}$/.test(p)).map(Number)).filter(n=>!isNaN(n));return nums.length?Math.max(...nums)+1:1;};
const getQtyDel=(itemId,dos)=>(dos||[]).reduce((s,d)=>s+((d.lines||[]).find(l=>l.itemId===itemId)?.qtyDelivered||0),0);
const getQtyRem=(item,dos)=>Math.max(0,(item.qty||0)-getQtyDel(item.id,dos));
const fmt=n=>n!=null&&!isNaN(n)?new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0}).format(Number(n)):"Rp –";
const fmtShort=n=>{if(n==null||isNaN(n))return"Rp –";const v=Number(n);if(Math.abs(v)>=1e12)return`Rp ${(v/1e12).toFixed(2)}T`;if(Math.abs(v)>=1e9)return`Rp ${(v/1e9).toFixed(2)}M`;if(Math.abs(v)>=1e6)return`Rp ${(v/1e6).toFixed(1)}Jt`;return fmt(v);};
const fmtDate=d=>{if(!d)return"–";try{return new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});}catch{return d;}};
const fmtPct=(v,t)=>t&&t!==0?`${((v/t)*100).toFixed(1)}%`:"–";
const itemNet=i=>Math.max(0,(Number(i.unitPrice)||0)*(Number(i.qty)||0)-(Number(i.discount)||0));
const itemBuy=i=>{const m=(i.supplierAssignments||[]).find(a=>a.role==="main");return m?(m.pricePerUnit||0)*(Number(i.qty)||0)+(m.shippingTotal||0):0;};
const itemMargin=i=>{const b=itemBuy(i);return b>0?itemNet(i)-b:null;};
const getPOZone=(poId,items)=>{const z=[...new Set(items.filter(i=>i.poId===poId&&i.zoneType).map(i=>i.zoneType))];return!z.length?"–":z.length===1?z[0]:"Mix";};
const calcPOTotals=(po,items)=>{if(po.totalLocked){const ex=Number(po.manualExPPN)||0,ppn=Number(po.manualPPN)||Math.round(ex*PPN_RATE);return{exPPN:ex,ppn,total:ex+ppn};}const ex=items.filter(i=>i.poId===po.id).reduce((s,i)=>s+itemNet(i),0);return{exPPN:ex,ppn:Math.round(ex*PPN_RATE),total:Math.round(ex*(1+PPN_RATE))};};
// FIX §2a — POProgress data extractor (poin 1)
const getPOProgress=(poId,items)=>{const p=items.filter(i=>i.poId===poId);const n=p.length;return{n,del:p.filter(i=>["delivered","invoiced","paid"].includes(i.status)).length,inv:p.filter(i=>["invoiced","paid"].includes(i.status)).length,paid:p.filter(i=>i.status==="paid").length};};
const agingColor=d=>d<0?"#64748b":d<30?C&&C.green||"#059669":d<60?C&&C.amber||"#d97706":"#dc2626";
const agingBg=d=>d<0?"#f1f5f9":d<30?"#f0fdf4":d<60?"#fffbeb":"#fef2f2";
const applyDateFilter=(val,f)=>{if(!f)return true;if(!val)return false;if(f.from&&val<f.from)return false;if(f.to&&val>f.to)return false;return true;};
const applyNumFilter=(val,f)=>{if(!f)return true;const n=Number(val)||0;if(f.empty)return!val||n===0;if(f.min!=null&&n<f.min)return false;if(f.max!=null&&n>f.max)return false;return true;};
const applyTextFilter=(val,f)=>{if(!f)return true;return String(val||"").toLowerCase().includes(f.toLowerCase());};
// §1b — HS Code database from KNOWLEDGE SECTION / CSV data
const INIT_HS_DB=[];//user manages HS codes in Settings
const _OLD_HS_PLACEHOLDER=[
  {code:"3403.11.90",desc:"OIL REFRIGERATION / Pelumas"},
  {code:"3403.99.90",desc:"GREASE / Gemuk industri"},
  {code:"3824.99.99",desc:"Kimia industri lainnya"},
  {code:"3901.10.99",desc:"Cable Ferrule / Aksesoris kabel plastik"},
  {code:"3901.90.90",desc:"COUPLING / Fitting HDPE plastik"},
  {code:"3917.23.00",desc:"HOSE / Selang plastik (gulungan)"},
  {code:"3917.29.11",desc:"SELANG PU / Polyurethane tubing"},
  {code:"3917.29.19",desc:"Tubing Polyurethane / PU tubing"},
  {code:"3917.32.00",desc:"Hydraulic Hose / Selang fleksibel"},
  {code:"3917.40.00",desc:"PUSH IN FITTING REDUCER / Fitting plastik"},
  {code:"3919.90.99",desc:"SEALING TAPE / Teflon tape"},
  {code:"3923.90.90",desc:"Plastik pembungkus / Drain hose AC"},
  {code:"3924.90.90",desc:"MEASURING JUG / Peralatan plastik dapur industri"},
  {code:"3926.90.49",desc:"Ear Muff / Alat keselamatan plastik"},
  {code:"4009.11.00",desc:"INSULFLEX / Selang karet insulasi"},
  {code:"4009.41.90",desc:"HOSE HYDROLIC / Selang hydraulic karet"},
  {code:"4009.42.90",desc:"SELANG HYDRAULIC / Hydraulic hose bertekanan"},
  {code:"4010.19.00",desc:"V-BELT / Sabuk karet industri"},
  {code:"4015.90.90",desc:"Nitrile Gloves / Sarung tangan karet"},
  {code:"4016.93.90",desc:"O-RING CORD VITON / Seal karet"},
  {code:"4016.99.99",desc:"OIL SEAL / Seal karet industri"},
  {code:"4802.56.29",desc:"Paper A4 / Kertas kantor"},
  {code:"5607.90.90",desc:"Rope / Tali industri"},
  {code:"5911.90.90",desc:"Consumables tekstil industri"},
  {code:"6201.40.10",desc:"Raincoat / Jas hujan"},
  {code:"6307.10.10",desc:"Kain Lap Microfiber / Lap industri"},
  {code:"6307.90.69",desc:"Full Body Harness / Sabuk pengaman"},
  {code:"6506.10.20",desc:"Safety Helmet with Face Shield"},
  {code:"6507.00.00",desc:"Chain Strap Safety Helmet"},
  {code:"6804.21.00",desc:"Mata Batu Gerinda / Cutting disc intan"},
  {code:"6804.22.00",desc:"BATU GERINDA POTONG / Abrasive cutting disc"},
  {code:"6804.23.00",desc:"BATU GERINDA / Abrasive grinding stone"},
  {code:"6804.30.00",desc:"BATU HIJAU / Sharpening stone"},
  {code:"6805.20.00",desc:"SAND PAPER / Amplas"},
  {code:"6805.30.00",desc:"SCOTCH-BRITE / Abrasive pad"},
  {code:"6809.19.90",desc:"Tepung Dempul Gypsum / Cornice"},
  {code:"6812.99.40",desc:"PRECUT GASKET / Gasket asbes/non-asbes"},
  {code:"6812.99.90",desc:"KLINGERIT GASKET / Lembaran gasket"},
  {code:"7017.20.00",desc:"BURETTE / Peralatan gelas lab"},
  {code:"7017.90.00",desc:"WASH BOTTLE / Botol laboratorium"},
  {code:"7208.25.00",desc:"CHEQUERED PLATE / Plat baja bergerigi"},
  {code:"7208.26.00",desc:"Plat baja MS / Carbon steel plate"},
  {code:"7216.31.90",desc:"UNP / CNP / Profil baja konstruksi"},
  {code:"7217.90.90",desc:"Wire / Kawat baja"},
  {code:"7222.40.90",desc:"Bar / Batang baja stainless"},
  {code:"7229.90.99",desc:"Wire rod / Kawat baja halus"},
  {code:"7304.19.00",desc:"PIPE / Pipa baja seamless"},
  {code:"7306.90.99",desc:"PIPE / Pipa baja welded"},
  {code:"7307.19.00",desc:"FITTING SS 304 / Fitting stainless"},
  {code:"7307.91.00",desc:"COUPLING FLANGE / Flange baja"},
  {code:"7307.99.90",desc:"HYDRAULIC FITTING / Fitting baja lainnya"},
  {code:"7308.90.99",desc:"Struktur baja / Steel structure"},
  {code:"7311.00.99",desc:"GAS CYLINDER / Tabung gas bertekanan"},
  {code:"7318.12.90",desc:"THREAD STUD / Baut stud"},
  {code:"7318.15.90",desc:"BOLT NUT / Baut mur"},
  {code:"7326.19.00",desc:"CHAIN / Rantai baja"},
  {code:"7326.20.90",desc:"WIRE ROPE / Tali kawat baja"},
  {code:"7326.90.99",desc:"BRACKET / Fabricated steel parts"},
  {code:"7411.29.00",desc:"COPPER TUBE / Pipa tembaga"},
  {code:"7412.20.20",desc:"PUSH IN FITTING / Fitting tembaga"},
  {code:"7413.00.91",desc:"Stranded copper wire"},
  {code:"8100.99.10",desc:"Tungsten carbide / Karbida tungsten"},
  {code:"8202.99.10",desc:"SAW BLADE / Mata gergaji"},
  {code:"8203.20.00",desc:"PLIERS / Tang"},
  {code:"8204.12.00",desc:"WRENCH / Kunci pas"},
  {code:"8205.59.00",desc:"HAND TOOLS / Perkakas tangan"},
  {code:"8205.90.00",desc:"TOOL SET / Set perkakas"},
  {code:"8207.19.00",desc:"DRILL BIT / Mata bor"},
  {code:"8207.40.00",desc:"THREADING TAP / Mata tap"},
  {code:"8207.90.00",desc:"CUTTING TOOLS / Alat potong"},
  {code:"8301.10.00",desc:"PADLOCK / Gembok"},
  {code:"8301.60.00",desc:"LOCK / Kunci industri"},
  {code:"8307.10.00",desc:"FLEXIBLE CONDUIT / Konduit fleksibel metal"},
  {code:"8310.00.00",desc:"SIGN BOARD / Papan tanda logam"},
  {code:"8311.90.00",desc:"ELECTRODE LAS / Kawat las"},
  {code:"8410.90.00",desc:"Pump Impeller / Komponen turbin"},
  {code:"8413.19.10",desc:"HAND PUMP / Pompa tangan"},
  {code:"8413.81.19",desc:"PUMP / Pompa industri lainnya"},
  {code:"8413.81.90",desc:"CHEMICAL DOSING PUMP / Pompa dosing"},
  {code:"8413.91.90",desc:"PUMP IMPELLER / Suku cadang pompa sentrifugal"},
  {code:"8413.91.40",desc:"PUMP PART / Spare part pompa"},
  {code:"8414.30.90",desc:"COMPRESSOR AC / Kompresor"},
  {code:"8414.90.22",desc:"FILTER / Elemen filter udara"},
  {code:"8421.23.91",desc:"OIL FILTER / Filter oli mesin"},
  {code:"8421.99.99",desc:"FILTER ELEMENT / Elemen filter lainnya"},
  {code:"8423.89.90",desc:"LOAD CELL / Timbangan industri"},
  {code:"8423.90.10",desc:"LOAD CELL PART / Suku cadang timbangan"},
  {code:"8425.42.90",desc:"CHAIN BLOCK / Katrol rantai"},
  {code:"8425.49.20",desc:"HOIST / Derek elektrik"},
  {code:"8448.59.00",desc:"Machine parts / Suku cadang mesin"},
  {code:"8471.60.90",desc:"I/O MODULE / Modul I/O PLC"},
  {code:"8481.10.19",desc:"PRESSURE REDUCING VALVE / PRV"},
  {code:"8481.20.19",desc:"VALVE CHECK / Check valve"},
  {code:"8481.20.00",desc:"CONTROL VALVE / Ball valve flanged"},
  {code:"8481.30.90",desc:"CHECK VALVE / Non-return valve"},
  {code:"8481.80.30",desc:"GATE VALVE / Valve pintu"},
  {code:"8481.80.97",desc:"SOLENOID VALVE / Valve solenoid"},
  {code:"8481.80.99",desc:"VALVE / Katup industri lainnya"},
  {code:"8481.90.90",desc:"VALVE PART / Suku cadang valve"},
  {code:"8484.10.00",desc:"GASKET SET / Gasket metal"},
  {code:"8484.90.00",desc:"SEAL / Mechanical seal"},
  {code:"8501.10.99",desc:"MOTOR ELECTRIC / Motor listrik kecil"},
  {code:"8504.40.40",desc:"UPS / Battery backup power"},
  {code:"8504.40.90",desc:"INVERTER / VFD / Inverter daya"},
  {code:"8506.60.90",desc:"BATTERY LITHIUM / Baterai lithium"},
  {code:"8507.30.90",desc:"BATTERY / Aki / Baterai industri"},
  {code:"8513.10.90",desc:"SENTER / Lampu portabel"},
  {code:"8515.90.90",desc:"WELDING PARTS / Aksesori las"},
  {code:"8517.14.00",desc:"WALKIE TALKIE / HT Radio"},
  {code:"8531.10.30",desc:"ALARM / Sirine alarm"},
  {code:"8531.10.90",desc:"BUZZER / Alarm industri"},
  {code:"8531.80.19",desc:"INDICATOR LAMP / Lampu panel"},
  {code:"8531.90.30",desc:"ALARM PART / Suku cadang alarm"},
  {code:"8532.29.00",desc:"CAPACITOR / Kapasitor"},
  {code:"8536.10.99",desc:"FUSE / Sekring"},
  {code:"8536.20.13",desc:"MCB / Circuit breaker"},
  {code:"8536.49.90",desc:"RELAY / Relay industri"},
  {code:"8536.50.59",desc:"PUSH BUTTON / Tombol kontrol"},
  {code:"8536.90.99",desc:"TERMINAL BLOCK / Aksesori panel listrik"},
  {code:"8537.10.99",desc:"PANEL LISTRIK / Control panel"},
  {code:"8538.10.19",desc:"BUSBAR / Busbar panel"},
  {code:"8538.10.29",desc:"PANEL PART / Suku cadang panel"},
  {code:"8544.19.00",desc:"CABLE / Kabel kontrol"},
  {code:"9017.30.00",desc:"MICROMETER / Alat ukur mekanis"},
  {code:"9023.00.00",desc:"TRAINING AID / Alat peraga"},
  {code:"9025.19.20",desc:"THERMOMETER / Termometer"},
  {code:"9025.80.00",desc:"HYGROMETER / Alat ukur kelembaban"},
  {code:"9026.10.90",desc:"FLOW METER / Meter aliran"},
  {code:"9026.20.90",desc:"PRESSURE GAUGE / Manometer"},
  {code:"9026.80.00",desc:"LEVEL INDICATOR / Indikator level"},
  {code:"9027.89.90",desc:"ANALYZER / Alat analisis industri"},
  {code:"9028.30.90",desc:"FLOW METER / Meteran aliran elektrik"},
  {code:"9030.90.90",desc:"MEASURING INSTRUMENT / Alat ukur listrik"},
  {code:"9031.49.90",desc:"TACHOMETER / RPM meter"},
  {code:"9031.90.90",desc:"INSTRUMENT PART / Suku cadang instrumen"},
  {code:"9032.81.00",desc:"CONTROLLER / Temperature controller"},
  {code:"9405.11.91",desc:"LED LAMP / Lampu LED industri"},
  {code:"9405.31.00",desc:"FLUORESCENT LAMP / Lampu TL"},
];//end _OLD_HS_PLACEHOLDER

const exportCSV=(headers,rows,fname)=>{const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");Object.assign(document.createElement("a"),{href:"data:text/csv;charset=utf-8,"+encodeURIComponent(csv),download:fname}).click();};
const copyTSV=(headers,rows,done)=>{const t=[headers,...rows].map(r=>r.map(v=>String(v??"")).join("\t")).join("\n");navigator.clipboard.writeText(t).then(done).catch(()=>alert("Copy gagal"));};
function usePersist(key,init){const[val,set]=useState(()=>{try{const s=localStorage.getItem(key);return s?JSON.parse(s):init;}catch{return init;}});useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(val));}catch{}},[key,val]);return[val,set];}
function useToast(){const[msg,setMsg]=useState(null);const show=useCallback(m=>{setMsg(m);setTimeout(()=>setMsg(null),2400);},[]);const Toast=()=>msg?<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:"#1e293b",color:"#fff",padding:"10px 22px",borderRadius:8,fontSize:12,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,.25)",whiteSpace:"nowrap"}}>{msg}</div>:null;return{show,Toast};}
// FIX §2b — Confirm modal hook (replaces window.confirm)
function useConfirm(){const[cfg,setCfg]=useState(null);const ask=useCallback((msg,onYes,opts={})=>setCfg({msg,onYes,...opts}),[]);const ConfirmModal=()=>cfg?<div style={{position:"fixed",inset:0,zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.45)"}} onClick={()=>setCfg(null)}>
  <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:10,padding:"24px 28px",maxWidth:380,width:"90%",boxShadow:"0 8px 32px rgba(0,0,0,.18)"}}>
    <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:8}}>{cfg.title||"Konfirmasi"}</div>
    <div style={{fontSize:13,color:"#475569",marginBottom:20,lineHeight:1.6}}>{cfg.msg}</div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <button onClick={()=>setCfg(null)} style={{padding:"7px 16px",borderRadius:6,border:"1px solid #cbd5e1",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#475569"}}>Batal</button>
      <button onClick={()=>{cfg.onYes();setCfg(null);}} style={{padding:"7px 16px",borderRadius:6,border:"none",background:cfg.danger?"#dc2626":"#2563eb",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>{cfg.confirmLabel||"Ya, Lanjutkan"}</button>
    </div>
  </div>
</div>:null;return{ask,ConfirmModal};}

/* ══ §3 DESIGN TOKENS ════════════════════════════════════════ */
const C={bg:"#f0f4f8",surface:"#fff",s2:"#f8fafc",border:"#e2e8f0",b2:"#cbd5e1",text:"#0f172a",t2:"#475569",t3:"#94a3b8",blue:"#2563eb",bSoft:"#eff6ff",bMid:"#dbeafe",amber:"#d97706",aSoft:"#fffbeb",green:"#059669",gSoft:"#f0fdf4",gMid:"#d1fae5",red:"#dc2626",rSoft:"#fef2f2",rMid:"#fecaca",orange:"#ea580c",purple:"#7c3aed",pSoft:"#f5f3ff"};
const TR={overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};
const SH={boxShadow:"0 1px 3px rgba(15,23,42,.08),0 1px 2px rgba(15,23,42,.04)"};
const GCSS=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;}
html,body,#root{height:100%;margin:0;}
body{background:#f0f4f8;font-family:'Inter',system-ui,sans-serif;color:#0f172a;font-size:13px;-webkit-font-smoothing:antialiased;}
input,select,textarea{color:#0f172a!important;font-family:'Inter',sans-serif;}
button{font-family:'Inter',sans-serif;}
input[type=checkbox]{accent-color:#2563eb;width:14px;height:14px;cursor:pointer;}
input[type=date]{color-scheme:light;}
::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:#f0f4f8;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px;}
@keyframes rowFlash{0%,100%{background:transparent}35%{background:#dbeafe}}.row-hl{animation:rowFlash 1.8s ease}
@media print{#sb,#tb,.np{display:none!important}#pa{display:block!important;position:fixed;inset:0;background:#fff;overflow:auto}@page{size:A4;margin:0}}
`;

/* ══ §4 ICONS ════════════════════════════════════════════════ */
const Ico=({d,size=16,color="currentColor",sw=1.75,style:sx})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...sx}}><path d={d}/></svg>;
const IC={
  dash:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  po:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  box:"M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  cog:"M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  plus:"M12 5v14M5 12h14",minus:"M5 12h14",close:"M18 6L6 18M6 6l12 12",
  search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:"M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  export:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  import:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  chevR:"M9 18l6-6-6-6",chevL:"M15 18l-6-6 6-6",chevD:"M6 9l6 6 6-6",
  warn:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4M12 17h.01",
  lock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4",
  unlock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 019.9-1",
  save:"M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8M7 3v5h8",
  check:"M20 6L9 17l-5-5",stats:"M18 20V10M12 20V4M6 20v-6",
  sortU:"M12 19V5M5 12l7-7 7 7",sortD:"M12 5v14M5 12l7 7 7-7",sortN:"M8 9l4-4 4 4M16 15l-4 4-4-4",
  print:"M6 9V2h12v7 M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2 M6 14h12v8H6z",
  copy:"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2 M16 14h2a2 2 0 002-2V8l-4-4h-6a2 2 0 00-2 2v2",
  truck:"M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  invoice:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  archive:"M21 8v13H3V8 M1 3h22v5H1z M10 12h4",
  restore:"M3 12a9 9 0 109 9 M3 3v6h6",
  tag:"M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  phone:"M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  pin:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 10a2 2 0 100-4 2 2 0 000 4z",
  percent:"M19 5L5 19 M6.5 5.5a1 1 0 100-2 1 1 0 000 2z M17.5 19.5a1 1 0 100-2 1 1 0 000 2z",
  filter:"M22 3H2l8 9.46V19l4 2V12.46L22 3z",
  link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75 M9 7a4 4 0 100 8 4 4 0 000-8z",
  trend:"M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
  fire:"M12 2c0 0-5 4-5 10a5 5 0 0010 0c0-6-5-10-5-10z",
  clock:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2",
  cal:"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
};

/* ══ §5 PRIMITIVES ═══════════════════════════════════════════ */
function Btn({onClick,children,variant="primary",size="md",disabled,title,style:sx,type="button",id}){
  const V={primary:{bg:C.blue,c:"#fff",b:`1px solid ${C.blue}`,h:"#1d4ed8"},secondary:{bg:"#fff",c:C.t2,b:`1px solid ${C.b2}`,h:C.s2},danger:{bg:C.rSoft,c:C.red,b:`1px solid ${C.rMid}`,h:"#fee2e2"},success:{bg:C.gSoft,c:C.green,b:"1px solid #a7f3d0",h:C.gMid},ghost:{bg:"transparent",c:C.t3,b:"1px solid transparent",h:C.bg},blue:{bg:C.bSoft,c:C.blue,b:`1px solid ${C.bMid}`,h:C.bMid},amber:{bg:C.aSoft,c:C.amber,b:"1px solid #fde68a",h:"#fef3c7"},purple:{bg:C.pSoft,c:C.purple,b:"1px solid #ddd6fe",h:"#ede9fe"}};
  const s=V[variant]||V.primary;
  const[hov,setHov]=useState(false);
  const p=size==="sm"?"4px 10px":size==="lg"?"9px 18px":"6px 13px";
  const fs=size==="sm"?11:size==="lg"?13:12;
  return<button id={id} type={type} onClick={onClick} disabled={disabled} title={title} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{display:"inline-flex",alignItems:"center",gap:5,borderRadius:6,fontWeight:600,fontSize:fs,padding:p,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,background:hov&&!disabled?s.h:s.bg,color:s.c,border:s.b,transition:"background .12s",whiteSpace:"nowrap",...sx}}>{children}</button>;
}
const SBadge=({status,cfg})=>{const c=cfg[status]||{label:status||"–",color:C.t2,bg:C.bg,ring:C.border};return<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:600,letterSpacing:".02em",textTransform:"uppercase",color:c.color,background:c.bg,border:`1px solid ${c.ring}`,whiteSpace:"nowrap"}}><span style={{width:5,height:5,borderRadius:"50%",background:c.color,flexShrink:0}}/>{c.label}</span>;};
const SPill=({value,onChange,cfg,mini})=>{const c=cfg[value]||{color:C.t2,bg:C.bg,ring:C.border};return<select value={value} onChange={e=>onChange(e.target.value)} style={{background:c.bg,color:c.color,border:`1px solid ${c.ring}`,borderRadius:5,padding:mini?"2px 4px":"3px 6px",fontSize:mini?9:10,fontWeight:600,cursor:"pointer",outline:"none",textTransform:"uppercase",letterSpacing:".02em",maxWidth:mini?90:130}}>{Object.entries(cfg).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>;};
const TagChip=({label,onRemove})=><span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",borderRadius:20,background:C.bSoft,border:`1px solid ${C.bMid}`,color:C.blue,fontSize:10,fontWeight:600}}><Ico d={IC.tag} size={9} color={C.blue}/>{label}{onRemove&&<button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,display:"flex",padding:0,marginLeft:1}}><Ico d={IC.close} size={8}/></button>}</span>;
function Modal({open,onClose,title,children,wide,xwide,noPad}){
  if(!open)return null;
  const w=xwide?Math.min(1160,window.innerWidth*.97):wide?Math.min(900,window.innerWidth*.96):580;
  return<div className="np" style={{position:"fixed",inset:0,zIndex:4000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.5)",backdropFilter:"blur(3px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,width:w,maxWidth:"98vw",maxHeight:"95vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(15,23,42,.18)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.s2}}>
        <h2 style={{margin:0,fontSize:14,fontWeight:700,color:C.text}}>{title}</h2>
        <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.t3}}><Ico d={IC.close} size={12}/></button>
      </div>
      <div style={{padding:noPad?0:20,overflowY:"auto",flex:1}}>{children}</div>
    </div>
  </div>;
}
const iB={background:C.surface,border:`1px solid ${C.b2}`,borderRadius:7,padding:"7px 10px",fontSize:12,color:C.text,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"'Inter',sans-serif",transition:"border-color .15s"};
const FGrid=({children,cols=2,gap=12})=><div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap}}>{children}</div>;
const FF=({label,span=1,children,hint,required})=><div style={{gridColumn:`span ${span}`,display:"flex",flexDirection:"column",gap:4}}><label style={{fontSize:11,fontWeight:600,color:C.t2,display:"flex",alignItems:"center",gap:4}}>{label}{required&&<span style={{color:C.red,fontSize:10}}>*</span>}{hint&&<span style={{fontWeight:400,color:C.t3,fontSize:10}}>{hint}</span>}</label>{children}</div>;

// FIX §5a — NumInput: no leading zero, select-on-focus (poin 3)
function NumInput({value,onChange,min,max,readOnly,style:sx,placeholder}){
  const[raw,setRaw]=useState("");const[focused,setFocused]=useState(false);
  const display=focused?raw:(value===0||value===""||value==null?"":String(value));
  return<input
    inputMode="numeric"
    value={display}
    placeholder={focused?"":(placeholder||"0")}
    readOnly={readOnly}
    onFocus={e=>{setFocused(true);setRaw(value===0?"":String(value||""));setTimeout(()=>e.target.select(),0);if(!readOnly)e.target.style.borderColor=C.blue;}}
    onBlur={e=>{setFocused(false);e.target.style.borderColor=C.b2;const n=parseFloat(raw.replace(/,/g,""));if(!isNaN(n)){const clamped=min!=null?Math.max(min,max!=null?Math.min(max,n):n):n;onChange(clamped);}else onChange(0);setRaw("");}}
    onChange={e=>{const v=e.target.value;if(/^-?\d*\.?\d*$/.test(v)||v==="")setRaw(v);}}
    style={{...iB,background:readOnly?C.s2:C.surface,...sx}}
  />;
}

const FIn=({value,onChange,type="text",placeholder,readOnly,min,max,style:sx,onKeyDown})=><input type={type} value={value??""} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder} readOnly={readOnly} min={min} max={max} onKeyDown={onKeyDown} onFocus={e=>{if(!readOnly)e.target.style.borderColor=C.blue;}} onBlur={e=>e.target.style.borderColor=C.b2} style={{...iB,background:readOnly?C.s2:C.surface,...sx}}/>;
const FSel=({value,onChange,options,placeholder})=><select value={value??""} onChange={e=>onChange?.(e.target.value)} style={{...iB,cursor:"pointer"}}><option value="">{placeholder||"— Pilih —"}</option>{options.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}</select>;
const FTa=({value,onChange,rows=2,placeholder})=><textarea value={value??""} onChange={e=>onChange?.(e.target.value)} rows={rows} placeholder={placeholder} style={{...iB,resize:"vertical"}}/>;

/* HSCodeInput — autocomplete dari hsDB prop (user-managed via Settings) */
function HSCodeInput({value,onChange,placeholder,style:sx,hsDB=[]}){
  const[q,setQ]=useState("");const[open,setOpen]=useState(false);const[focused,setFocused]=useState(false);
  const wrapRef=useRef();const inputRef=useRef();
  const filtered=useMemo(()=>{const s=(q||value||"").toLowerCase().trim();if(!s)return hsDB.slice(0,12);return hsDB.filter(h=>h.code.includes(s)||h.desc.toLowerCase().includes(s)).slice(0,15);},[q,value,hsDB]);
  useEffect(()=>{if(!open)return;const h=e=>{if(!wrapRef.current?.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[open]);
  return<div ref={wrapRef} style={{position:"relative"}}>
    <div style={{display:"flex",alignItems:"center",gap:0}}>
      <input ref={inputRef} value={focused?q:(value||"")} onChange={e=>{setQ(e.target.value);onChange(e.target.value);setOpen(true);}}
        onFocus={()=>{setFocused(true);setQ(value||"");setOpen(true);inputRef.current?.style&&(inputRef.current.style.borderColor=C.blue);}}
        onBlur={()=>{setTimeout(()=>{setFocused(false);setOpen(false);inputRef.current?.style&&(inputRef.current.style.borderColor=C.b2);},150);}}
        placeholder={placeholder||"8481.20.00 – ketik untuk cari"}
        style={{...iB,fontFamily:"'JetBrains Mono',monospace",fontSize:11,paddingRight:28,...sx}}
      />
      <button type="button" onMouseDown={e=>{e.preventDefault();setOpen(v=>!v);}} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.t3,display:"flex",padding:2}}><Ico d={IC.chevD} size={12} color={open?C.blue:C.t3}/></button>
    </div>
    {open&&filtered.length>0&&<div style={{position:"absolute",left:0,top:"calc(100% + 3px)",zIndex:9999,background:C.surface,border:`1px solid ${C.b2}`,borderRadius:7,boxShadow:"0 6px 20px rgba(15,23,42,.15)",width:"max-content",minWidth:"100%",maxWidth:480,maxHeight:260,overflowY:"auto"}}>
      {filtered.map(h=><div key={h.code} onMouseDown={e=>{e.preventDefault();onChange(h.code);setQ(h.code);setOpen(false);}} style={{display:"flex",gap:10,padding:"7px 12px",cursor:"pointer",alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.background=C.bSoft} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:C.blue,whiteSpace:"nowrap"}}>{h.code}</span>
        <span style={{fontSize:11,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.desc}</span>
      </div>)}
    </div>}
  </div>;
}({label})=><div style={{gridColumn:"span 2",display:"flex",alignItems:"center",gap:10,margin:"4px 0"}}><span style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:".08em",whiteSpace:"nowrap"}}>{label}</span><div style={{flex:1,height:1,background:C.border}}/></div>;
function Accordion({title,icon,defaultOpen=false,children,badge,warning,extra}){
  const[open,setOpen]=useState(defaultOpen);
  return<div style={{border:`1px solid ${open?C.blue:C.border}`,borderRadius:8,marginBottom:8,overflow:"hidden"}}>
    <button type="button" onClick={()=>setOpen(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"10px 14px",background:open?C.bSoft:C.s2,border:"none",cursor:"pointer"}}>
      {icon&&<Ico d={icon} size={14} color={open?C.blue:C.t3}/>}
      <span style={{flex:1,textAlign:"left",fontSize:12,fontWeight:700,color:open?C.blue:C.t2}}>{title}</span>
      {badge!=null&&<span style={{fontSize:10,background:C.bSoft,color:C.blue,border:`1px solid ${C.bMid}`,borderRadius:20,padding:"0 7px",fontWeight:700}}>{badge}</span>}
      {warning&&<Ico d={IC.warn} size={12} color={C.red}/>}
      {extra}
      <Ico d={open?IC.chevD:IC.chevR} size={12} color={open?C.blue:C.t3}/>
    </button>
    {open&&<div style={{padding:"14px 16px",borderTop:`1px solid ${C.border}`}}>{children}</div>}
  </div>;
}
/* SearchSelect — searchable dropdown with position:fixed, replaces FSel for key fields */
function SearchSelect({value,onChange,options,placeholder,style:sx}){
  const[open,setOpen]=useState(false);const[q,setQ]=useState("");
  const btnRef=useRef();const dropRef=useRef();const[pos,setPos]=useState({top:0,left:0,width:220});
  const sel=options.find(o=>(o.v??o)===value);
  const filtered=q?options.filter(o=>(o.l??o).toLowerCase().includes(q.toLowerCase())):options;
  useEffect(()=>{if(!open)return;const h=e=>{if(!dropRef.current?.contains(e.target)&&!btnRef.current?.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[open]);
  const doOpen=()=>{const r=btnRef.current?.getBoundingClientRect();if(r)setPos({top:r.bottom+2,left:Math.min(r.left,window.innerWidth-Math.max(r.width,220)),width:Math.max(r.width,220)});setOpen(v=>!v);setQ("");};
  return<div style={{position:"relative",...sx}}>
    <div ref={btnRef} onClick={doOpen} style={{...iB,cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"7px 10px"}}>
      <span style={{flex:1,fontSize:12,color:sel?C.text:C.t3,...TR}}>{sel?(sel.l??sel):(placeholder||"— Pilih —")}</span>
      <Ico d={IC.chevD} size={11} color={C.t3}/>
    </div>
    {open&&<div ref={dropRef} style={{position:"fixed",top:pos.top,left:pos.left,width:pos.width,zIndex:9999,background:C.surface,border:`1px solid ${C.b2}`,borderRadius:8,boxShadow:"0 8px 24px rgba(15,23,42,.15)",maxHeight:260,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"6px 8px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari..." style={{...iB,fontSize:11,padding:"4px 8px"}}/></div>
      <div style={{overflowY:"auto",flex:1}}>
        <div onClick={()=>{onChange("");setOpen(false);}} style={{padding:"7px 12px",cursor:"pointer",fontSize:12,color:C.t3,fontStyle:"italic",borderBottom:`1px solid ${C.border}`}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{placeholder||"— Pilih —"}</div>
        {filtered.map(o=>{const v=o.v??o;const l=o.l??o;return<div key={v} onClick={()=>{onChange(v);setOpen(false);}} style={{padding:"7px 12px",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:8,background:v===value?C.bSoft:"transparent"}} onMouseEnter={e=>e.currentTarget.style.background=C.bSoft} onMouseLeave={e=>e.currentTarget.style.background=v===value?C.bSoft:"transparent"}><span style={{flex:1}}>{l}</span>{v===value&&<Ico d={IC.check} size={11} color={C.blue}/>}</div>;})}
        {!filtered.length&&<div style={{padding:12,fontSize:11,color:C.t3,textAlign:"center"}}>Tidak ada</div>}
      </div>
    </div>}
  </div>;
}

/* DateRangeFilter — for Tgl Order, Tgl Delivery */
function DateRangeFilter({active,onApply,label}){
  const[open,setOpen]=useState(false);const[from,setFrom]=useState("");const[to,setTo]=useState("");
  const btnRef=useRef();const dropRef=useRef();const[pos,setPos]=useState({top:0,left:0});
  const now=new Date();
  const applyQuick=k=>{let f="",t=today();
    if(k==="bulan_ini"){f=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;}
    else if(k==="bulan_lalu"){const d=new Date(now.getFullYear(),now.getMonth()-1,1);f=d.toISOString().slice(0,10);t=new Date(now.getFullYear(),now.getMonth(),0).toISOString().slice(0,10);}
    else if(k==="3_bulan"){const d=new Date();d.setMonth(d.getMonth()-3);f=d.toISOString().slice(0,10);}
    else if(k==="tahun_ini"){f=`${now.getFullYear()}-01-01`;}
    onApply({from:f,to:t});setOpen(false);};
  useEffect(()=>{if(!open)return;const h=e=>{if(!dropRef.current?.contains(e.target)&&!btnRef.current?.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[open]);
  return<>
    <button ref={btnRef} onClick={e=>{e.stopPropagation();const r=btnRef.current?.getBoundingClientRect();if(r)setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-280)});setFrom(active?.from||"");setTo(active?.to||"");setOpen(v=>!v);}} title={`Filter tanggal ${label||""}`} style={{background:"none",border:"none",cursor:"pointer",padding:"1px 3px",color:active?C.blue:C.b2,display:"inline-flex",verticalAlign:"middle"}}><Ico d={IC.cal} size={10} color={active?C.blue:C.b2}/></button>
    {open&&<div ref={dropRef} style={{position:"fixed",top:pos.top,left:pos.left,zIndex:9999,background:C.surface,border:`1px solid ${C.b2}`,borderRadius:8,boxShadow:"0 8px 28px rgba(15,23,42,.18)",width:270,padding:12}}>
      <div style={{fontSize:10,fontWeight:700,color:C.t2,marginBottom:8,textTransform:"uppercase",letterSpacing:".05em"}}>Filter Tanggal{label?" · "+label:""}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{[["bulan_ini","Bulan Ini"],["bulan_lalu","Bulan Lalu"],["3_bulan","3 Bulan"],["tahun_ini","Tahun Ini"]].map(([k,l])=><button key={k} onClick={()=>applyQuick(k)} style={{fontSize:10,padding:"3px 8px",borderRadius:4,border:`1px solid ${C.b2}`,background:C.bg,cursor:"pointer",color:C.t2,fontFamily:"'Inter',sans-serif"}}>{l}</button>)}</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <div><div style={{fontSize:10,color:C.t2,marginBottom:3}}>Dari</div><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{...iB,fontSize:11}}/></div>
        <div><div style={{fontSize:10,color:C.t2,marginBottom:3}}>Sampai</div><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{...iB,fontSize:11}}/></div>
      </div>
      <div style={{display:"flex",gap:6,marginTop:10}}>
        <Btn size="sm" variant="ghost" onClick={()=>{onApply(null);setOpen(false);}} style={{flex:1}}>Clear</Btn>
        <Btn size="sm" onClick={()=>{if(from||to)onApply({from,to});setOpen(false);}} style={{flex:1}}>OK</Btn>
      </div>
    </div>}
  </>;
}

/* NumberRangeFilter — for Total, Net, Margin, Qty */
function NumberRangeFilter({active,onApply,label}){
  const[open,setOpen]=useState(false);const[mn,setMn]=useState("");const[mx,setMx]=useState("");
  const btnRef=useRef();const dropRef=useRef();const[pos,setPos]=useState({top:0,left:0});
  useEffect(()=>{if(!open)return;const h=e=>{if(!dropRef.current?.contains(e.target)&&!btnRef.current?.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[open]);
  return<>
    <button ref={btnRef} onClick={e=>{e.stopPropagation();const r=btnRef.current?.getBoundingClientRect();if(r)setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-240)});setMn(active?.min!=null?String(active.min):"");setMx(active?.max!=null?String(active.max):"");setOpen(v=>!v);}} title={`Filter angka ${label||""}`} style={{background:"none",border:"none",cursor:"pointer",padding:"1px 3px",color:active?C.blue:C.b2,display:"inline-flex",verticalAlign:"middle"}}><Ico d={IC.percent} size={10} color={active?C.blue:C.b2}/></button>
    {open&&<div ref={dropRef} style={{position:"fixed",top:pos.top,left:pos.left,zIndex:9999,background:C.surface,border:`1px solid ${C.b2}`,borderRadius:8,boxShadow:"0 8px 28px rgba(15,23,42,.18)",width:230,padding:12}}>
      <div style={{fontSize:10,fontWeight:700,color:C.t2,marginBottom:8,textTransform:"uppercase",letterSpacing:".05em"}}>Filter Angka{label?" · "+label:""}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{[[">0",{min:1,max:null}],["Ada Nilai",{min:0.01,max:null}],["Kosong",{empty:true}]].map(([l,v])=><button key={l} onClick={()=>{onApply(v);setOpen(false);}} style={{fontSize:10,padding:"3px 8px",borderRadius:4,border:`1px solid ${C.b2}`,background:C.bg,cursor:"pointer",color:C.t2,fontFamily:"'Inter',sans-serif"}}>{l}</button>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><div style={{fontSize:10,color:C.t2,marginBottom:3}}>Min</div><input type="number" value={mn} onChange={e=>setMn(e.target.value)} placeholder="0" style={{...iB,fontSize:11}}/></div>
        <div><div style={{fontSize:10,color:C.t2,marginBottom:3}}>Max</div><input type="number" value={mx} onChange={e=>setMx(e.target.value)} placeholder="∞" style={{...iB,fontSize:11}}/></div>
      </div>
      <div style={{display:"flex",gap:6,marginTop:10}}>
        <Btn size="sm" variant="ghost" onClick={()=>{onApply(null);setOpen(false);}} style={{flex:1}}>Clear</Btn>
        <Btn size="sm" onClick={()=>{const a=mn!==""?Number(mn):null;const b=mx!==""?Number(mx):null;if(a!==null||b!==null)onApply({min:a,max:b});setOpen(false);}} style={{flex:1}}>OK</Btn>
      </div>
    </div>}
  </>;
}

/* TextFilter — per column text filter */
function TextFilter({active,onApply,label}){
  const[open,setOpen]=useState(false);const[val,setVal]=useState(active||"");
  const btnRef=useRef();const dropRef=useRef();const[pos,setPos]=useState({top:0,left:0});
  useEffect(()=>{if(!open)return;const h=e=>{if(!dropRef.current?.contains(e.target)&&!btnRef.current?.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[open]);
  return<>
    <button ref={btnRef} onClick={e=>{e.stopPropagation();const r=btnRef.current?.getBoundingClientRect();if(r)setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-220)});setVal(active||"");setOpen(v=>!v);}} title={`Filter teks ${label||""}`} style={{background:"none",border:"none",cursor:"pointer",padding:"1px 3px",color:active?C.blue:C.b2,display:"inline-flex",verticalAlign:"middle"}}><Ico d={IC.search} size={10} color={active?C.blue:C.b2}/></button>
    {open&&<div ref={dropRef} style={{position:"fixed",top:pos.top,left:pos.left,zIndex:9999,background:C.surface,border:`1px solid ${C.b2}`,borderRadius:8,boxShadow:"0 8px 28px rgba(15,23,42,.18)",width:220,padding:12}}>
      <div style={{fontSize:10,fontWeight:700,color:C.t2,marginBottom:8}}>Filter Teks{label?" · "+label:""}</div>
      <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onApply(val||null);setOpen(false);}}} placeholder="Ketik untuk filter..." style={{...iB,fontSize:11}}/>
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <Btn size="sm" variant="ghost" onClick={()=>{setVal("");onApply(null);setOpen(false);}} style={{flex:1}}>Clear</Btn>
        <Btn size="sm" onClick={()=>{onApply(val||null);setOpen(false);}} style={{flex:1}}>OK</Btn>
      </div>
    </div>}
  </>;
}

function ColFilter({col,rows,keyFn,labelFn,active,onApply}){
  const[open,setOpen]=useState(false);const[q,setQ]=useState("");const[sel,setSel]=useState(null);
  const btnRef=useRef();const dropRef=useRef();const[pos,setPos]=useState({top:0,left:0});
  const vals=useMemo(()=>{const m=new Map();(rows||[]).forEach(r=>{const k=String(keyFn?keyFn(r):(r[col]??"")),l=labelFn?labelFn(r):k;if(!m.has(k))m.set(k,l);});return[...m.entries()].sort((a,b)=>a[1].localeCompare(b[1]));},[rows,col,keyFn,labelFn]);
  useEffect(()=>{if(!open)return;const h=e=>{if(!dropRef.current?.contains(e.target)&&!btnRef.current?.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[open]);
  const doOpen=()=>{const r=btnRef.current?.getBoundingClientRect();if(!r)return;setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-230)});setSel(active?new Set(active):null);setOpen(true);};
  const filtered=vals.filter(([,l])=>!q||l.toLowerCase().includes(q.toLowerCase()));
  const allSel=!sel||sel.size===0;
  const isChk=k=>allSel||sel.has(k);
  const toggle=k=>{const base=allSel?new Set(vals.map(([k2])=>k2)):new Set(sel);base.has(k)?base.delete(k):base.add(k);setSel(base.size===vals.length?null:base);};
  return<>
    <button ref={btnRef} onClick={e=>{e.stopPropagation();doOpen();}} title="Filter kolom" style={{background:"none",border:"none",cursor:"pointer",padding:"1px 3px",color:active&&active.size>0?C.blue:C.b2,display:"inline-flex",verticalAlign:"middle"}}>
      <Ico d={IC.filter} size={10} color={active&&active.size>0?C.blue:C.b2}/>
    </button>
    {open&&<div ref={dropRef} style={{position:"fixed",top:pos.top,left:pos.left,zIndex:9999,background:C.surface,border:`1px solid ${C.b2}`,borderRadius:8,boxShadow:"0 8px 28px rgba(15,23,42,.18)",width:220,maxHeight:300,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"7px 9px",borderBottom:`1px solid ${C.border}`}}><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari..." style={{...iB,fontSize:11,padding:"5px 8px"}}/></div>
      <div style={{overflowY:"auto",flex:1}}>
        <label style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,fontSize:11,fontWeight:600}}><input type="checkbox" checked={allSel} onChange={()=>setSel(allSel?new Set(vals.map(([k])=>k)):null)}/>(Semua)</label>
        {filtered.map(([k,l])=><label key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",cursor:"pointer",fontSize:11}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><input type="checkbox" checked={isChk(k)} onChange={()=>toggle(k)}/><span style={{...TR,flex:1}} title={l}>{l||"(Kosong)"}</span></label>)}
        {!filtered.length&&<div style={{padding:12,fontSize:11,color:C.t3,textAlign:"center"}}>Tidak ada</div>}
      </div>
      <div style={{display:"flex",gap:6,padding:"8px 9px",borderTop:`1px solid ${C.border}`}}>
        <Btn size="sm" variant="ghost" onClick={()=>{onApply(null);setOpen(false);}} style={{flex:1}}>Clear</Btn>
        <Btn size="sm" onClick={()=>{onApply(sel&&sel.size<vals.length?sel:null);setOpen(false);}} style={{flex:1}}>OK</Btn>
      </div>
    </div>}
  </>;
}
function Pagination({total,page,perPage,onChange}){
  const pages=Math.ceil(total/perPage);if(pages<=1)return null;
  const btns=[];
  if(pages<=7)for(let i=1;i<=pages;i++)btns.push(i);
  else if(page<=4)[1,2,3,4,5,"…",pages].forEach(b=>btns.push(b));
  else if(page>=pages-3)[1,"…",pages-4,pages-3,pages-2,pages-1,pages].forEach(b=>btns.push(b));
  else[1,"…",page-1,page,page+1,"…",pages].forEach(b=>btns.push(b));
  const bs=a=>({padding:"4px 10px",borderRadius:5,border:`1px solid ${a?C.blue:C.b2}`,background:a?C.blue:"#fff",color:a?"#fff":C.t2,fontSize:11,fontWeight:600,cursor:"pointer",minWidth:32});
  return<div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"center",padding:"12px 0",flexWrap:"wrap",borderTop:`1px solid ${C.border}`}}>
    <button style={bs(false)} onClick={()=>onChange(Math.max(1,page-1))} disabled={page===1}>‹</button>
    {btns.map((b,i)=>b==="…"?<span key={"e"+i} style={{padding:"4px 6px",color:C.t3,fontSize:11}}>…</span>:<button key={b} style={bs(page===b)} onClick={()=>onChange(b)}>{b}</button>)}
    <button style={bs(false)} onClick={()=>onChange(Math.min(pages,page+1))} disabled={page===pages}>›</button>
    <span style={{fontSize:10,color:C.t3,marginLeft:8}}>{total} total · hal {page}/{pages}</span>
  </div>;
}

/* ══ §6 SMART DATE — FIX poin 4: hybrid text+picker ══════════ */
function SmartDate({value,onChange,placeholder,style:sx}){
  const[raw,setRaw]=useState("");const[focused,setFocused]=useState(false);
  const pickerRef=useRef();
  const display=focused?raw:(value?fmtDate(value):"");
  return<div style={{position:"relative",display:"flex",alignItems:"center",gap:0}}>
    <input
      value={display}
      onChange={e=>setRaw(e.target.value)}
      onFocus={()=>{setFocused(true);setRaw(value||"");setTimeout(e=>e&&e.select(),0);}}
      onBlur={()=>{setFocused(false);const p=parseSmartDate(raw);if(p)onChange(p);else if(!raw.trim())onChange("");setRaw("");}}
      placeholder={focused?"DD/MM/YY atau YYYY-MM-DD":placeholder||"Pilih tanggal..."}
      style={{...iB,paddingRight:30,fontFamily:"'JetBrains Mono',monospace",fontSize:11,...sx}}
    />
    <button type="button" onClick={()=>pickerRef.current?.showPicker?.()||pickerRef.current?.click()} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.t3,display:"flex",padding:2}} title="Buka kalender">
      <Ico d={IC.cal} size={14} color={focused?C.blue:C.t3}/>
    </button>
    <input ref={pickerRef} type="date" value={value||""} onChange={e=>{onChange(e.target.value);}} style={{position:"absolute",right:0,top:0,opacity:0,width:"30px",height:"100%",border:"none",cursor:"pointer",zIndex:-1}}/>
  </div>;
}

/* ══ §6b INLINE CELL ═════════════════════════════════════════ */
function InlineCell({value,onSave,type="text",mono,width,placeholder,readOnly,isDate,select,opts}){
  const[editing,setEditing]=useState(false);const[v,setV]=useState(value??"");
  useEffect(()=>{if(!editing)setV(value??"");},[value,editing]);
  const disp=isDate?fmtDate(value):(value||"");
  if(readOnly)return<span style={{fontSize:12,color:C.t3,...TR}}>{disp||"–"}</span>;
  if(!editing)return<span onClick={()=>setEditing(true)} title={String(value||placeholder||"")} style={{cursor:"text",display:"inline-block",minWidth:width||36,fontSize:12,color:value?C.text:C.t3,fontFamily:mono?"'JetBrains Mono',monospace":"inherit",borderBottom:`1px dashed ${C.b2}`,paddingBottom:1,maxWidth:"100%",...TR}} onMouseEnter={e=>e.currentTarget.style.borderBottomColor=C.blue} onMouseLeave={e=>e.currentTarget.style.borderBottomColor=C.b2}>{disp||<span style={{fontStyle:"italic"}}>{placeholder||"–"}</span>}</span>;
  if(isDate)return<SmartDate value={value||""} onChange={v=>{onSave(v);setEditing(false);}} style={{width:width||120}}/>;
  if(select)return<select autoFocus value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{onSave(v);setEditing(false);}} style={{fontSize:11,border:`1px solid ${C.b2}`,borderRadius:4,background:C.surface,color:C.text,outline:"none",padding:"1px 4px"}}>{opts?.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}</select>;
  return<input autoFocus type={type} value={v} onChange={e=>setV(e.target.value)} onFocus={e=>setTimeout(()=>e.target.select(),0)} onBlur={()=>{onSave(v);setEditing(false);}} onKeyDown={e=>{if(e.key==="Enter"){onSave(v);setEditing(false);}if(e.key==="Escape"){setV(value??"");setEditing(false);}}} style={{fontSize:12,fontFamily:mono?"monospace":"inherit",border:"none",borderBottom:`2px solid ${C.blue}`,background:"transparent",outline:"none",width:width||"100%",color:C.text}}/>;
}

/* ══ §7 DO DETAIL PANEL ══════════════════════════════════════ */
// FIX poin 8 — rich DO display + delete + print
function DODetailPanel({dos,poId,items,onDeleteDO}){
  const poDos=(dos||[]).filter(d=>d.poId===poId);
  if(!poDos.length)return<span style={{fontSize:11,color:C.t3}}>Belum ada DO</span>;
  const handlePrintDO=d=>{
    const win=window.open("","_blank","width=800,height=600");if(!win)return;
    const rows=(d.lines||[]).map(line=>{const item=items.find(i=>i.id===line.itemId);return`<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-weight:600">${item?.itemName||line.itemId}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700">${line.qtyDelivered} ${item?.unit||""}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-family:monospace">${line.hsCode||"–"}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${line.notes||"–"}</td></tr>`;}).join("");
    const drv=d.fieldValues?.driverName||"";const plt=d.fieldValues?.vehiclePlate||"";
    win.document.write(`<!DOCTYPE html><html><head><title>${d.doNo}</title><style>body{font-family:Arial,sans-serif;padding:20mm 16mm}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;padding:7px 8px;font-size:11px;text-align:left;border-bottom:2px solid #d1d5db;text-transform:uppercase}@page{size:A4;margin:0}</style></head><body><div style="display:flex;justify-content:space-between;border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px"><div><div style="font-size:20px;font-weight:900;color:#1e3a5f">${VENDOR_NAME}</div><div style="font-size:10px;color:#6b7280">${VENDOR_ADDR}</div></div><div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#1e3a5f">SURAT JALAN</div><div style="font-size:15px;font-weight:700;font-family:monospace">${d.doNo}</div><div style="font-size:10px;color:#6b7280">Tgl: ${fmtDate(d.deliveryDate)}</div></div></div>${drv?`<p style="font-size:11px;color:#6b7280">Supir: <b>${drv}</b>${plt?" · Plat: <b>"+plt+"</b>":""}</p>`:""}<table><thead><tr><th>Item</th><th>Qty</th><th>HS Code</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table><div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-top:40px">${["Pengirim","Pengemudi","Penerima","Mengetahui"].map(l=>`<div style="text-align:center"><div style="border-bottom:1px solid #9ca3af;height:44px;margin-bottom:6px"></div><div style="font-size:9px;color:#6b7280;font-weight:700">${l}</div></div>`).join("")}</div><script>window.print();window.close();<\/script></body></html>`);
    win.document.close();
  };
  return<div style={{display:"flex",flexDirection:"column",gap:6}}>
    {poDos.map(d=>{
      const driver=d.fieldValues?.driverName;const plate=d.fieldValues?.vehiclePlate;
      return<div key={d.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bSoft,borderBottom:`1px solid ${C.bMid}`}}>
          <Ico d={IC.truck} size={13} color={C.blue}/>
          <span style={{fontFamily:"monospace",fontWeight:700,fontSize:12,color:C.blue}}>{d.doNo}</span>
          <span style={{fontSize:10,color:C.t2}}>Dibuat: {fmtDate(d.createdAt)}</span>
          {d.deliveryDate&&d.deliveryDate!==d.createdAt&&<span style={{fontSize:10,color:C.t2}}>· Kirim: {fmtDate(d.deliveryDate)}</span>}
          {driver&&<span style={{fontSize:10,color:C.t3}}>🚗 {driver}{plate?` · ${plate}`:""}</span>}
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <Btn size="sm" variant="blue" onClick={()=>handlePrintDO(d)}><Ico d={IC.print} size={10}/> Cetak</Btn>
            {onDeleteDO&&<Btn size="sm" variant="danger" onClick={()=>onDeleteDO(d.id)}><Ico d={IC.trash} size={10}/> Hapus</Btn>}
          </div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f8fafc"}}>
            {["Item","Qty Kirim","HS Code","Catatan"].map(h=><th key={h} style={{padding:"5px 10px",fontSize:9,fontWeight:700,color:C.t2,textAlign:"left",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase"}}>{h}</th>)}
          </tr></thead>
          <tbody>{(d.lines||[]).map(line=>{
            const item=items.find(i=>i.id===line.itemId);
            return<tr key={line.itemId} style={{borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"6px 10px",fontSize:11,fontWeight:600,...TR,maxWidth:180}}>{item?.itemName||line.itemId}</td>
              <td style={{padding:"6px 10px",fontSize:11,fontFamily:"monospace",fontWeight:700,color:C.blue}}>{line.qtyDelivered} {item?.unit||""}</td>
              <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:C.t2}}>{line.hsCode||"–"}</td>
              <td style={{padding:"6px 10px",fontSize:10,color:C.t3,...TR,maxWidth:120}}>{line.notes||"–"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>;
    })}
  </div>;
}
  const poDos=(dos||[]).filter(d=>d.poId===poId);
  if(!poDos.length)return<span style={{fontSize:11,color:C.t3}}>Belum ada DO</span>;
  return<div style={{display:"flex",flexDirection:"column",gap:6}}>
    {poDos.map(d=>{
      const driver=d.fieldValues?.driverName;const plate=d.fieldValues?.vehiclePlate;
      return<div key={d.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bSoft,borderBottom:`1px solid ${C.bMid}`}}>
          <Ico d={IC.truck} size={13} color={C.blue}/>
          <span style={{fontFamily:"monospace",fontWeight:700,fontSize:12,color:C.blue}}>{d.doNo}</span>
          <span style={{fontSize:10,color:C.t2}}>Dibuat: {fmtDate(d.createdAt)}</span>
          {d.deliveryDate&&d.deliveryDate!==d.createdAt&&<span style={{fontSize:10,color:C.t2}}>· Kirim: {fmtDate(d.deliveryDate)}</span>}
          {driver&&<span style={{fontSize:10,color:C.t3,marginLeft:"auto"}}>🚗 {driver}{plate?` · ${plate}`:""}</span>}
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f8fafc"}}>
            {["Item","Qty Kirim","HS Code","Catatan"].map(h=><th key={h} style={{padding:"5px 10px",fontSize:9,fontWeight:700,color:C.t2,textAlign:"left",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase"}}>{h}</th>)}
          </tr></thead>
          <tbody>{(d.lines||[]).map(line=>{
            const item=items.find(i=>i.id===line.itemId);
            return<tr key={line.itemId} style={{borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"6px 10px",fontSize:11,fontWeight:600,...TR,maxWidth:180}}>{item?.itemName||line.itemId}</td>
              <td style={{padding:"6px 10px",fontSize:11,fontFamily:"monospace",fontWeight:700,color:C.blue}}>{line.qtyDelivered} {item?.unit||""}</td>
              <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:C.t2}}>{line.hsCode||"–"}</td>
              <td style={{padding:"6px 10px",fontSize:10,color:C.t3,...TR,maxWidth:120}}>{line.notes||"–"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>;
    })}
  </div>;
}

/* ══ §8 SUPPLIER COMPONENTS ══════════════════════════════════ */
function SupplierSelect({value,onChange,suppliers,onAddNew,placeholder="Pilih supplier..."}){
  const[open,setOpen]=useState(false);const[q,setQ]=useState("");const ref=useRef();
  const active=suppliers.find(s=>s.id===value);
  const list=suppliers.filter(s=>!s.deletedAt&&(!q||s.name.toLowerCase().includes(q.toLowerCase())||s.tags?.some(t=>t.includes(q.toLowerCase()))));
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  return<div ref={ref} style={{position:"relative",flex:1,minWidth:0}}>
    <div onClick={()=>setOpen(v=>!v)} style={{...iB,cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:open?"#f0f9ff":C.surface,borderColor:open?C.blue:C.b2}}>
      {active?<div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:C.green,flexShrink:0}}/>
        <span style={{fontSize:12,fontWeight:600,color:C.text,...TR,flex:1}}>{active.name}</span>
        {active.tags?.slice(0,2).map(t=><span key={t} style={{fontSize:9,color:C.blue,background:C.bSoft,borderRadius:3,padding:"0 4px",flexShrink:0}}>{t}</span>)}
      </div>:<span style={{fontSize:12,color:C.t3,flex:1}}>{placeholder}</span>}
      {value&&<button onClick={e=>{e.stopPropagation();onChange("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.t3,display:"flex",padding:0,flexShrink:0}}><Ico d={IC.close} size={11}/></button>}
      <Ico d={IC.chevD} size={12} color={C.t3}/>
    </div>
    {open&&<div style={{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,background:C.surface,border:`1px solid ${C.b2}`,borderRadius:8,zIndex:5000,boxShadow:"0 8px 24px rgba(15,23,42,.15)",maxHeight:220,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"7px 9px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari nama atau tag..." style={{...iB,fontSize:11,padding:"5px 8px"}}/></div>
      <div style={{overflowY:"auto",flex:1}}>
        {!list.length&&<div style={{padding:12,fontSize:11,color:C.t3,textAlign:"center"}}>Tidak ditemukan</div>}
        {list.map(s=><div key={s.id} onClick={()=>{onChange(s.id);setOpen(false);setQ("");}} style={{padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${C.border}`}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:C.text,...TR}}>{s.name}</div>
            {s.tags?.length>0&&<div style={{display:"flex",gap:3,marginTop:2,flexWrap:"wrap"}}>{s.tags.slice(0,4).map(t=><span key={t} style={{fontSize:9,color:C.blue,background:C.bSoft,borderRadius:3,padding:"0 4px"}}>{t}</span>)}</div>}
          </div>
          {s.id===value&&<Ico d={IC.check} size={12} color={C.green}/>}
        </div>)}
      </div>
      {onAddNew&&<div onClick={()=>{setOpen(false);setQ("");onAddNew();}} style={{padding:"8px 12px",borderTop:`1px solid ${C.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:7,background:C.s2}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background=C.s2}><Ico d={IC.plus} size={13} color={C.blue}/><span style={{fontSize:12,fontWeight:600,color:C.blue}}>+ Tambah Supplier Baru</span></div>}
    </div>}
  </div>;
}
function SupplierFormModal({initial,onSave,onClose}){
  const blank={id:"",name:"",contact:"",phone:"",email:"",address:"",tags:[],notes:"",createdAt:today()};
  const[f,setF]=useState(initial||blank);const[ti,setTi]=useState("");
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const addTag=()=>{const t=ti.trim().toLowerCase();if(t&&!f.tags.includes(t)){setF(p=>({...p,tags:[...p.tags,t]}));setTi("");}};
  return<Modal open onClose={onClose} title={initial?.id?"Edit Supplier":"Tambah Supplier"} wide>
    <FGrid cols={2}>
      <FF label="Nama Supplier" span={2} required><FIn value={f.name} onChange={set("name")} placeholder="PT. Nama Supplier"/></FF>
      <FF label="Kontak"><FIn value={f.contact} onChange={set("contact")} placeholder="Nama PIC"/></FF>
      <FF label="Telepon"><FIn value={f.phone} onChange={set("phone")} placeholder="0812-3456-7890"/></FF>
      <FF label="Email"><FIn value={f.email} onChange={set("email")} placeholder="email@supplier.com"/></FF>
      <FF label="Alamat"><FIn value={f.address} onChange={set("address")} placeholder="Jl. Industri No.1"/></FF>
      <FF label="Catatan" span={2}><FTa value={f.notes} onChange={set("notes")} rows={2}/></FF>
      <Divider label="Tags produk yang dijual"/>
      <div style={{gridColumn:"span 2"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8,minHeight:28}}>{!f.tags.length&&<span style={{fontSize:11,color:C.t3,fontStyle:"italic"}}>Belum ada tag.</span>}{f.tags.map(t=><TagChip key={t} label={t} onRemove={()=>setF(p=>({...p,tags:p.tags.filter(x=>x!==t)}))}/>)}</div>
        <div style={{display:"flex",gap:8}}><FIn value={ti} onChange={setTi} placeholder="hydraulic, valve, pump..." style={{flex:1,fontSize:11}} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addTag())}/><Btn size="sm" variant="blue" onClick={addTag}><Ico d={IC.plus} size={11}/> Tag</Btn></div>
      </div>
    </FGrid>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:16,borderTop:`1px solid ${C.border}`,marginTop:16}}>
      <Btn onClick={onClose} variant="secondary">Batal</Btn>
      <Btn onClick={()=>f.name.trim()&&onSave({...f,id:f.id||("SUP"+uid())})} disabled={!f.name.trim()}><Ico d={IC.save} size={12}/> Simpan</Btn>
    </div>
  </Modal>;
}

/* ══ §9 ITEM FORM ════════════════════════════════════════════ */
function SupplierAssignments({assignments,qty,onChange,suppliers,onAddSupplier}){
  const[addNew,setAddNew]=useState(false);
  const add=()=>onChange([...assignments,{...mkAsgn(),id:"sa"+uid(),role:assignments.length===0?"main":"backup"}]);
  const upd=(id,p)=>onChange(assignments.map(a=>a.id===id?{...a,...p}:a));
  const del=id=>onChange(assignments.filter(a=>a.id!==id));
  const setMain=id=>onChange(assignments.map(a=>({...a,role:a.id===id?"main":(a.role==="main"?"backup":a.role)})));
  const tpu=a=>(a.pricePerUnit||0)+((a.shippingTotal||0)/Math.max(Number(qty)||1,1));
  const withP=assignments.filter(a=>a.supplierId&&(a.pricePerUnit||0)>0);
  const sorted=[...withP].sort((a,b)=>tpu(a)-tpu(b));
  return<div>
    {!assignments.length&&<div style={{padding:14,background:C.s2,borderRadius:8,border:`1px dashed ${C.b2}`,textAlign:"center",marginBottom:10,color:C.t3,fontSize:12}}>Belum ada supplier untuk item ini.</div>}
    {assignments.map(a=>{
      const isM=a.role==="main";const t=tpu(a);
      return<div key={a.id} style={{border:`2px solid ${isM?C.blue:C.border}`,borderRadius:8,marginBottom:10,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:isM?C.bSoft:C.s2,borderBottom:`1px solid ${isM?C.bMid:C.border}`}}>
          <div style={{display:"flex",gap:3,flexShrink:0}}>
            <button type="button" onClick={()=>setMain(a.id)} style={{padding:"3px 10px",borderRadius:20,border:`1px solid ${isM?C.blue:C.b2}`,background:isM?C.blue:"transparent",color:isM?"#fff":C.t2,fontSize:10,fontWeight:700,cursor:"pointer"}}>● Utama</button>
            <button type="button" onClick={()=>upd(a.id,{role:"backup"})} style={{padding:"3px 10px",borderRadius:20,border:`1px solid ${!isM?C.t2:C.b2}`,background:!isM?C.s2:"transparent",color:!isM?C.t2:C.t3,fontSize:10,fontWeight:700,cursor:"pointer"}}>○ Backup</button>
          </div>
          <SupplierSelect value={a.supplierId} onChange={v=>upd(a.id,{supplierId:v})} suppliers={suppliers} onAddNew={()=>setAddNew(true)}/>
          <Btn size="sm" variant="danger" onClick={()=>del(a.id)}><Ico d={IC.trash} size={10}/></Btn>
        </div>
        {a.supplierId&&<div style={{padding:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
            <FF label="Harga Beli /Unit (Rp)"><NumInput value={a.pricePerUnit||0} onChange={v=>upd(a.id,{pricePerUnit:v})} min={0}/></FF>
            <FF label="Ongkir Total (Rp)"><NumInput value={a.shippingTotal||0} onChange={v=>upd(a.id,{shippingTotal:v})} min={0}/></FF>
            <FF label="Efektif /Unit"><FIn value={fmt(t)} readOnly style={{fontSize:11,fontWeight:700,color:isM?C.blue:C.text}}/></FF>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <FF label="Link / URL">
              <div style={{display:"flex",gap:6,alignItems:"center"}}><FIn value={a.link||""} onChange={v=>upd(a.id,{link:v})} placeholder="https://..." style={{flex:1,fontSize:11}}/>{a.link&&<a href={a.link} target="_blank" rel="noreferrer" style={{color:C.blue,textDecoration:"none",flexShrink:0}}><Ico d={IC.link} size={11} color={C.blue}/></a>}</div>
            </FF>
            <FF label="Catatan"><FIn value={a.notes||""} onChange={v=>upd(a.id,{notes:v})} placeholder="Info..." style={{fontSize:11}}/></FF>
          </div>
        </div>}
      </div>;
    })}
    <Btn size="sm" variant="blue" onClick={add}><Ico d={IC.plus} size={11}/> Tambah Supplier</Btn>
    {sorted.length>=2&&<div style={{marginTop:12,background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
      <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase",letterSpacing:".06em"}}>Perbandingan Harga</div>
      {sorted.map((a,i)=>{const s=suppliers.find(x=>x.id===a.supplierId);const t=tpu(a);const diff=t-tpu(sorted[0]);return<div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<sorted.length-1?`1px solid ${C.border}`:"none",background:i===0?C.gSoft:"transparent"}}>
        {i===0?<span style={{fontSize:9,fontWeight:700,color:C.green,background:C.gMid,borderRadius:20,padding:"1px 7px",flexShrink:0}}>★ TERMURAH</span>:<span style={{fontSize:9,color:C.t3,background:C.bg,borderRadius:20,padding:"1px 7px",flexShrink:0}}>#{i+1}</span>}
        <span style={{flex:1,fontSize:11,...TR}}>{s?.name||"–"}</span>
        <span style={{fontFamily:"monospace",fontWeight:700,fontSize:12,color:i===0?C.green:C.text}}>{fmt(t)}</span>
        {i>0&&<span style={{fontSize:10,color:C.red,fontFamily:"monospace"}}>+{fmt(diff)}</span>}
        {a.role==="main"&&<span style={{fontSize:9,fontWeight:700,color:C.blue,background:C.bSoft,borderRadius:3,padding:"1px 6px"}}>UTAMA</span>}
      </div>;})}
    </div>}
    {addNew&&<SupplierFormModal onSave={s=>{onAddSupplier?.(s);setAddNew(false);}} onClose={()=>setAddNew(false)}/>}
  </div>;
}

function ItemForm({initial,poId,zoneTypes,suppliers,dos,onSave,onClose,onAddSupplier}){
  const[f,setF]=useState(()=>({...mkItem(),...initial,supplierAssignments:initial?.supplierAssignments||[],doNos:initial?.doNos||[]}));
  // FIX poin 5 — price/net chain: allow net > gross by adjusting unitPrice
  const set=useCallback(k=>v=>setF(p=>{
    const n={...p,[k]:v};
    if(k==="qty"||k==="unitPrice"){
      const g=(Number(k==="qty"?v:p.qty)||0)*(Number(k==="unitPrice"?v:p.unitPrice)||0);
      if(p.discountPct>0)n.discount=Math.round(g*p.discountPct/100);
    }
    if(k==="discount"){const g=(Number(p.qty)||0)*(Number(p.unitPrice)||0);n.discountPct=g>0?+((parseFloat(v)||0)/g*100).toFixed(2):0;}
    if(k==="discountPct"){const g=(Number(p.qty)||0)*(Number(p.unitPrice)||0);n.discount=Math.round(g*(parseFloat(v)||0)/100);}
    if(k==="netTarget"){
      // net = unitPrice*qty - discount  →  allow net > gross by raising unitPrice
      const netWant=parseFloat(v)||0;
      const disc=Number(p.discount)||0;
      const qty=Math.max(Number(p.qty)||1,1);
      const newUP=Math.ceil((netWant+disc)/qty);
      n.unitPrice=newUP;
      n.discount=Math.max(0,newUP*qty-netWant);
      n.discountPct=newUP*qty>0?+((n.discount/(newUP*qty))*100).toFixed(2):0;
    }
    return n;
  }),[]);
  const gross=(Number(f.qty)||0)*(Number(f.unitPrice)||0);
  const net=Math.max(0,gross-(Number(f.discount)||0));
  const mainA=(f.supplierAssignments||[]).find(a=>a.role==="main");
  const buyPU=mainA?(mainA.pricePerUnit||0)+((mainA.shippingTotal||0)/Math.max(Number(f.qty)||1,1)):0;
  const mgPU=(Number(f.unitPrice)||0)-(Number(f.discount)||0)/Math.max(Number(f.qty)||1,1)-buyPU;
  const qDel=f.id?getQtyDel(f.id,dos||[]):0;
  const supWarn=!(f.supplierAssignments||[]).length;
  const delWarn=f.status==="delivered"&&!f.deliveryDate;
  return<div>
    <Accordion title="Detail Item" icon={IC.box} defaultOpen warning={!f.itemName.trim()}>
      <FGrid cols={2}>
        <FF label="Nama Item" span={2} required><FIn value={f.itemName} onChange={set("itemName")} placeholder="Nama item / part number"/></FF>
        <FF label="Deskripsi" span={2}><FTa value={f.desc} onChange={set("desc")} rows={2} placeholder="Keterangan..."/></FF>
        <FF label="Qty"><NumInput value={f.qty} onChange={set("qty")} min={0}/></FF>
        <FF label="Unit"><FSel value={f.unit} onChange={set("unit")} options={UNITS.map(u=>({v:u,l:u}))}/></FF>
        <FF label="HS Code"><HSCodeInput value={f.hsCode||""} onChange={set("hsCode")}/></FF>
        <FF label="Zone Type"><FSel value={f.zoneType} onChange={set("zoneType")} options={zoneTypes.map(z=>({v:z,l:z}))}/></FF>
      </FGrid>
    </Accordion>
    <Accordion title="Harga & Diskon" icon={IC.stats} defaultOpen>
      <FGrid cols={2}>
        <FF label="Harga Jual /Unit (Rp)"><NumInput value={f.unitPrice} onChange={set("unitPrice")} min={0}/></FF>
        <FF label="Net Total (Rp)" hint="ubah ini → adjust unitPrice jika perlu"><NumInput value={net} onChange={set("netTarget")} min={0}/></FF>
        <FF label="Discount (Rp)"><NumInput value={f.discount||0} onChange={set("discount")} min={0}/></FF>
        <FF label="Discount (%)" hint="⇄ Rp"><NumInput value={f.discountPct||0} onChange={set("discountPct")} min={0} max={100}/></FF>
        <FF label="Gross (sebelum disc)"><FIn value={fmt(gross)} readOnly style={{color:C.t3}}/></FF>
        <FF label="Net Ex PPN"><FIn value={fmt(net)} readOnly style={{fontWeight:700,color:C.blue,fontSize:13}}/></FF>
        {buyPU>0&&<><FF label="Harga Beli /Unit (Supplier Utama)"><FIn value={fmt(buyPU)} readOnly style={{color:C.orange}}/></FF>
        <FF label={<span>Margin /Unit{mgPU<0&&<Ico d={IC.warn} size={11} color={C.red} style={{marginLeft:4}}/>}</span>}><FIn value={fmt(mgPU)} readOnly style={{fontWeight:700,color:mgPU>=0?C.green:C.red}}/></FF></>}
      </FGrid>
    </Accordion>
    <Accordion title="Supplier" icon={IC.users} defaultOpen={!!(f.supplierAssignments||[]).length} badge={(f.supplierAssignments||[]).length||undefined} warning={supWarn}>
      <SupplierAssignments assignments={f.supplierAssignments||[]} qty={f.qty||1} onChange={v=>setF(p=>({...p,supplierAssignments:v}))} suppliers={suppliers} onAddSupplier={onAddSupplier}/>
    </Accordion>
    <Accordion title="Pengiriman & Tracking" icon={IC.truck} defaultOpen={delWarn} warning={delWarn}>
      <FGrid cols={2}>
        <FF label="Status Item"><FSel value={f.status} onChange={set("status")} options={Object.entries(ITEM_STATUS).map(([k,v])=>({v:k,l:v.label}))}/></FF>
        <FF label={<span>Tgl Delivery{delWarn&&<span style={{color:C.red,fontSize:10,marginLeft:4}}>⚠ Isi!</span>}</span>}><SmartDate value={f.deliveryDate} onChange={set("deliveryDate")} style={delWarn?{borderColor:C.red}:{}}/></FF>
        <FF label="No. Invoice" span={2}><FIn value={f.invoiceNo||""} onChange={set("invoiceNo")} placeholder="INV/XXX/2024/001"/></FF>
        {qDel>0&&<FF label="Qty Terkirim (via DO)" span={2}><div style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:C.gSoft,borderRadius:6,border:"1px solid #a7f3d0"}}><span style={{fontSize:13,fontWeight:700,color:C.green}}>{qDel} / {f.qty||0} {f.unit}</span><span style={{fontSize:11,color:C.t2}}>terkirim · sisa {Math.max(0,(f.qty||0)-qDel)} {f.unit}</span></div></FF>}
        {(f.doNos||[]).length>0&&<FF label="DO Numbers" span={2}><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{f.doNos.map(d=><span key={d} style={{fontSize:10,fontFamily:"monospace",background:C.bSoft,border:`1px solid ${C.bMid}`,borderRadius:4,padding:"1px 7px",color:C.blue}}>{d}</span>)}</div></FF>}
      </FGrid>
    </Accordion>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:10}}>
      {onClose&&<Btn onClick={onClose} variant="secondary">Batal</Btn>}
      <Btn onClick={()=>f.itemName.trim()&&onSave({...f,id:f.id||("item"+uid()),poId})} disabled={!f.itemName.trim()}><Ico d={IC.save} size={12}/> Simpan Item</Btn>
    </div>
  </div>;
}

/* ══ §10 DO GENERATOR ════════════════════════════════════════ */
function DOGeneratorModal({po,items,dos,settings,onClose,onSaveDO}){
  const poItems=items.filter(i=>i.poId===po.id);
  const fields=(settings.doFields||DEFAULT_DO_FIELDS).filter(f=>f.enabled);
  const[form,setForm]=useState({doNo:formatDO(settings.doFormat,nextDOSeq(dos)),deliveryDate:today(),fieldValues:Object.fromEntries(fields.map(f=>[f.key,""]))});
  const[lines,setLines]=useState(()=>poItems.map(i=>({itemId:i.id,selected:getQtyRem(i,dos)>0,qtyDelivered:getQtyRem(i,dos),hsCode:i.hsCode||"",notes:""})));
  const setFV=k=>v=>setForm(p=>({...p,fieldValues:{...p.fieldValues,[k]:v}}));
  const setLine=(id,p)=>setLines(prev=>prev.map(l=>l.itemId===id?{...l,...p}:l));
  const sel=lines.filter(l=>l.selected&&l.qtyDelivered>0);
  const handleSave=()=>{
    if(!sel.length)return;
    const doObj={id:"do"+uid(),doNo:form.doNo,poId:po.id,createdAt:today(),deliveryDate:form.deliveryDate,fieldValues:form.fieldValues,lines:sel};
    onSaveDO(doObj);
    onClose();
  };
  const handlePrintSave=()=>{
    if(!sel.length)return;
    const doObj={id:"do"+uid(),doNo:form.doNo,poId:po.id,createdAt:today(),deliveryDate:form.deliveryDate,fieldValues:form.fieldValues,lines:sel};
    onSaveDO(doObj);
    setTimeout(()=>window.print(),200);
    setTimeout(()=>onClose(),300);
  };
  const th={padding:"8px 8px",fontSize:9,fontWeight:700,background:"#f3f4f6",textTransform:"uppercase",letterSpacing:".05em",borderBottom:"2px solid #d1d5db",textAlign:"left",whiteSpace:"nowrap"};
  const td={padding:"7px 8px",fontSize:11,borderBottom:"1px solid #e5e7eb"};
  return<Modal open onClose={onClose} title="Buat Surat Jalan (DO)" xwide noPad>
    <style>{`@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}body>*{display:none!important;}#pa{display:block!important;position:fixed;inset:0;background:#fff;overflow:auto;}@page{size:A4;margin:0;}}`}</style>
    <div className="np" style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:16}}>
        <FF label="No. Surat Jalan"><FIn value={form.doNo} onChange={v=>setForm(p=>({...p,doNo:v}))} style={{fontFamily:"monospace",fontWeight:700,color:C.blue}}/></FF>
        <FF label="Tanggal Kirim"><SmartDate value={form.deliveryDate} onChange={v=>setForm(p=>({...p,deliveryDate:v}))}/></FF>
        {fields.map(f=><FF key={f.key} label={f.label}>{f.type==="textarea"?<FTa value={form.fieldValues[f.key]||""} onChange={setFV(f.key)} rows={1}/>:<FIn value={form.fieldValues[f.key]||""} onChange={setFV(f.key)} placeholder={f.label+"..."}/>}</FF>)}
      </div>
      <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:8}}>Item yang Dikirim <span style={{color:C.t3,fontWeight:400}}>({sel.length} dipilih)</span></div>
      <div style={{border:`1px solid ${C.border}`,borderRadius:7,overflow:"hidden",marginBottom:14}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            <th style={{...th,width:36}}><input type="checkbox" checked={lines.every(l=>l.selected)} onChange={e=>setLines(p=>p.map(l=>({...l,selected:e.target.checked})))}/></th>
            {["Item","HS Code","Qty PO","Sdh Kirim","Sisa","Kirim Skrg","Catatan"].map(h=><th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>{poItems.map((item,i)=>{
            const line=lines.find(l=>l.itemId===item.id)||{selected:false,qtyDelivered:0,hsCode:"",notes:""};
            const qd=getQtyDel(item.id,dos);const qr=getQtyRem(item,dos);
            return<tr key={item.id} style={{background:line.selected?"#eff6ff":i%2===0?"#fff":"#fafbfc"}}>
              <td style={td}><input type="checkbox" checked={line.selected} onChange={()=>setLine(item.id,{selected:!line.selected})}/></td>
              <td style={{...td,fontWeight:600,...TR,maxWidth:160}} title={item.itemName}>{item.itemName}</td>
              <td style={td}><HSCodeInput value={line.hsCode||""} onChange={v=>setLine(item.id,{hsCode:v})} placeholder={item.hsCode||"HS code..."} style={{fontSize:10,padding:"4px 7px",width:180}}/></td>
              <td style={{...td,color:C.t2}}>{item.qty} {item.unit}</td>
              <td style={{...td,color:qd>0?C.green:C.t3,fontWeight:qd>0?700:400}}>{qd}</td>
              <td style={{...td,color:qr===0?C.t3:C.blue,fontWeight:700}}>{qr}</td>
              <td style={td}><NumInput value={line.qtyDelivered} min={0} max={item.qty} onChange={v=>setLine(item.id,{qtyDelivered:Math.min(item.qty,Math.max(0,v))})} style={{width:70,background:line.selected?"#fff":C.s2}}/></td>
              <td style={td}><input value={line.notes} onChange={e=>setLine(item.id,{notes:e.target.value})} placeholder="Catatan..." style={{...iB,fontSize:10,padding:"4px 7px",width:110}}/></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <Btn onClick={onClose} variant="secondary">Batal</Btn>
        <Btn onClick={handleSave} disabled={!sel.length} variant="blue"><Ico d={IC.save} size={12}/> Simpan Saja</Btn>
        <Btn onClick={handlePrintSave} disabled={!sel.length}><Ico d={IC.print} size={12}/> Simpan & Cetak</Btn>
      </div>
    </div>
    {/* PRINT AREA */}
    <div id="pa" style={{display:"none",background:"#fff",color:"#111",fontFamily:"Arial,sans-serif",padding:"18mm 16mm 12mm",minHeight:"297mm"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingBottom:14,marginBottom:16,borderBottom:"3px solid #1e3a5f"}}>
        <div><div style={{fontSize:20,fontWeight:900,color:"#1e3a5f"}}>{VENDOR_NAME}</div><div style={{fontSize:10,color:"#6b7280",marginTop:2}}>{VENDOR_ADDR}</div><div style={{fontSize:10,color:"#6b7280"}}>{VENDOR_CONTACT}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:900,color:"#1e3a5f",letterSpacing:".05em"}}>SURAT JALAN</div><div style={{fontSize:15,fontWeight:700,fontFamily:"monospace",color:"#374151",marginTop:2}}>{form.doNo}</div><div style={{fontSize:10,color:"#6b7280",marginTop:2}}>Tgl: {fmtDate(form.deliveryDate)}</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
        <div style={{background:"#f9fafb",borderRadius:6,padding:"12px 14px",border:"1px solid #e5e7eb"}}><div style={{fontSize:8,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",marginBottom:5}}>Kepada</div><div style={{fontSize:13,fontWeight:700}}>{po.company}</div><div style={{fontSize:10,color:"#6b7280",marginTop:3}}>Ref PO: {po.orderNo}</div></div>
        <div style={{background:"#f9fafb",borderRadius:6,padding:"12px 14px",border:"1px solid #e5e7eb"}}><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>{fields.filter(f=>form.fieldValues[f.key]).map(f=><tr key={f.key}><td style={{fontSize:9,color:"#6b7280",padding:"2px 0",width:65}}>{f.label}</td><td style={{fontSize:9,padding:"2px 3px"}}>:</td><td style={{fontSize:10,fontWeight:600}}>{form.fieldValues[f.key]}</td></tr>)}</tbody></table></div>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
        <thead><tr>{["No.","Nama Barang","Keterangan","HS Code","Qty","Satuan","Catatan"].map(h=><th key={h} style={{padding:"7px 8px",fontSize:9,fontWeight:700,background:"#f3f4f6",textTransform:"uppercase",letterSpacing:".05em",borderBottom:"2px solid #d1d5db",textAlign:"left"}}>{h}</th>)}</tr></thead>
        <tbody>{sel.map((line,idx)=>{const item=items.find(i=>i.id===line.itemId);return<tr key={line.itemId} style={{background:idx%2===0?"#fff":"#f9fafb"}}>
          <td style={{padding:"7px 8px",fontSize:10,textAlign:"center",borderBottom:"1px solid #e5e7eb"}}>{idx+1}</td>
          <td style={{padding:"7px 8px",fontSize:10,fontWeight:600,borderBottom:"1px solid #e5e7eb"}}>{item?.itemName}</td>
          <td style={{padding:"7px 8px",fontSize:9,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{item?.desc||"–"}</td>
          <td style={{padding:"7px 8px",fontSize:9,fontFamily:"monospace",borderBottom:"1px solid #e5e7eb"}}>{line.hsCode||"–"}</td>
          <td style={{padding:"7px 8px",fontSize:12,fontWeight:700,textAlign:"center",borderBottom:"1px solid #e5e7eb"}}>{line.qtyDelivered}</td>
          <td style={{padding:"7px 8px",fontSize:10,borderBottom:"1px solid #e5e7eb"}}>{item?.unit}</td>
          <td style={{padding:"7px 8px",fontSize:9,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{line.notes||"–"}</td>
        </tr>;})}
        </tbody>
      </table>
      {form.fieldValues?.remarks&&<div style={{background:"#fffbeb",borderRadius:6,padding:"9px 13px",border:"1px solid #fde68a",fontSize:10,color:"#92400e",marginBottom:16}}><strong>Keterangan:</strong> {form.fieldValues.remarks}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16,marginTop:32}}>{["Pengirim","Pengemudi","Penerima","Mengetahui"].map(l=><div key={l} style={{textAlign:"center"}}><div style={{borderBottom:"1px solid #9ca3af",height:44,marginBottom:6}}/><div style={{fontSize:9,color:"#6b7280",fontWeight:700}}>{l}</div></div>)}</div>
      <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid #e5e7eb",fontSize:8,color:"#9ca3af",textAlign:"center"}}>Dicetak oleh {VENDOR_NAME} · {form.doNo} · {new Date().toLocaleString("id-ID")}</div>
    </div>
  </Modal>;
}

/* ══ §11 PO FORM ═════════════════════════════════════════════ */
function POForm({initial,companies,items,suppliers,dos,zoneTypes,settings,onSave,onClose,onAddSupplier}){
  const blank={id:"",quoteRef:"",orderNo:"",company:"",orderDate:today(),prNo:"",notes:"",folder:"",status:"draft",priority:"normal",totalLocked:false,manualExPPN:0,manualPPN:0};
  const[f,setF]=useState(initial||blank);
  const[draftItems,setDraftItems]=useState(()=>initial?.id?items.filter(i=>i.poId===initial.id):[]);
  const[showAddItem,setShowAddItem]=useState(false);const[editItem,setEditItem]=useState(null);
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const tots=useMemo(()=>calcPOTotals(f,draftItems),[f,draftItems]);
  const handleSave=()=>{if(!f.company.trim()||!f.orderDate)return;onSave({...f,id:f.id||("po"+uid())},draftItems);};
  return<Modal open onClose={onClose} title={initial?.id?`Edit PO – ${initial.orderNo}`:"Tambah PO Baru"} xwide>
    <FGrid cols={2}>
      <Divider label="Informasi PO"/>
      <FF label="No. PO / Order" required><FIn value={f.orderNo} onChange={set("orderNo")} placeholder="PTAM/PO/NT/24/00001"/></FF>
      <FF label="Quote Ref"><FIn value={f.quoteRef} onChange={set("quoteRef")} placeholder="019/MIA/V/2024"/></FF>
      <FF label="Perusahaan" required span={2}><FSel value={f.company} onChange={set("company")} options={companies.map(c=>({v:c,l:c}))} placeholder="— Pilih perusahaan —"/></FF>
      <FF label="Tanggal Order"><SmartDate value={f.orderDate} onChange={set("orderDate")}/></FF>
      <FF label="PR No."><FIn value={f.prNo} onChange={set("prNo")} placeholder="PTAM/PR/00001"/></FF>
      <FF label="Status PO"><FSel value={f.status} onChange={set("status")} options={Object.entries(INIT_PO_STATUS).map(([k,v])=>({v:k,l:v.label}))}/></FF>
      <FF label="Prioritas"><FSel value={f.priority} onChange={set("priority")} options={[{v:"normal",l:"Normal"},{v:"urgent",l:"Urgent"},{v:"low",l:"Low"}]}/></FF>
      <FF label="Folder / Link" span={2}><FIn value={f.folder} onChange={set("folder")} placeholder="https://drive.google.com/..."/></FF>
      <FF label="Catatan" span={2}><FTa value={f.notes} onChange={set("notes")} rows={2} placeholder="Catatan PO..."/></FF>
      <Divider label="Total"/>
      <FF label={<span style={{display:"flex",alignItems:"center",gap:6}}>Lock Total Manual <Ico d={f.totalLocked?IC.lock:IC.unlock} size={11} color={f.totalLocked?C.amber:C.t3}/></span>} span={2}>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,marginTop:2}}>
          <input type="checkbox" checked={f.totalLocked} onChange={e=>setF(p=>({...p,totalLocked:e.target.checked}))}/>
          <span>Kunci total manual (override kalkulasi otomatis dari item)</span>
        </label>
      </FF>
      {f.totalLocked&&<>
        <FF label="Total Ex PPN (Rp)"><NumInput value={f.manualExPPN||0} onChange={set("manualExPPN")} min={0}/></FF>
        <FF label="PPN (Rp)" hint={`11% = ${fmt(Math.round((f.manualExPPN||0)*PPN_RATE))}`}><NumInput value={f.manualPPN||0} onChange={set("manualPPN")} min={0}/></FF>
      </>}
      <FF label="Total Ex PPN"><FIn value={fmt(tots.exPPN)} readOnly style={{fontWeight:700,color:C.blue}}/></FF>
      <FF label="Total Inc PPN"><FIn value={fmt(tots.total)} readOnly style={{fontWeight:700,color:C.green}}/></FF>
    </FGrid>
    {/* Draft Items */}
    <div style={{marginTop:16,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.s2,borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:12,fontWeight:700,color:C.text}}>Items ({draftItems.length})</span>
        <Btn size="sm" variant="blue" onClick={()=>setShowAddItem(true)}><Ico d={IC.plus} size={11}/> Tambah Item</Btn>
      </div>
      {!draftItems.length&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:12}}>Belum ada item.</div>}
      {draftItems.map((item,i)=>{
        const main=(item.supplierAssignments||[]).find(a=>a.role==="main");
        return<div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<draftItems.length-1?`1px solid ${C.border}`:"none",background:i%2===0?"#fff":C.s2}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,...TR}}>{item.itemName}</div>
            <div style={{fontSize:10,color:C.t2,marginTop:2}}>{item.qty} {item.unit} · {fmt(itemNet(item))}{main?` · Beli: ${fmt(itemBuy(item))}`:""}</div>
          </div>
          <SBadge status={item.status} cfg={ITEM_STATUS}/>
          <Btn size="sm" variant="ghost" onClick={()=>setEditItem(item)}><Ico d={IC.edit} size={11}/></Btn>
          <Btn size="sm" variant="danger" onClick={()=>setDraftItems(p=>p.filter(x=>x.id!==item.id))}><Ico d={IC.trash} size={11}/></Btn>
        </div>;
      })}
    </div>
    {showAddItem&&<Modal open onClose={()=>setShowAddItem(false)} title="Tambah Item" wide>
      <ItemForm poId={f.id||"draft"} zoneTypes={zoneTypes} suppliers={suppliers} dos={dos} onAddSupplier={onAddSupplier} onSave={item=>{setDraftItems(p=>[...p,item]);setShowAddItem(false);}} onClose={()=>setShowAddItem(false)}/>
    </Modal>}
    {editItem&&<Modal open onClose={()=>setEditItem(null)} title="Edit Item" wide>
      <ItemForm initial={editItem} poId={f.id||"draft"} zoneTypes={zoneTypes} suppliers={suppliers} dos={dos} onAddSupplier={onAddSupplier} onSave={item=>{setDraftItems(p=>p.map(x=>x.id===item.id?item:x));setEditItem(null);}} onClose={()=>setEditItem(null)}/>
    </Modal>}
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:16,borderTop:`1px solid ${C.border}`,marginTop:16}}>
      <Btn onClick={onClose} variant="secondary">Batal</Btn>
      <Btn onClick={handleSave} disabled={!f.company||!f.orderDate}><Ico d={IC.save} size={12}/> Simpan PO</Btn>
    </div>
  </Modal>;
}

/* ══ §12 EXPANDED ROW ════════════════════════════════════════ */
function ExpandedRow({po,items,suppliers,dos,zoneTypes,settings,hsDB=[],onUpdateItem,onDeleteItem,onAddItem,onOpenDO,onAddSupplier,onConfirmDelete,onDeleteDO}){
  const poItems=items.filter(i=>i.poId===po.id);
  const[showAdd,setShowAdd]=useState(false);const[editItem,setEditItem]=useState(null);
  const[doTab,setDoTab]=useState(false);
  const tots=calcPOTotals(po,items);
  const poDos=(dos||[]).filter(d=>d.poId===po.id);
  // FIX poin 8 — bulk for items
  const[bulkItems,setBulkItems]=useState(new Set());
  const toggleBulkItem=id=>{const s=new Set(bulkItems);s.has(id)?s.delete(id):s.add(id);setBulkItems(s);};
  const th={padding:"7px 8px",fontSize:9,fontWeight:700,color:C.t2,borderBottom:`1px solid ${C.border}`,textAlign:"left",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".04em",background:C.s2};
  const td={padding:"7px 8px",borderBottom:`1px solid ${C.border}`,fontSize:12,verticalAlign:"middle"};
  return<div style={{padding:"16px 20px",background:"#fafcff",borderTop:`1px solid ${C.border}`}}>
    {/* Summary bar */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",gap:14,fontSize:11,color:C.t2,flexWrap:"wrap"}}>
        <span>Ex PPN: <strong style={{color:C.text}}>{fmt(tots.exPPN)}</strong></span>
        <span>PPN: <strong style={{color:C.text}}>{fmt(tots.ppn)}</strong></span>
        <span>Total: <strong style={{color:C.blue,fontSize:13}}>{fmt(tots.total)}</strong></span>
        {po.folder&&<a href={po.folder} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:C.blue,background:C.bSoft,border:`1px solid ${C.bMid}`,borderRadius:5,padding:"2px 8px",textDecoration:"none",fontWeight:600}}>📁 Drive</a>}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {bulkItems.size>0&&<>
          <Btn size="sm" variant="danger" onClick={()=>{if(bulkItems.size>0){onConfirmDelete([...bulkItems],()=>{setBulkItems(new Set());});}}}>
            <Ico d={IC.trash} size={10}/> Hapus {bulkItems.size} Item
          </Btn>
          <Btn size="sm" variant="ghost" onClick={()=>setBulkItems(new Set())}><Ico d={IC.close} size={10}/></Btn>
        </>}
        <Btn size="sm" variant={doTab?"blue":"ghost"} onClick={()=>setDoTab(v=>!v)}>
          <Ico d={IC.truck} size={11} color={doTab?C.blue:C.t2}/> DO ({poDos.length})
        </Btn>
        <Btn size="sm" variant="ghost" onClick={()=>onOpenDO(po)}><Ico d={IC.plus} size={11}/> Buat DO</Btn>
        <Btn size="sm" variant="blue" onClick={()=>setShowAdd(true)}><Ico d={IC.plus} size={11}/> Item</Btn>
      </div>
    </div>
    {/* FIX poin 8 — DO panel expandable */}
    {doTab&&<div style={{marginBottom:14}}>
      <DODetailPanel dos={dos} poId={po.id} items={items} onDeleteDO={onDeleteDO}/>
    </div>}
    {/* Items table */}
    {!poItems.length&&<div style={{padding:14,textAlign:"center",color:C.t3,fontSize:12,background:C.s2,borderRadius:6,border:`1px dashed ${C.b2}`}}>Belum ada item.</div>}
    {poItems.length>0&&<div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
        <thead><tr>
          <th style={{...th,width:32}}><input type="checkbox" checked={poItems.length>0&&poItems.every(i=>bulkItems.has(i.id))} onChange={e=>{const s=new Set(bulkItems);poItems.forEach(i=>e.target.checked?s.add(i.id):s.delete(i.id));setBulkItems(s);}}/></th>
          {["Item","Qty","Unit","Harga Jual","Net","Supplier Utama","Margin","Status","Delivery","Invoice","DO"].map(h=><th key={h} style={th}>{h}</th>)}
          <th style={{...th,width:60}}/>
        </tr></thead>
        <tbody>{poItems.map((item,i)=>{
          const main=(item.supplierAssignments||[]).find(a=>a.role==="main");
          const mainSup=suppliers.find(s=>s.id===main?.supplierId);
          const mg=itemMargin(item);const net=itemNet(item);
          const qDel=getQtyDel(item.id,dos);
          // FIX poin 8 — per-item DO detail on row
          const itemDOs=(dos||[]).filter(d=>(d.lines||[]).some(l=>l.itemId===item.id));
          return<tr key={item.id} style={{borderBottom:`1px solid ${C.border}`,background:bulkItems.has(item.id)?"#eff6ff":i%2===0?"#fff":C.s2}}>
            <td style={td} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={bulkItems.has(item.id)} onChange={()=>toggleBulkItem(item.id)}/></td>
            <td style={{...td,fontWeight:600,...TR,maxWidth:160}} title={item.itemName}>{item.itemName}{(item.supplierAssignments||[]).length>1&&<span style={{marginLeft:4,fontSize:9,color:C.t3}}>+{(item.supplierAssignments||[]).length-1}</span>}</td>
            <td style={{...td,fontFamily:"monospace"}}>{item.qty}</td>
            <td style={{...td,color:C.t2}}>{item.unit}</td>
            <td style={{...td,fontFamily:"monospace",whiteSpace:"nowrap"}}>{fmt(item.unitPrice)}</td>
            <td style={{...td,fontFamily:"monospace",fontWeight:600,color:C.blue,whiteSpace:"nowrap"}}>{fmt(net)}</td>
            <td style={{...td,...TR,maxWidth:120}}>
              {mainSup?<span style={{fontSize:11,color:C.text}}>{mainSup.name}</span>:<InlineCell value={main?.supplierId} onSave={v=>onUpdateItem({...item,supplierAssignments:(item.supplierAssignments||[]).map(a=>a.role==="main"?{...a,supplierId:v}:a)})} select opts={suppliers.filter(s=>!s.deletedAt).map(s=>({v:s.id,l:s.name}))}/>}
            </td>
            <td style={{...td,fontFamily:"monospace",color:mg===null?C.t3:mg>=0?C.green:C.red,fontWeight:600,whiteSpace:"nowrap"}}>{mg===null?"–":fmt(mg)}</td>
            <td style={td}><SPill value={item.status} onChange={v=>onUpdateItem({...item,status:v})} cfg={ITEM_STATUS} mini/></td>
            <td style={{...td,whiteSpace:"nowrap"}}><InlineCell value={item.deliveryDate} onSave={v=>onUpdateItem({...item,deliveryDate:v})} isDate placeholder="Pilih"/></td>
            <td style={{...td,...TR,maxWidth:110}}><InlineCell value={item.invoiceNo} onSave={v=>onUpdateItem({...item,invoiceNo:v})} mono placeholder="INV..."/></td>
            <td style={td}>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {itemDOs.map(d=>{const line=d.lines.find(l=>l.itemId===item.id);return<div key={d.id} style={{display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:9,fontFamily:"monospace",color:C.blue,background:C.bSoft,borderRadius:3,padding:"0 4px",whiteSpace:"nowrap"}}>{d.doNo}</span>
                  <span style={{fontSize:9,color:C.t3}}>{line?.qtyDelivered}{item.unit?` ${item.unit}`:""}</span>
                </div>;})}
                {!itemDOs.length&&<span style={{fontSize:9,color:C.t3}}>–</span>}
                {qDel>0&&<span style={{fontSize:9,color:qDel>=item.qty?C.green:C.amber,fontWeight:700}}>{qDel}/{item.qty}</span>}
              </div>
            </td>
            <td style={td}>
              <div style={{display:"flex",gap:4}}>
                <Btn size="sm" variant="ghost" onClick={()=>setEditItem(item)}><Ico d={IC.edit} size={10}/></Btn>
                <Btn size="sm" variant="danger" onClick={()=>onConfirmDelete([item.id],()=>{})}><Ico d={IC.trash} size={10}/></Btn>
              </div>
            </td>
          </tr>;
        })}</tbody>
        <tfoot><tr style={{background:C.bSoft,borderTop:`2px solid ${C.bMid}`}}>
          <td colSpan={2} style={{...td,fontWeight:700,fontSize:11,color:C.t2}}>TOTAL</td>
          <td style={{...td,fontFamily:"monospace",fontWeight:700}}>{poItems.reduce((s,i)=>s+(Number(i.qty)||0),0)}</td>
          <td style={td}></td>
          <td style={td}></td>
          <td style={{...td,fontFamily:"monospace",fontWeight:700,color:C.blue}}>{fmt(poItems.reduce((s,i)=>s+itemNet(i),0))}</td>
          <td style={td}></td>
          <td style={{...td,fontFamily:"monospace",fontWeight:700,color:C.green}}>{fmt(poItems.reduce((s,i)=>{const m=itemMargin(i);return s+(m||0);},0))}</td>
          <td colSpan={5} style={td}></td>
        </tr></tfoot>
      </table>
    </div>}
    {showAdd&&<Modal open onClose={()=>setShowAdd(false)} title="Tambah Item" wide>
      <ItemForm poId={po.id} zoneTypes={zoneTypes} suppliers={suppliers} dos={dos} hsDB={hsDB} onAddSupplier={onAddSupplier} onSave={item=>{onAddItem(item);setShowAdd(false);}} onClose={()=>setShowAdd(false)}/>
    </Modal>}
    {editItem&&<Modal open onClose={()=>setEditItem(null)} title="Edit Item" wide>
      <ItemForm initial={editItem} poId={po.id} zoneTypes={zoneTypes} suppliers={suppliers} dos={dos} hsDB={hsDB} onAddSupplier={onAddSupplier} onSave={item=>{onUpdateItem(item);setEditItem(null);}} onClose={()=>setEditItem(null)}/>
    </Modal>}
  </div>;
}

/* ══ §13 PO LIST ═════════════════════════════════════════════ */
function POList({pos,items,suppliers,dos,companies,zoneTypes,settings,hsDB=[],onUpdate,onAdd,onDelete,onUpdateItem,onDeleteItems,onAddItem,onAddSupplier,onSaveDO,onDeleteDO,toast}){
  const[search,setSearch]=useState("");const[page,setPage]=useState(1);
  const[sort,setSort]=useState({col:"orderDate",dir:"desc"});
  const[exp,setExp]=useState(null);
  const[showForm,setShowForm]=useState(false);const[editPO,setEditPO]=useState(null);
  const[doTarget,setDoTarget]=useState(null);
  const[bulkSel,setBulkSel]=useState(new Set());
  const[csvLoading,setCsvLoading]=useState(false);
  const[colF,setColF]=useState({});
  const[copied,setCopied]=useState(false);
  const{ask,ConfirmModal}=useConfirm();

  const sortedFiltered=useMemo(()=>{
    let r=pos.filter(p=>{
      if(search){const q=search.toLowerCase();if(!(p.orderNo?.toLowerCase().includes(q)||p.company?.toLowerCase().includes(q)||p.quoteRef?.toLowerCase().includes(q)||p.notes?.toLowerCase().includes(q)))return false;}
      for(const[col,s]of Object.entries(colF)){if(!s||!s.size)continue;let v="";if(col==="status")v=p.status;else if(col==="company")v=p.company;else if(col==="priority")v=p.priority;else if(col==="zone")v=getPOZone(p.id,items);if(!s.has(v))return false;}
      return true;
    });
    return[...r].sort((a,b)=>{let av=a[sort.col]??"",bv=b[sort.col]??"";if(sort.col==="total"){av=calcPOTotals(a,items).total;bv=calcPOTotals(b,items).total;}if(sort.col==="items"){av=items.filter(i=>i.poId===a.id).length;bv=items.filter(i=>i.poId===b.id).length;}const d=typeof av==="number"?av-bv:String(av).localeCompare(String(bv));return sort.dir==="asc"?d:-d;});
  },[pos,items,search,sort,colF]);
  const paged=sortedFiltered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const toggleSort=col=>{setSort(s=>s.col===col?{col,dir:s.dir==="asc"?"desc":"asc"}:{col,dir:"asc"});setPage(1);};
  const SortIco=({col})=>sort.col===col?<Ico d={sort.dir==="asc"?IC.sortU:IC.sortD} size={9} color={C.blue}/>:<Ico d={IC.sortN} size={9} color={C.b2}/>;
  const th={padding:"9px 10px",fontSize:10,fontWeight:700,color:C.t2,textAlign:"left",whiteSpace:"nowrap",borderBottom:`2px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".04em",background:C.s2,cursor:"pointer",userSelect:"none"};
  const td={padding:"9px 10px",borderBottom:`1px solid ${C.border}`,fontSize:12,verticalAlign:"middle"};

  // FIX poin 1 — POProgress as data (visual + extractable)
  const POProgress=({poId})=>{
    const{n,del,inv,paid}=getPOProgress(poId,items);
    if(!n)return null;
    return<div style={{display:"flex",gap:3,marginTop:3,flexWrap:"wrap"}}>
      <span title={`Terkirim: ${del}/${n} item`} style={{fontSize:9,color:del===n?C.green:del>0?C.amber:C.t3,background:del>0?C.gSoft:C.bg,border:`1px solid ${del===n?C.gMid:del>0?"#a7f3d0":C.border}`,borderRadius:3,padding:"1px 5px",fontWeight:600}}>🚚 {del}/{n}</span>
      <span title={`Invoice: ${inv}/${n} item`} style={{fontSize:9,color:inv===n?C.blue:inv>0?C.blue:C.t3,background:inv>0?C.bSoft:C.bg,border:`1px solid ${inv===n?C.bMid:inv>0?C.bMid:C.border}`,borderRadius:3,padding:"1px 5px",fontWeight:600}}>📄 {inv}/{n}</span>
      <span title={`Paid: ${paid}/${n} item`} style={{fontSize:9,color:paid===n?C.purple:paid>0?C.purple:C.t3,background:paid>0?C.pSoft:C.bg,border:`1px solid ${paid===n?"#c4b5fd":paid>0?"#ddd6fe":C.border}`,borderRadius:3,padding:"1px 5px",fontWeight:600}}>✓ {paid}/{n}</span>
    </div>;
  };

  const handleCSV=e=>{
    const file=e.target.files[0];if(!file)return;setCsvLoading(true);
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const lines=ev.target.result.split("\n");const headers=parseCSVLine(lines[0]).map(h=>h.toLowerCase().trim());
        const newPOs=[];const newItems=[];
        for(let i=1;i<lines.length;i++){
          const row=parseCSVLine(lines[i]);if(row.length<3||!row[0]?.trim())continue;
          const get=name=>{const idx=headers.indexOf(name);return idx>=0?row[idx]?.trim()||"":"";};
          const orderNo=get("no po")||get("order no")||get("po number")||row[0];
          const company=get("company")||get("perusahaan")||get("customer")||row[1];
          if(!orderNo||!company)continue;
          let po=newPOs.find(p=>p.orderNo===orderNo);
          if(!po){po={id:"po"+uid(),quoteRef:get("quote ref")||get("no quotation")||"",orderNo,company,orderDate:parseSmartDate(get("order date")||get("tanggal")||"")||today(),prNo:get("pr no")||"",notes:get("notes")||get("catatan")||"",folder:"",status:mapPOSt(get("status")),priority:"normal",totalLocked:false,manualExPPN:parseIDR(get("ex ppn")||get("subtotal")||0),manualPPN:parseIDR(get("ppn")||0)};if(po.manualExPPN>0)po.totalLocked=true;newPOs.push(po);}
          const iName=get("item")||get("nama item")||get("description")||row[2];
          if(iName){const up=parseIDR(get("unit price")||get("harga")||get("price")||0);const qty=parseFloat(get("qty")||get("quantity")||1)||1;const disc=parseIDR(get("discount")||get("disc")||0);const discPct=parseFloat(get("disc%")||0);newItems.push(mkItem({id:"item"+uid(),poId:po.id,itemName:iName,desc:get("desc")||get("keterangan")||"",qty,unit:get("unit")||get("satuan")||"pcs",unitPrice:up,discount:discPct>0?Math.round(up*qty*discPct/100):disc,discountPct:discPct,status:mapItemSt(get("item status")||get("status item")||""),deliveryDate:parseSmartDate(get("delivery date")||get("tgl delivery")||""),invoiceNo:get("invoice no")||get("no invoice")||"",zoneType:get("zone")||get("zone type")||"",hsCode:get("hs code")||""}));}
        }
        newPOs.forEach(p=>onAdd(p,newItems.filter(i=>i.poId===p.id)));
        toast(`✓ Import selesai: ${newPOs.length} PO, ${newItems.length} item`);
      }catch(err){toast("✗ Import gagal: "+err.message);}
      setCsvLoading(false);e.target.value="";
    };
    reader.readAsText(file);
  };

  const bulkSetStatus=st=>{bulkSel.forEach(id=>{const p=pos.find(x=>x.id===id);if(p)onUpdate({...p,status:st});});setBulkSel(new Set());toast(`Status ${bulkSel.size} PO diubah`);};
  // FIX poin 2 — bulk delete PO
  const bulkDelete=()=>{ask(`Hapus ${bulkSel.size} PO beserta seluruh item dan DO-nya?`,()=>{[...bulkSel].forEach(id=>onDelete(id,true));setBulkSel(new Set());toast(`✓ ${bulkSel.size} PO dihapus`);},{danger:true,confirmLabel:"Ya, Hapus Semua"});};

  // FIX poin 1 — export includes progress columns
  const handleExportCSV=()=>{
    const h=["No PO","Quote Ref","Perusahaan","Tgl Order","Status PO","PR No","Ex PPN","PPN","Total","Item Terkirim","Item Invoiced","Item Paid","Total Item"];
    const r=sortedFiltered.map(p=>{const t=calcPOTotals(p,items);const pr=getPOProgress(p.id,items);return[p.orderNo,p.quoteRef,p.company,p.orderDate,INIT_PO_STATUS[p.status]?.label||p.status,p.prNo,t.exPPN,t.ppn,t.total,`${pr.del}/${pr.n}`,`${pr.inv}/${pr.n}`,`${pr.paid}/${pr.n}`,pr.n];});
    exportCSV(h,r,`PO_export_${today()}.csv`);
  };
  const handleCopyTSV=()=>{
    const h=["No PO","Quote Ref","Perusahaan","Tgl Order","Status PO","Total","Terkirim","Invoiced","Paid"];
    const r=sortedFiltered.map(p=>{const t=calcPOTotals(p,items);const pr=getPOProgress(p.id,items);return[p.orderNo,p.quoteRef,p.company,p.orderDate,INIT_PO_STATUS[p.status]?.label||p.status,t.total,`${pr.del}/${pr.n}`,`${pr.inv}/${pr.n}`,`${pr.paid}/${pr.n}`];});
    copyTSV(h,r,()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  return<div style={{display:"flex",flexDirection:"column",height:"100%",width:"100%"}}>
    <ConfirmModal/>
    {/* TOOLBAR */}
    <div style={{display:"flex",gap:8,padding:"12px 16px",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",alignItems:"center",flexShrink:0,background:C.surface}}>
      <div style={{position:"relative",flex:1,minWidth:160,maxWidth:300}}>
        <input id="po-search-input" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Cari PO, perusahaan, ref..." style={{...iB,paddingLeft:30,fontSize:12}}/>
        <Ico d={IC.search} size={14} color={C.t3} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}/>
        {search&&<button onClick={()=>{setSearch("");setPage(1);}} style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.t3}}><Ico d={IC.close} size={12}/></button>}
      </div>
      <Btn id="btn-new-po" size="sm" variant="primary" onClick={()=>{setEditPO(null);setShowForm(true);}}><Ico d={IC.plus} size={11}/> PO Baru</Btn>
      <Btn size="sm" variant="secondary" onClick={handleExportCSV}><Ico d={IC.export} size={11}/> CSV</Btn>
      <Btn size="sm" variant={copied?"success":"secondary"} onClick={handleCopyTSV}><Ico d={IC.copy} size={11}/>{copied?" Tersalin!":"Copy TSV"}</Btn>
      <label style={{cursor:"pointer"}}><Btn size="sm" variant="secondary" disabled={csvLoading}><Ico d={IC.import} size={11}/>{csvLoading?"Loading...":"Import CSV"}</Btn><input type="file" accept=".csv" onChange={handleCSV} style={{display:"none"}}/></label>
      {bulkSel.size>0&&<div style={{display:"flex",gap:6,alignItems:"center",padding:"4px 10px",background:C.bSoft,borderRadius:6,border:`1px solid ${C.bMid}`}}>
        <span style={{fontSize:11,color:C.blue,fontWeight:600}}>{bulkSel.size} dipilih</span>
        <select onChange={e=>{if(e.target.value){bulkSetStatus(e.target.value);}e.target.value="";}} style={{fontSize:10,border:`1px solid ${C.b2}`,borderRadius:4,padding:"2px 6px",cursor:"pointer",background:"#fff",color:C.text}}><option value="">Set Status...</option>{Object.entries(INIT_PO_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
        <Btn size="sm" variant="danger" onClick={bulkDelete}><Ico d={IC.trash} size={10}/> Hapus</Btn>
        <Btn size="sm" variant="ghost" onClick={()=>setBulkSel(new Set())}><Ico d={IC.close} size={10}/></Btn>
      </div>}
      <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>{sortedFiltered.length} PO</span>
    </div>
    {/* TABLE — FIX poin 6: full width */}
    <div style={{overflowX:"auto",flex:1,width:"100%"}}>
      <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto"}}>
        <thead><tr>
          <th style={{...th,width:36}}><input type="checkbox" checked={paged.length>0&&paged.every(p=>bulkSel.has(p.id))} onChange={e=>{const s=new Set(bulkSel);paged.forEach(p=>e.target.checked?s.add(p.id):s.delete(p.id));setBulkSel(s);}}/></th>
          {[["orderNo","No PO/Order"],["company","Perusahaan"],["orderDate","Tgl Order"],["status","Status"],["priority","Prior."],["items","Items/Progress"],["total","Total"],["zone","Zone"],["aging","Aging"]].map(([col,label])=><th key={col} style={th} onClick={col!=="aging"?()=>toggleSort(col):undefined}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>{label}{col!=="aging"&&<SortIco col={col}/>}<ColFilter col={col} rows={pos} keyFn={col==="zone"?p=>getPOZone(p.id,items):undefined} labelFn={col==="status"?p=>INIT_PO_STATUS[p.status]?.label||p.status:col==="zone"?p=>getPOZone(p.id,items):undefined} active={colF[col]} onApply={s=>setColF(p=>s?{...p,[col]:s}:(({[col]:_,...r})=>r)(p))}/></div>
          </th>)}
          <th style={{...th,width:90}}>Aksi</th>
        </tr></thead>
        <tbody>
          {!paged.length&&<tr><td colSpan={10} style={{padding:40,textAlign:"center",color:C.t3,fontSize:13}}>Tidak ada PO.</td></tr>}
          {paged.map(po=>{
            const tots=calcPOTotals(po,items);
            const over=isOverdue(po,settings.overdueDays);
            const isExp=exp===po.id;
            const poDosCount=(dos||[]).filter(d=>d.poId===po.id).length;
            const agingDays=po.orderDate&&po.orderDate!=="dd/mm/yyyy"?Math.floor((Date.now()-new Date(po.orderDate).getTime())/(86400000)):-1;
            return<>
              <tr key={po.id} style={{background:isExp?C.bSoft:bulkSel.has(po.id)?"#f0f9ff":"transparent",cursor:"pointer"}} onClick={()=>setExp(v=>v===po.id?null:po.id)} onMouseEnter={e=>!isExp&&(e.currentTarget.style.background=C.s2)} onMouseLeave={e=>!isExp&&(e.currentTarget.style.background=bulkSel.has(po.id)?"#f0f9ff":"transparent")}>
                <td style={td} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={bulkSel.has(po.id)} onChange={e=>{const s=new Set(bulkSel);e.target.checked?s.add(po.id):s.delete(po.id);setBulkSel(s);}}/></td>
                <td style={{...td,fontWeight:700}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <Ico d={isExp?IC.chevD:IC.chevR} size={12} color={C.t3}/>
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:C.text,...TR,maxWidth:160}} title={po.orderNo}>{po.orderNo}</span>
                        <button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(po.orderNo||"").then(()=>toast("✓ No. PO disalin"));}} title="Copy No. PO" style={{background:"none",border:"none",cursor:"pointer",padding:"1px 3px",color:C.t3,display:"inline-flex"}}><Ico d={IC.copy} size={10} color={C.t3}/></button>
                      </div>
                      {po.quoteRef&&<div style={{fontSize:9,color:C.t3,...TR,maxWidth:180}}>{po.quoteRef}</div>}
                      {poDosCount>0&&<div style={{fontSize:9,color:C.blue,marginTop:1}}>📋 {poDosCount} DO</div>}
                    </div>
                    {over&&<Ico d={IC.warn} size={12} color={C.amber} title="Overdue"/>}
                    {po.priority==="urgent"&&<Ico d={IC.fire} size={12} color={C.red} title="Urgent"/>}
                    {isIncompletePO(po)&&<span title="PO tidak lengkap: No. Order atau Tanggal belum diisi" style={{display:"inline-flex",alignItems:"center",gap:2,padding:"1px 5px",borderRadius:4,background:"#fff7ed",border:"1px solid #fed7aa",color:"#c2410c",fontSize:9,fontWeight:700,letterSpacing:".02em"}}>⚠ Incomplete</span>}
                  </div>
                </td>
                <td style={{...td,...TR,maxWidth:170}} title={po.company}>{po.company}</td>
                <td style={{...td,whiteSpace:"nowrap",fontFamily:"monospace",fontSize:11}}>{fmtDate(po.orderDate)}</td>
                <td style={td} onClick={e=>e.stopPropagation()}><SPill value={po.status} onChange={v=>onUpdate({...po,status:v})} cfg={INIT_PO_STATUS}/></td>
                <td style={td}><span style={{fontSize:10,color:po.priority==="urgent"?C.red:C.t2,fontWeight:600,textTransform:"capitalize"}}>{po.priority==="urgent"?"🔥 ":""}{po.priority}</span></td>
                <td style={td}>
                  <div style={{fontSize:12,fontWeight:700,color:C.blue}}>{items.filter(i=>i.poId===po.id).length} item</div>
                  <POProgress poId={po.id}/>
                </td>
                <td style={{...td,fontFamily:"monospace",fontWeight:700,whiteSpace:"nowrap"}}>{fmtShort(tots.total)}</td>
                <td style={{...td,fontSize:11,color:C.t2}}>{getPOZone(po.id,items)}</td>
                <td style={{...td}} onClick={e=>e.stopPropagation()}>
                  {agingDays>=0?<span style={{fontSize:11,fontWeight:700,color:agingColor(agingDays),background:agingBg(agingDays),padding:"2px 7px",borderRadius:5,whiteSpace:"nowrap"}}>{agingDays}h</span>:<span style={{fontSize:10,color:C.t3}}>–</span>}
                </td>
                <td style={td} onClick={e=>e.stopPropagation()}>
                  <div style={{display:"flex",gap:3}}>
                    <Btn size="sm" variant="ghost" title="Edit PO" onClick={()=>{setEditPO(po);setShowForm(true);}}><Ico d={IC.edit} size={11}/></Btn>
                    <Btn size="sm" variant="ghost" title="Buat DO" onClick={()=>setDoTarget(po)}><Ico d={IC.truck} size={11} color={C.blue}/></Btn>
                    <Btn size="sm" variant="ghost" title="Duplikat PO" onClick={e=>{e.stopPropagation();const nid=uid();const nPO={...po,id:nid,orderNo:"Order",orderDate:today(),status:"new",createdAt:today()};const nItems=items.filter(i=>i.poId===po.id).map(i=>({...i,id:uid(),poId:nid,status:"ordered",doNos:[],deliveryDate:"",invoiceNo:""}));onAdd(nPO,nItems);toast("✓ PO diduplikat");}}>⧉</Btn>
                    <Btn size="sm" variant="danger" title="Hapus PO" onClick={()=>ask(`Hapus PO "${po.orderNo}" beserta ${items.filter(i=>i.poId===po.id).length} item?`,()=>onDelete(po.id),{danger:true,confirmLabel:"Ya, Hapus"})}><Ico d={IC.trash} size={11}/></Btn>
                  </div>
                </td>
              </tr>
              {isExp&&<tr key={po.id+"_exp"}>
                <td colSpan={11} style={{padding:0}}>
                  <ExpandedRow po={po} items={items} suppliers={suppliers} dos={dos} zoneTypes={zoneTypes} settings={settings} hsDB={hsDB}
                    onUpdateItem={onUpdateItem}
                    onDeleteItems={onDeleteItems}
                    onConfirmDelete={(ids,cb)=>ask(`Hapus ${ids.length} item?`,()=>{ids.forEach(id=>onDeleteItems(id));cb();},{danger:true,confirmLabel:"Ya, Hapus"})}
                    onAddItem={onAddItem} onOpenDO={p=>setDoTarget(p)} onAddSupplier={onAddSupplier} onDeleteDO={onDeleteDO}/>
                </td>
              </tr>}
            </>;
          })}
        </tbody>
      </table>
    </div>
    <Pagination total={sortedFiltered.length} page={page} perPage={PAGE_SIZE} onChange={setPage}/>
    {showForm&&<POForm initial={editPO} companies={companies} items={items} suppliers={suppliers} dos={dos} zoneTypes={zoneTypes} settings={settings} onAddSupplier={onAddSupplier} onSave={(po,draftItems)=>{onAdd(po,draftItems);setShowForm(false);toast(`✓ PO ${po.orderNo} disimpan`);}} onClose={()=>setShowForm(false)}/>}
    {/* FIX BUG A — DOGeneratorModal wired properly with onSaveDO */}
    {doTarget&&<DOGeneratorModal po={doTarget} items={items} dos={dos} settings={settings} onClose={()=>setDoTarget(null)} onSaveDO={doObj=>{onSaveDO(doObj);toast(`✓ DO ${doObj.doNo} disimpan`);}}/>}
  </div>;
}

/* ══ §14 ALL ITEMS ═══════════════════════════════════════════ */
function AllItems({items,pos,suppliers,dos,zoneTypes,settings,onUpdateItem,onDeleteItem}){
  const[search,setSearch]=useState("");const[page,setPage]=useState(1);
  const[colF,setColF]=useState({});const[copied,setCopied]=useState(false);
  const[sort,setSort]=useState({col:"itemName",dir:"asc"});
  const[bulkSel,setBulkSel]=useState(new Set());
  const{ask,ConfirmModal}=useConfirm();
  const setFCol=k=>s=>setColF(p=>s?{...p,[k]:s}:(({[k]:_,...r})=>r)(p));
  const filtered=useMemo(()=>{
    let r=items.filter(i=>{
      if(search){const q=search.toLowerCase();if(!(i.itemName?.toLowerCase().includes(q)||i.desc?.toLowerCase().includes(q)||i.invoiceNo?.toLowerCase().includes(q)||(i.doNos||[]).some(d=>d.toLowerCase().includes(q))))return false;}
      for(const[col,s]of Object.entries(colF)){if(!s||!s.size)continue;let v="";if(col==="status")v=i.status;else if(col==="zoneType")v=i.zoneType||"";else if(col==="unit")v=i.unit;else if(col==="company")v=pos.find(p=>p.id===i.poId)?.company||"";if(!s.has(v))return false;}
      return true;
    });
    return[...r].sort((a,b)=>{let av=a[sort.col]??"",bv=b[sort.col]??"";if(sort.col==="net")av=itemNet(a),bv=itemNet(b);if(sort.col==="margin"){av=itemMargin(a)??-Infinity;bv=itemMargin(b)??-Infinity;}const d=typeof av==="number"?av-bv:String(av).localeCompare(String(bv));return sort.dir==="asc"?d:-d;});
  },[items,pos,search,colF,sort]);
  const paged=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const ts=col=>{setSort(s=>s.col===col?{col,dir:s.dir==="asc"?"desc":"asc"}:{col,dir:"asc"});setPage(1);};
  const SortI=({col})=>sort.col===col?<Ico d={sort.dir==="asc"?IC.sortU:IC.sortD} size={9} color={C.blue}/>:<Ico d={IC.sortN} size={9} color={C.b2}/>;
  const th={padding:"9px 8px",fontSize:9,fontWeight:700,color:C.t2,textAlign:"left",whiteSpace:"nowrap",borderBottom:`2px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".04em",background:C.s2,cursor:"pointer",userSelect:"none"};
  const td={padding:"8px 8px",borderBottom:`1px solid ${C.border}`,fontSize:12,verticalAlign:"middle"};

  // FIX poin 2 — bulk delete items
  const handleBulkDelete=()=>ask(`Hapus ${bulkSel.size} item terpilih?`,()=>{[...bulkSel].forEach(id=>onDeleteItem(id));setBulkSel(new Set());},{danger:true,confirmLabel:"Ya, Hapus"});
  const handleCopy=()=>{
    const h=["Item","Qty","Unit","Harga Jual","Net","Beli","Margin","Status","Tgl Delivery","Invoice","DO Nos","Zone","PO","Perusahaan"];
    const r=filtered.map(i=>{const po=pos.find(p=>p.id===i.poId);const m=itemMargin(i);return[i.itemName,i.qty,i.unit,i.unitPrice,itemNet(i),itemBuy(i),m??"-",ITEM_STATUS[i.status]?.label||i.status,i.deliveryDate,i.invoiceNo,(i.doNos||[]).join(";"),i.zoneType,po?.orderNo||"",po?.company||""];});
    copyTSV(h,r,()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  return<div style={{display:"flex",flexDirection:"column",height:"100%",width:"100%"}}>
    <ConfirmModal/>
    <div style={{display:"flex",gap:8,padding:"12px 16px",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",alignItems:"center",flexShrink:0,background:C.surface}}>
      <div style={{position:"relative",flex:1,minWidth:160,maxWidth:300}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Cari item, invoice, DO..." style={{...iB,paddingLeft:30,fontSize:12}}/>
        <Ico d={IC.search} size={14} color={C.t3} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}/>
      </div>
      {bulkSel.size>0&&<div style={{display:"flex",gap:6,alignItems:"center",padding:"4px 10px",background:C.rSoft,borderRadius:6,border:`1px solid ${C.rMid}`}}>
        <span style={{fontSize:11,color:C.red,fontWeight:600}}>{bulkSel.size} dipilih</span>
        <Btn size="sm" variant="danger" onClick={handleBulkDelete}><Ico d={IC.trash} size={10}/> Hapus</Btn>
        <Btn size="sm" variant="ghost" onClick={()=>setBulkSel(new Set())}><Ico d={IC.close} size={10}/></Btn>
      </div>}
      <Btn size="sm" variant={copied?"success":"secondary"} onClick={handleCopy}><Ico d={IC.copy} size={11}/>{copied?" Tersalin!":"Copy TSV"}</Btn>
      <Btn size="sm" variant="secondary" onClick={()=>exportCSV(["Item","Qty","Unit","Harga","Net","Status","Delivery","Invoice","DO","Zone","PO"],filtered.map(i=>{const po=pos.find(p=>p.id===i.poId);return[i.itemName,i.qty,i.unit,i.unitPrice,itemNet(i),ITEM_STATUS[i.status]?.label||i.status,i.deliveryDate,i.invoiceNo,(i.doNos||[]).join(";"),i.zoneType,po?.orderNo||""];}),`Items_${today()}.csv`)}><Ico d={IC.export} size={11}/> CSV</Btn>
      <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>{filtered.length} item</span>
    </div>
    <div style={{overflowX:"auto",flex:1,width:"100%"}}>
      <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto"}}>
        <thead><tr>
          <th style={{...th,width:36}}><input type="checkbox" checked={paged.length>0&&paged.every(i=>bulkSel.has(i.id))} onChange={e=>{const s=new Set(bulkSel);paged.forEach(i=>e.target.checked?s.add(i.id):s.delete(i.id));setBulkSel(s);}}/></th>
          {[["itemName","Item"],["qty","Qty"],["unit","Unit"],["unitPrice","Harga"],["net","Net"],["status","Status"],["deliveryDate","Delivery"],["invoiceNo","Invoice"],["doNos","DO"],["zoneType","Zone"],["company","Perusahaan"]].map(([col,label])=><th key={col} style={th} onClick={()=>ts(col)}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>{label}<SortI col={col}/><ColFilter col={col} rows={filtered} keyFn={col==="company"?i=>pos.find(p=>p.id===i.poId)?.company||"":undefined} labelFn={col==="company"?i=>pos.find(p=>p.id===i.poId)?.company||"–":col==="status"?i=>ITEM_STATUS[i.status]?.label||i.status:undefined} active={colF[col]} onApply={setFCol(col)}/></div>
          </th>)}
          <th style={th}>Aksi</th>
        </tr></thead>
        <tbody>
          {!paged.length&&<tr><td colSpan={13} style={{padding:40,textAlign:"center",color:C.t3}}>Tidak ada item.</td></tr>}
          {paged.map((item,i)=>{
            const po=pos.find(p=>p.id===item.poId);
            const mg=itemMargin(item);const qDel=getQtyDel(item.id,dos);
            const itemDOs=(dos||[]).filter(d=>(d.lines||[]).some(l=>l.itemId===item.id));
            return<tr key={item.id} style={{background:bulkSel.has(item.id)?"#eff6ff":i%2===0?"#fff":C.s2}}>
              <td style={td}><input type="checkbox" checked={bulkSel.has(item.id)} onChange={()=>{const s=new Set(bulkSel);s.has(item.id)?s.delete(item.id):s.add(item.id);setBulkSel(s);}}/></td>
              <td style={{...td,fontWeight:600,...TR,maxWidth:180}} title={item.itemName}>{item.itemName}</td>
              <td style={{...td,fontFamily:"monospace"}}>{item.qty}{qDel>0&&<span style={{fontSize:9,color:C.green,marginLeft:3}}>({qDel}↑)</span>}</td>
              <td style={{...td,color:C.t2}}>{item.unit}</td>
              <td style={{...td,fontFamily:"monospace",whiteSpace:"nowrap"}}>{fmt(item.unitPrice)}</td>
              <td style={{...td,fontFamily:"monospace",fontWeight:700,color:C.blue,whiteSpace:"nowrap"}}>{fmt(itemNet(item))}</td>
              <td style={td} onClick={e=>e.stopPropagation()}><SPill value={item.status} onChange={v=>onUpdateItem({...item,status:v})} cfg={ITEM_STATUS} mini/></td>
              <td style={{...td,whiteSpace:"nowrap"}}><InlineCell value={item.deliveryDate} onSave={v=>onUpdateItem({...item,deliveryDate:v})} isDate placeholder="–"/></td>
              <td style={{...td,...TR,maxWidth:120}}><InlineCell value={item.invoiceNo} onSave={v=>onUpdateItem({...item,invoiceNo:v})} mono placeholder="INV..."/></td>
              <td style={td}>
                {/* FIX poin 8 — DO with date in AllItems */}
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {itemDOs.map(d=>{const line=d.lines.find(l=>l.itemId===item.id);return<div key={d.id} style={{display:"flex",flexDirection:"column"}}>
                    <span style={{fontSize:9,fontFamily:"monospace",color:C.blue,background:C.bSoft,borderRadius:3,padding:"0 4px",whiteSpace:"nowrap"}}>{d.doNo}</span>
                    <span style={{fontSize:8,color:C.t3}}>{fmtDate(d.deliveryDate)} · {line?.qtyDelivered} {item.unit}</span>
                  </div>;})}
                  {!itemDOs.length&&<span style={{fontSize:9,color:C.t3}}>–</span>}
                </div>
              </td>
              <td style={{...td,fontSize:11,color:C.t2,...TR,maxWidth:110}}>{item.zoneType||"–"}</td>
              <td style={{...td,...TR,maxWidth:150}} title={po?.company}>{po?.company||"–"}</td>
              <td style={{...td,fontFamily:"monospace",fontWeight:700,color:mg===null?C.t3:mg>=0?C.green:C.red,whiteSpace:"nowrap"}}>{mg===null?"–":fmtShort(mg)}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <Pagination total={filtered.length} page={page} perPage={PAGE_SIZE} onChange={setPage}/>
  </div>;
}

/* ══ §15 DASHBOARD ═══════════════════════════════════════════ */
function Dashboard({pos,items,dos,suppliers,settings,onJump}){
  const overduePOs=pos.filter(p=>isOverdue(p,settings.overdueDays));
  const urgentPOs=pos.filter(p=>p.priority==="urgent"&&!["paid","cancelled"].includes(p.status));
  const incompletePOs=pos.filter(p=>isIncompletePO(p));
  const totalRev=pos.reduce((s,p)=>s+calcPOTotals(p,items).total,0);
  const totalExPPN=pos.reduce((s,p)=>s+calcPOTotals(p,items).exPPN,0);
  const totalMargin=items.reduce((s,i)=>{const m=itemMargin(i);return m!==null?s+m:s;},0);
  const unpaidPOs=pos.filter(p=>!["paid","cancelled"].includes(p.status));
  const pendingItems=items.filter(i=>["pending","ordered","partial"].includes(i.status));
  const kpis=[
    {label:"PO Aktif",val:unpaidPOs.length,sub:`dari ${pos.length} total PO`,icon:IC.po,color:C.blue,bg:C.bSoft},
    {label:"Total Revenue",val:fmtShort(totalRev),sub:`Ex PPN: ${fmtShort(totalExPPN)}`,icon:IC.stats,color:C.green,bg:C.gSoft},
    {label:"Est. Margin",val:fmtShort(totalMargin),sub:`${fmtPct(totalMargin,totalExPPN)} dari revenue`,icon:IC.trend,color:C.orange,bg:"#fff7ed"},
    {label:"Item Belum Selesai",val:pendingItems.length,sub:`dari ${items.length} item`,icon:IC.box,color:C.purple,bg:C.pSoft},
    {label:"Surat Jalan",val:dos.length,sub:`${[...new Set(dos.map(d=>d.poId))].length} PO ada DO`,icon:IC.truck,color:C.amber,bg:C.aSoft},
    ...(incompletePOs.length>0?[{label:"PO Tidak Lengkap",val:incompletePOs.length,sub:"No. Order / Tanggal kosong",icon:IC.warn,color:"#c2410c",bg:"#fff7ed"}]:[]),
  ];
  const byCo=useMemo(()=>{const m={};pos.forEach(p=>{const t=calcPOTotals(p,items).total;m[p.company]=(m[p.company]||0)+t;});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,7);},[pos,items]);
  const byStatus=useMemo(()=>Object.entries(INIT_PO_STATUS).map(([k,v])=>({k,label:v.label,count:pos.filter(p=>p.status===k).length,color:v.color})).filter(x=>x.count>0),[pos]);
  const maxCo=byCo.length?byCo[0][1]:1;
  return<div style={{padding:20,overflowY:"auto",height:"100%",width:"100%"}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:20}}>
      {kpis.map(k=><div key={k.label} style={{background:k.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",...SH}}>
        <div style={{width:34,height:34,borderRadius:8,background:`${k.color}18`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}><Ico d={k.icon} size={16} color={k.color}/></div>
        <div style={{fontSize:20,fontWeight:800,color:k.color,lineHeight:1}}>{k.val}</div>
        <div style={{fontSize:11,fontWeight:600,color:C.t2,marginTop:3}}>{k.label}</div>
        <div style={{fontSize:10,color:C.t3,marginTop:2}}>{k.sub}</div>
      </div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16,...SH}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>Revenue per Perusahaan</div>
        {byCo.map(([co,val])=><div key={co} style={{marginBottom:9}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
            <span style={{fontSize:11,color:C.t2,...TR,maxWidth:240}} title={co}>{co}</span>
            <span style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"monospace",flexShrink:0,marginLeft:8}}>{fmtShort(val)}</span>
          </div>
          <div style={{height:5,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(val/maxCo)*100}%`,background:C.blue,borderRadius:3}}/></div>
        </div>)}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16,...SH}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>Status PO</div>
        {byStatus.map(s=><div key={s.k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:s.color,flexShrink:0}}/>
          <span style={{fontSize:11,color:C.t2,flex:1}}>{s.label}</span>
          <span style={{fontSize:13,fontWeight:700,color:C.text,width:24,textAlign:"right"}}>{s.count}</span>
        </div>)}
      </div>
    </div>
    {(overduePOs.length>0||urgentPOs.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {overduePOs.length>0&&<div style={{background:C.aSoft,border:"1px solid #fde68a",borderRadius:10,padding:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Ico d={IC.warn} size={14} color={C.amber}/><span style={{fontSize:12,fontWeight:700,color:C.amber}}>Overdue ({overduePOs.length})</span></div>
        {overduePOs.slice(0,5).map(p=><div key={p.id} onClick={()=>onJump("po",p.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,cursor:"pointer",padding:"4px 6px",borderRadius:5}} onMouseEnter={e=>e.currentTarget.style.background="#fef3c7"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div><div style={{fontSize:11,fontWeight:600,...TR,maxWidth:170}}>{p.orderNo}</div><div style={{fontSize:9,color:C.t2,...TR,maxWidth:170}}>{p.company}</div></div>
          <span style={{fontSize:10,fontFamily:"monospace",color:C.amber,background:"#fef3c7",borderRadius:4,padding:"1px 6px",flexShrink:0}}>{diffDays(p.orderDate)}h</span>
        </div>)}
      </div>}
      {urgentPOs.length>0&&<div style={{background:C.rSoft,border:`1px solid ${C.rMid}`,borderRadius:10,padding:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Ico d={IC.fire} size={14} color={C.red}/><span style={{fontSize:12,fontWeight:700,color:C.red}}>Urgent ({urgentPOs.length})</span></div>
        {urgentPOs.slice(0,5).map(p=><div key={p.id} onClick={()=>onJump("po",p.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,cursor:"pointer",padding:"4px 6px",borderRadius:5}} onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div><div style={{fontSize:11,fontWeight:600,...TR,maxWidth:170}}>{p.orderNo}</div><div style={{fontSize:9,color:C.t2,...TR,maxWidth:170}}>{p.company}</div></div>
          <SBadge status={p.status} cfg={INIT_PO_STATUS}/>
        </div>)}
      </div>}
      {incompletePOs.length>0&&<div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10,padding:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Ico d={IC.warn} size={14} color="#c2410c"/><span style={{fontSize:12,fontWeight:700,color:"#c2410c"}}>PO Tidak Lengkap ({incompletePOs.length})</span></div>
        <div style={{fontSize:10,color:"#9a3412",marginBottom:8}}>No. Order atau Tanggal belum diisi</div>
        {incompletePOs.slice(0,5).map(p=>{const missing=[];if(!p.orderNo||!p.orderNo.trim()||p.orderNo.trim()==="Order")missing.push("No. Order");if(!p.orderDate||p.orderDate==="dd/mm/yyyy")missing.push("Tanggal");if(!p.company||!p.company.trim())missing.push("Perusahaan");return<div key={p.id} onClick={()=>onJump("po",p.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,cursor:"pointer",padding:"4px 6px",borderRadius:5}} onMouseEnter={e=>e.currentTarget.style.background="#fed7aa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div><div style={{fontSize:11,fontWeight:600,...TR,maxWidth:170}}>{p.orderNo||"(No. kosong)"}</div><div style={{fontSize:9,color:"#9a3412",...TR,maxWidth:170}}>{p.company||"(Perusahaan kosong)"}</div></div>
          <span style={{fontSize:9,color:"#c2410c",fontWeight:700,whiteSpace:"nowrap"}}>{missing.join(", ")}</span>
        </div>;})}
      </div>}
    </div>}
  </div>;
}

/* ══ §16 SUPPLIER PAGE ═══════════════════════════════════════ */
// FIX poin 7 — rich supplier detail with full item table
function SupplierPage({suppliers,items,pos,dos,onAdd,onUpdate,onArchive,toast}){
  const[tab,setTab]=useState("aktif");const[search,setSearch]=useState("");
  const[tagFilter,setTagFilter]=useState("");const[exp,setExp]=useState(null);
  const[showForm,setShowForm]=useState(false);const[editSup,setEditSup]=useState(null);
  const[bulkSel,setBulkSel]=useState(new Set());
  const{ask,ConfirmModal}=useConfirm();
  const list=suppliers.filter(s=>(tab==="aktif"?!s.deletedAt:s.deletedAt)&&(!search||s.name.toLowerCase().includes(search.toLowerCase())||s.tags?.some(t=>t.includes(search.toLowerCase())))&&(!tagFilter||s.tags?.includes(tagFilter)));
  const allTags=[...new Set(suppliers.flatMap(s=>s.tags||[]))].sort();
  // Get items where this supplier is assigned (any role)
  const supItems=id=>items.filter(i=>(i.supplierAssignments||[]).some(a=>a.supplierId===id));
  const supAsgn=(item,supId)=>(item.supplierAssignments||[]).find(a=>a.supplierId===supId);
  // FIX poin 2 — bulk archive for suppliers
  const handleBulkArchive=()=>ask(`Arsipkan ${bulkSel.size} supplier?`,()=>{[...bulkSel].forEach(id=>onArchive(id));setBulkSel(new Set());toast(`✓ ${bulkSel.size} supplier diarsipkan`);},{confirmLabel:"Ya, Arsipkan"});

  return<div style={{display:"flex",flexDirection:"column",height:"100%",width:"100%"}}>
    <ConfirmModal/>
    <div style={{display:"flex",gap:8,padding:"12px 16px",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",alignItems:"center",flexShrink:0,background:C.surface}}>
      <div style={{display:"flex",gap:0,background:C.bg,borderRadius:6,padding:2,border:`1px solid ${C.border}`}}>
        {["aktif","arsip"].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"5px 14px",borderRadius:5,border:"none",background:tab===t?C.surface:"transparent",fontWeight:600,fontSize:11,cursor:"pointer",color:tab===t?C.text:C.t3,textTransform:"capitalize",...(tab===t?SH:{})}}>{t}</button>)}
      </div>
      <div style={{position:"relative",flex:1,minWidth:150,maxWidth:280}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari supplier..." style={{...iB,paddingLeft:28,fontSize:12}}/>
        <Ico d={IC.search} size={13} color={C.t3} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)"}}/>
      </div>
      {allTags.length>0&&<select value={tagFilter} onChange={e=>setTagFilter(e.target.value)} style={{...iB,width:"auto",fontSize:11,padding:"5px 8px"}}><option value="">Filter tag...</option>{allTags.map(t=><option key={t} value={t}>{t}</option>)}</select>}
      <Btn size="sm" onClick={()=>{setEditSup(null);setShowForm(true);}}><Ico d={IC.plus} size={11}/> Tambah</Btn>
      {bulkSel.size>0&&<div style={{display:"flex",gap:6,alignItems:"center",padding:"4px 10px",background:C.aSoft,borderRadius:6,border:"1px solid #fde68a"}}>
        <span style={{fontSize:11,color:C.amber,fontWeight:600}}>{bulkSel.size} dipilih</span>
        <Btn size="sm" variant="amber" onClick={handleBulkArchive}><Ico d={IC.archive} size={10}/> Arsipkan</Btn>
        <Btn size="sm" variant="ghost" onClick={()=>setBulkSel(new Set())}><Ico d={IC.close} size={10}/></Btn>
      </div>}
      <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>{list.length} supplier</span>
    </div>
    <div style={{overflowY:"auto",flex:1,padding:16}}>
      {!list.length&&<div style={{padding:40,textAlign:"center",color:C.t3}}>Tidak ada supplier.</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
        {list.map(s=>{
          const isExp=exp===s.id;
          const sitems=supItems(s.id);
          const mainItems=sitems.filter(i=>supAsgn(i,s.id)?.role==="main");
          const backupItems=sitems.filter(i=>supAsgn(i,s.id)?.role==="backup");
          const totalBeli=mainItems.reduce((sum,i)=>{const a=supAsgn(i,s.id);return sum+(a?.pricePerUnit||0)*(i.qty||0)+(a?.shippingTotal||0);},0);
          const totalJual=mainItems.reduce((sum,i)=>sum+itemNet(i),0);
          return<div key={s.id} style={{background:C.surface,border:`2px solid ${isExp?C.blue:bulkSel.has(s.id)?"#fde68a":C.border}`,borderRadius:10,...SH,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",cursor:"pointer",background:isExp?C.bSoft:"transparent",display:"flex",alignItems:"flex-start",gap:10}} onClick={()=>setExp(v=>v===s.id?null:s.id)}>
              <input type="checkbox" checked={bulkSel.has(s.id)} onClick={e=>e.stopPropagation()} onChange={()=>{const ns=new Set(bulkSel);ns.has(s.id)?ns.delete(s.id):ns.add(s.id);setBulkSel(ns);}} style={{marginTop:2,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.text,...TR,maxWidth:220}}>{s.name}</div>
                  <Ico d={isExp?IC.chevD:IC.chevR} size={13} color={C.t3}/>
                </div>
                {s.contact&&<div style={{fontSize:10,color:C.t2,marginTop:2}}>{s.contact}</div>}
                {s.tags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{s.tags.map(t=><TagChip key={t} label={t}/>)}</div>}
                <div style={{display:"flex",gap:10,marginTop:8,fontSize:10,color:C.t2}}>
                  <span>Utama: <strong style={{color:C.blue}}>{mainItems.length}</strong></span>
                  <span>Backup: <strong style={{color:C.t2}}>{backupItems.length}</strong></span>
                  {totalBeli>0&&<span>Beli: <strong style={{color:C.orange}}>{fmtShort(totalBeli)}</strong></span>}
                </div>
              </div>
            </div>
            {isExp&&<div style={{borderTop:`1px solid ${C.border}`}}>
              {/* Contact info */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"10px 16px",background:C.s2,borderBottom:`1px solid ${C.border}`}}>
                {s.phone&&<div style={{fontSize:10,color:C.t2}}><span style={{color:C.t3,marginRight:4}}>📞</span>{s.phone}</div>}
                {s.email&&<div style={{fontSize:10,color:C.t2}}><span style={{color:C.t3,marginRight:4}}>✉</span>{s.email}</div>}
                {s.address&&<div style={{fontSize:10,color:C.t2,gridColumn:"span 2"}}><span style={{color:C.t3,marginRight:4}}>📍</span>{s.address}</div>}
                {s.notes&&<div style={{fontSize:10,color:C.t3,fontStyle:"italic",gridColumn:"span 2"}}>{s.notes}</div>}
              </div>
              {/* FIX poin 7 — Full item detail table */}
              {sitems.length>0&&<div style={{padding:"10px 0"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.t2,padding:"0 16px 6px",textTransform:"uppercase",letterSpacing:".06em"}}>Item dari Supplier Ini ({sitems.length})</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr style={{background:C.s2}}>
                      {["Nama Item","PO","Customer","Role","Harga Beli/unit","Ongkir","Total Beli","Harga Jual","Net","Margin","Status"].map(h=><th key={h} style={{padding:"5px 10px",fontSize:9,fontWeight:700,color:C.t2,borderBottom:`1px solid ${C.border}`,textAlign:"left",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".04em"}}>{h}</th>)}
                    </tr></thead>
                    <tbody>{sitems.map((item,idx)=>{
                      const po=pos.find(p=>p.id===item.poId);
                      const a=supAsgn(item,s.id);
                      const isMain=a?.role==="main";
                      const buyPU=(a?.pricePerUnit||0)+((a?.shippingTotal||0)/Math.max(item.qty||1,1));
                      const totalB=(a?.pricePerUnit||0)*(item.qty||0)+(a?.shippingTotal||0);
                      const mg=isMain?itemNet(item)-totalB:null;
                      return<tr key={item.id} style={{background:idx%2===0?"#fff":C.s2}}>
                        <td style={{padding:"6px 10px",fontWeight:600,...TR,maxWidth:150}} title={item.itemName}>{item.itemName}<div style={{fontSize:9,color:C.t3,fontWeight:400}}>{item.qty} {item.unit}</div></td>
                        <td style={{padding:"6px 10px",fontSize:10,fontFamily:"monospace",color:C.blue,...TR,maxWidth:130}} title={po?.orderNo}>{po?.orderNo||"–"}</td>
                        <td style={{padding:"6px 10px",fontSize:10,...TR,maxWidth:120}} title={po?.company}>{po?.company||"–"}</td>
                        <td style={{padding:"6px 10px"}}><span style={{fontSize:9,fontWeight:700,color:isMain?C.blue:C.t2,background:isMain?C.bSoft:C.bg,borderRadius:3,padding:"1px 6px",textTransform:"uppercase"}}>{a?.role||"–"}</span></td>
                        <td style={{padding:"6px 10px",fontFamily:"monospace",whiteSpace:"nowrap"}}>{fmt(a?.pricePerUnit||0)}</td>
                        <td style={{padding:"6px 10px",fontFamily:"monospace",color:C.t2,whiteSpace:"nowrap"}}>{(a?.shippingTotal||0)>0?fmt(a.shippingTotal):"–"}</td>
                        <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:700,color:C.orange,whiteSpace:"nowrap"}}>{isMain?fmt(totalB):"–"}</td>
                        <td style={{padding:"6px 10px",fontFamily:"monospace",whiteSpace:"nowrap"}}>{fmt(item.unitPrice)}</td>
                        <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:700,color:C.blue,whiteSpace:"nowrap"}}>{fmt(itemNet(item))}</td>
                        <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:700,color:mg===null?C.t3:mg>=0?C.green:C.red,whiteSpace:"nowrap"}}>{mg===null?"–":fmt(mg)}</td>
                        <td style={{padding:"6px 10px"}}><SBadge status={item.status} cfg={ITEM_STATUS}/></td>
                      </tr>;
                    })}</tbody>
                    {mainItems.length>0&&<tfoot><tr style={{background:"#f0f9ff"}}>
                      <td colSpan={6} style={{padding:"6px 10px",fontSize:10,fontWeight:700,color:C.blue}}>TOTAL (item utama)</td>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:700,color:C.orange,whiteSpace:"nowrap"}}>{fmt(totalBeli)}</td>
                      <td/>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:700,color:C.blue,whiteSpace:"nowrap"}}>{fmt(totalJual)}</td>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:700,color:totalJual-totalBeli>=0?C.green:C.red,whiteSpace:"nowrap"}}>{fmt(totalJual-totalBeli)}</td>
                      <td/>
                    </tr></tfoot>}
                  </table>
                </div>
              </div>}
              {!sitems.length&&<div style={{padding:"12px 16px",fontSize:11,color:C.t3,fontStyle:"italic"}}>Belum ada item dari supplier ini.</div>}
              <div style={{display:"flex",gap:6,padding:"10px 16px",borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
                <Btn size="sm" variant="blue" onClick={()=>{setEditSup(s);setShowForm(true);}}><Ico d={IC.edit} size={10}/> Edit</Btn>
                {tab==="aktif"?<Btn size="sm" variant="amber" onClick={()=>{onArchive(s.id);toast(`✓ ${s.name} diarsipkan`);}}><Ico d={IC.archive} size={10}/> Arsipkan</Btn>:<Btn size="sm" variant="success" onClick={()=>{onUpdate({...s,deletedAt:null});toast(`✓ ${s.name} dipulihkan`);}}><Ico d={IC.restore} size={10}/> Pulihkan</Btn>}
              </div>
            </div>}
          </div>;
        })}
      </div>
    </div>
    {showForm&&<SupplierFormModal initial={editSup} onSave={s=>{editSup?onUpdate(s):onAdd(s);setShowForm(false);toast(`✓ Supplier ${s.name} disimpan`);}} onClose={()=>setShowForm(false)}/>}
  </div>;
}

/* ══ §17 MARGIN ANALYSIS ═════════════════════════════════════ */
function MarginAnalysis({items,pos,suppliers}){
  const[groupBy,setGroupBy]=useState("po");const[search,setSearch]=useState("");const[copied,setCopied]=useState(false);
  const groups=useMemo(()=>{
    const m={};
    items.forEach(i=>{
      const po=pos.find(p=>p.id===i.poId);
      const q=search.toLowerCase();
      if(search&&!(i.itemName?.toLowerCase().includes(q)||po?.company?.toLowerCase().includes(q)||po?.orderNo?.toLowerCase().includes(q)))return;
      let key="";
      if(groupBy==="po")key=po?.orderNo||i.poId;
      else if(groupBy==="company")key=po?.company||"–";
      else if(groupBy==="supplier"){const main=(i.supplierAssignments||[]).find(a=>a.role==="main");key=suppliers.find(s=>s.id===main?.supplierId)?.name||"Tanpa Supplier";}
      if(!m[key])m[key]={key,items:[],net:0,buy:0,margin:0,noPrice:0};
      const n=itemNet(i);const b=itemBuy(i);const mg=itemMargin(i);
      m[key].items.push(i);m[key].net+=n;m[key].buy+=b;if(mg!==null)m[key].margin+=mg;else m[key].noPrice++;
    });
    return Object.values(m).sort((a,b)=>b.net-a.net);
  },[items,pos,suppliers,groupBy,search]);
  const totNet=groups.reduce((s,g)=>s+g.net,0);const totBuy=groups.reduce((s,g)=>s+g.buy,0);const totMg=groups.reduce((s,g)=>s+g.margin,0);
  const th={padding:"9px 10px",fontSize:9,fontWeight:700,color:C.t2,textAlign:"left",borderBottom:`2px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".04em",background:C.s2};
  const td={padding:"9px 10px",borderBottom:`1px solid ${C.border}`,fontSize:12,verticalAlign:"middle"};
  return<div style={{display:"flex",flexDirection:"column",height:"100%",width:"100%"}}>
    <div style={{display:"flex",gap:8,padding:"12px 16px",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",alignItems:"center",flexShrink:0,background:C.surface}}>
      <div style={{display:"flex",gap:0,background:C.bg,borderRadius:6,padding:2,border:`1px solid ${C.border}`}}>
        {[["po","Per PO"],["company","Per Perusahaan"],["supplier","Per Supplier"]].map(([k,l])=><button key={k} onClick={()=>setGroupBy(k)} style={{padding:"5px 12px",borderRadius:5,border:"none",background:groupBy===k?C.surface:"transparent",fontWeight:600,fontSize:11,cursor:"pointer",color:groupBy===k?C.text:C.t3,...(groupBy===k?SH:{})}}>{l}</button>)}
      </div>
      <div style={{position:"relative",flex:1,minWidth:140,maxWidth:260}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter..." style={{...iB,paddingLeft:28,fontSize:12}}/>
        <Ico d={IC.search} size={13} color={C.t3} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)"}}/>
      </div>
      <Btn size="sm" variant={copied?"success":"secondary"} onClick={()=>{const h=["Kelompok","Net Jual","Beli","Margin","Margin %","Items"];const r=groups.map(g=>[g.key,g.net,g.buy,g.margin,g.net?`${(g.margin/g.net*100).toFixed(1)}%`:"–",g.items.length]);copyTSV(h,r,()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}}><Ico d={IC.copy} size={11}/>{copied?" Tersalin!":"Copy TSV"}</Btn>
      <Btn size="sm" variant="secondary" onClick={()=>exportCSV(["Kelompok","Net Jual","Beli","Margin","Margin %","Items"],groups.map(g=>[g.key,g.net,g.buy,g.margin,g.net?`${(g.margin/g.net*100).toFixed(1)}%`:"–",g.items.length]),`Margin_${today()}.csv`)}><Ico d={IC.export} size={11}/> CSV</Btn>
    </div>
    <div style={{overflowX:"auto",flex:1,width:"100%"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><th style={th}>Kelompok</th><th style={{...th,textAlign:"right"}}>Net Jual</th><th style={{...th,textAlign:"right"}}>Total Beli</th><th style={{...th,textAlign:"right"}}>Margin</th><th style={{...th,textAlign:"right"}}>Margin %</th><th style={{...th,textAlign:"center"}}>Items</th><th style={th}>Catatan</th></tr></thead>
        <tbody>
          {groups.map((g,i)=>{const pct=g.net>0&&g.buy>0?g.margin/g.net*100:null;return<tr key={g.key} style={{background:i%2===0?"#fff":C.s2}} onMouseEnter={e=>e.currentTarget.style.background=C.bSoft} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":C.s2}>
            <td style={{...td,fontWeight:600,...TR,maxWidth:220}} title={g.key}>{g.key}</td>
            <td style={{...td,textAlign:"right",fontFamily:"monospace",fontWeight:600,color:C.blue,whiteSpace:"nowrap"}}>{fmt(g.net)}</td>
            <td style={{...td,textAlign:"right",fontFamily:"monospace",color:g.buy>0?C.orange:C.t3,whiteSpace:"nowrap"}}>{g.buy>0?fmt(g.buy):"–"}</td>
            <td style={{...td,textAlign:"right",fontFamily:"monospace",fontWeight:700,color:g.margin>=0?C.green:C.red,whiteSpace:"nowrap"}}>{g.buy>0?fmt(g.margin):"–"}</td>
            <td style={{...td,textAlign:"right",fontWeight:700,color:pct===null?C.t3:pct>=20?C.green:pct>=10?C.amber:C.red}}>{pct===null?"–":`${pct.toFixed(1)}%`}</td>
            <td style={{...td,textAlign:"center"}}>{g.items.length}</td>
            <td style={{...td,fontSize:10,color:C.t3}}>{g.noPrice>0?`${g.noPrice} item tanpa harga beli`:""}</td>
          </tr>;})}
          <tr style={{background:"#eff6ff"}}>
            <td style={{...td,fontWeight:800,color:C.text}}>TOTAL</td>
            <td style={{...td,textAlign:"right",fontFamily:"monospace",fontWeight:800,color:C.blue,whiteSpace:"nowrap"}}>{fmt(totNet)}</td>
            <td style={{...td,textAlign:"right",fontFamily:"monospace",fontWeight:700,color:C.orange,whiteSpace:"nowrap"}}>{fmt(totBuy)}</td>
            <td style={{...td,textAlign:"right",fontFamily:"monospace",fontWeight:800,color:totMg>=0?C.green:C.red,whiteSpace:"nowrap"}}>{fmt(totMg)}</td>
            <td style={{...td,textAlign:"right",fontWeight:800,color:C.text}}>{totNet>0&&totBuy>0?`${(totMg/totNet*100).toFixed(1)}%`:"–"}</td>
            <td style={{...td,textAlign:"center",fontWeight:700}}>{items.length}</td>
            <td style={td}/>
          </tr>
        </tbody>
      </table>
    </div>
  </div>;
}

/* ══ §18 SETTINGS ════════════════════════════════════════════ */
function Settings({settings,companies,zoneTypes,hsDB=[],onSaveSettings,onSaveCompanies,onSaveZones,onSaveHsDB,toast}){
  const[s,setS]=useState(settings);const[cos,setCos]=useState(companies);const[zones,setZones]=useState(zoneTypes);
  const[newCo,setNewCo]=useState("");const[newZone,setNewZone]=useState("");
  const[localHsDB,setLocalHsDB]=useState(hsDB);
  const[newHsCode,setNewHsCode]=useState("");const[newHsDesc,setNewHsDesc]=useState("");
  const[doFields,setDoFields]=useState(settings.doFields||DEFAULT_DO_FIELDS);
  const saveSets=()=>{onSaveSettings({...s,doFields});toast("✓ Settings disimpan");};
  const tglField=key=>setDoFields(p=>p.map(f=>f.key===key?{...f,enabled:!f.enabled}:f));
  const card={background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16,...SH,marginBottom:16};
  const preview=formatDO(s.doFormat,42);
  return<div style={{padding:20,overflowY:"auto",height:"100%",width:"100%"}}>
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={card}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Pengaturan Umum</div>
        <FGrid cols={2}>
          <FF label="Hari Overdue (sejak order date)"><NumInput value={s.overdueDays} onChange={v=>setS(p=>({...p,overdueDays:Math.max(1,v)}))} min={1}/></FF>
          <FF label="Format Nomor DO" hint="Token: {YYYY} {YY} {MM} {NNN}">
            <div style={{display:"flex",gap:6}}>
              <FIn value={s.doFormat} onChange={v=>setS(p=>({...p,doFormat:v}))} placeholder="DO/{YYYY}/{NNN}" style={{flex:1}}/>
              <div style={{display:"flex",alignItems:"center",padding:"6px 10px",background:C.bSoft,borderRadius:6,border:`1px solid ${C.bMid}`,fontSize:11,fontFamily:"monospace",fontWeight:700,color:C.blue,whiteSpace:"nowrap",flexShrink:0}}>{preview}</div>
            </div>
          </FF>
        </FGrid>
        <div style={{marginTop:12}}><Btn onClick={saveSets}><Ico d={IC.save} size={12}/> Simpan</Btn></div>
      </div>
      <div style={card}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>Field Surat Jalan (DO)</div>
        <div style={{fontSize:11,color:C.t2,marginBottom:10}}>Aktifkan field yang tampil di form DO:</div>
        {doFields.map(f=><div key={f.key} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
          <input type="checkbox" checked={f.enabled} onChange={()=>tglField(f.key)}/>
          <span style={{fontSize:12,fontWeight:500,color:C.text,flex:1}}>{f.label}</span>
          <span style={{fontSize:10,color:C.t3,background:C.bg,borderRadius:4,padding:"1px 7px"}}>{f.type}</span>
        </div>)}
        <div style={{marginTop:12}}><Btn onClick={saveSets}><Ico d={IC.save} size={12}/> Simpan</Btn></div>
      </div>
      <div style={card}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Perusahaan</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
          {cos.map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:C.s2,borderRadius:6,border:`1px solid ${C.border}`}}>
            <span style={{flex:1,fontSize:12}}>{c}</span>
            <Btn size="sm" variant="danger" onClick={()=>{const n=cos.filter((_,j)=>j!==i);setCos(n);onSaveCompanies(n);}}><Ico d={IC.trash} size={10}/></Btn>
          </div>)}
        </div>
        <div style={{display:"flex",gap:8}}><FIn value={newCo} onChange={setNewCo} placeholder="Nama perusahaan baru..." style={{flex:1}} onKeyDown={e=>{if(e.key==="Enter"&&newCo.trim()){const n=[...cos,newCo.trim()];setCos(n);onSaveCompanies(n);setNewCo("");}}}/><Btn size="sm" onClick={()=>{if(newCo.trim()){const n=[...cos,newCo.trim()];setCos(n);onSaveCompanies(n);setNewCo("");}}}><Ico d={IC.plus} size={11}/> Tambah</Btn></div>
      </div>
      <div style={card}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Zone Types</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
          {zones.map((z,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:C.s2,borderRadius:6,border:`1px solid ${C.border}`}}>
            <span style={{flex:1,fontSize:12}}>{z}</span>
            <Btn size="sm" variant="danger" onClick={()=>{const n=zones.filter((_,j)=>j!==i);setZones(n);onSaveZones(n);}}><Ico d={IC.trash} size={10}/></Btn>
          </div>)}
        </div>
        <div style={{display:"flex",gap:8}}><FIn value={newZone} onChange={setNewZone} placeholder="Zone baru..." style={{flex:1}} onKeyDown={e=>{if(e.key==="Enter"&&newZone.trim()){const n=[...zones,newZone.trim()];setZones(n);onSaveZones(n);setNewZone("");}}}/><Btn size="sm" onClick={()=>{if(newZone.trim()){const n=[...zones,newZone.trim()];setZones(n);onSaveZones(n);setNewZone("");}}}><Ico d={IC.plus} size={11}/> Tambah</Btn></div>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>HS Code Database <span style={{fontSize:10,color:C.t3,fontWeight:400}}>({localHsDB.length} kode)</span></div>
          {onSaveHsDB&&<Btn size="sm" variant="blue" onClick={()=>{onSaveHsDB(localHsDB);toast("✓ HS Code disimpan");}}>Simpan</Btn>}
        </div>
        <div style={{maxHeight:220,overflowY:"auto",marginBottom:10,border:`1px solid ${C.border}`,borderRadius:6}}>
          {!localHsDB.length&&<div style={{padding:16,textAlign:"center",fontSize:12,color:C.t3}}>Belum ada HS Code. Tambahkan di bawah.</div>}
          {localHsDB.map((h,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 10px",borderBottom:i<localHsDB.length-1?`1px solid ${C.border}`:"none",background:i%2===0?"transparent":C.s2}}>
            <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:C.blue,minWidth:90}}>{h.code}</span>
            <span style={{fontSize:11,color:C.t2,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.desc}</span>
            <button onClick={()=>{const n=localHsDB.filter((_,j)=>j!==i);setLocalHsDB(n);onSaveHsDB&&onSaveHsDB(n);}} style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:"2px 4px",display:"inline-flex"}}><Ico d={IC.trash} size={10} color={C.red}/></button>
          </div>)}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <FIn value={newHsCode} onChange={setNewHsCode} placeholder="Kode (mis. 8481.20.00)" style={{width:150,fontFamily:"monospace"}}/>
          <FIn value={newHsDesc} onChange={setNewHsDesc} placeholder="Deskripsi" style={{flex:1}} onKeyDown={e=>{if(e.key==="Enter"&&newHsCode.trim()){const n=[...localHsDB,{code:newHsCode.trim(),desc:newHsDesc.trim()}];setLocalHsDB(n);onSaveHsDB&&onSaveHsDB(n);setNewHsCode("");setNewHsDesc("");}}}/>
          <Btn size="sm" onClick={()=>{if(newHsCode.trim()){const n=[...localHsDB,{code:newHsCode.trim(),desc:newHsDesc.trim()}];setLocalHsDB(n);onSaveHsDB&&onSaveHsDB(n);setNewHsCode("");setNewHsDesc("");}}}><Ico d={IC.plus} size={11}/> Tambah</Btn>
        </div>
      </div>
    </div>
  </div>;
}

/* ══ §19 ROOT APP ════════════════════════════════════════════ */
export default function App(){
  const[pos,setPOs]=usePersist("po66_pos",INIT_POS);
  const[items,setItems]=usePersist("po66_items",INIT_ITEMS);
  const[suppliers,setSuppliers]=usePersist("po66_suppliers",INIT_SUPPLIERS);
  const[dos,setDos]=usePersist("po66_dos",INIT_DOS);
  const[companies,setCompanies]=usePersist("po66_companies",INIT_COMPANIES);
  const[zoneTypes,setZoneTypes]=usePersist("po66_zones",INIT_ZONE_TYPES);
  const[settings,setSettings]=usePersist("po66_settings",INIT_SETTINGS);
  const[hsDB,setHsDB]=usePersist("po66_hsdb",INIT_HS_DB);
  const[view,setView]=useState("dashboard");
  const[sideCollapsed,setSideCollapsed]=useState(false);
  const{show:toast,Toast}=useToast();

  // PO CRUD
  const handleAddPO=useCallback((po,draftItems=[])=>{
    setPOs(p=>p.find(x=>x.id===po.id)?p.map(x=>x.id===po.id?po:x):[...p,po]);
    if(draftItems.length){const ids=new Set(draftItems.map(i=>i.id));setItems(p=>[...p.filter(i=>!ids.has(i.id)),...draftItems]);}
  },[]);
  const handleUpdatePO=useCallback(po=>setPOs(p=>p.map(x=>x.id===po.id?po:x)),[]);
  // FIX Bug A — delete uses callback, no window.confirm
  const handleDeletePO=useCallback((id,silent)=>{
    const doDel=()=>{setPOs(p=>p.filter(x=>x.id!==id));setItems(p=>p.filter(i=>i.poId!==id));setDos(p=>p.filter(d=>d.poId!==id));toast("✓ PO dihapus");};
    if(silent)doDel();else doDel();// confirm handled by caller
  },[]);

  // Item CRUD
  const handleAddItem=useCallback(item=>setItems(p=>p.find(x=>x.id===item.id)?p.map(x=>x.id===item.id?item:x):[...p,item]),[]);
  const handleUpdateItem=useCallback(item=>setItems(p=>p.map(x=>x.id===item.id?item:x)),[]);
  const handleDeleteItem=useCallback(id=>setItems(p=>p.filter(x=>x.id!==id)),[]);

  // Supplier CRUD
  const handleAddSupplier=useCallback(s=>setSuppliers(p=>p.find(x=>x.id===s.id)?p.map(x=>x.id===s.id?s:x):[...p,s]),[]);
  const handleUpdateSupplier=useCallback(s=>setSuppliers(p=>p.map(x=>x.id===s.id?s:x)),[]);
  const handleArchiveSupplier=useCallback(id=>setSuppliers(p=>p.map(s=>s.id===id?{...s,deletedAt:today()}:s)),[]);

  // FIX Bug A — handleSaveDO properly wired and fixes stale closure
  const handleSaveDO=useCallback(doObj=>{
    setDos(p=>[...p,doObj]);
    setItems(p=>p.map(i=>{
      const line=doObj.lines.find(l=>l.itemId===i.id);
      if(!line)return i;
      const newDoNos=[...new Set([...(i.doNos||[]),doObj.doNo])];
      // Use functional update to avoid stale dos closure
      return{...i,doNos:newDoNos,deliveryDate:i.deliveryDate||doObj.deliveryDate};
    }));
    // Update item status based on qty delivered — done after setDos settles
    setDos(allDos=>{
      setItems(allItems=>allItems.map(i=>{
        if(!doObj.lines.some(l=>l.itemId===i.id))return i;
        const total=allDos.reduce((s,d)=>s+((d.lines||[]).find(l=>l.itemId===i.id)?.qtyDelivered||0),0);
        const newStatus=total>=i.qty?"delivered":total>0?"partial":i.status;
        return{...i,status:newStatus};
      }));
      return allDos;
    });
    toast(`✓ DO ${doObj.doNo} disimpan`);
  },[]);

  const handleDeleteDO=useCallback(doId=>{
    setDos(allDos=>{
      const doObj=allDos.find(d=>d.id===doId);
      if(!doObj)return allDos;
      const remaining=allDos.filter(d=>d.id!==doId);
      // Revert item status based on remaining DOs
      setItems(allItems=>allItems.map(i=>{
        if(!(doObj.lines||[]).some(l=>l.itemId===i.id))return i;
        const total=remaining.reduce((s,d)=>s+((d.lines||[]).find(l=>l.itemId===i.id)?.qtyDelivered||0),0);
        const newDoNos=(i.doNos||[]).filter(n=>n!==doObj.doNo);
        const newStatus=total>=i.qty?"delivered":total>0?"partial":"ordered";
        return{...i,doNos:newDoNos,status:newStatus};
      }));
      return remaining;
    });
    toast("✓ DO dihapus, status item dikembalikan");
  },[]);

  const handleJump=useCallback(()=>setView("po"),[]);

  // Keyboard shortcuts: N=new PO, /=focus search
  useEffect(()=>{
    const h=e=>{
      const tag=document.activeElement?.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT")return;
      if(e.key==="n"||e.key==="N"){e.preventDefault();setView("po");setTimeout(()=>document.getElementById("btn-new-po")?.click(),100);}
      if(e.key==="/"){e.preventDefault();setView("po");setTimeout(()=>document.getElementById("po-search-input")?.focus(),100);}
    };
    document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);
  },[]);

  const todayStr=today();
  const overduePOs=pos.filter(p=>{
    if(["paid","invoiced"].includes(p.status))return false;
    return items.filter(i=>i.poId===p.id&&!["delivered","invoiced","paid"].includes(i.status))
      .some(i=>i.deliveryDate&&i.deliveryDate!=="dd/mm/yyyy"&&i.deliveryDate<todayStr);
  });

  const NAV=[
    {id:"dashboard",label:"Dashboard",icon:IC.dash},
    {id:"po",label:"Purchase Orders",icon:IC.po},
    {id:"items",label:"Semua Item",icon:IC.box},
    {id:"supplier",label:"Supplier",icon:IC.users},
    {id:"margin",label:"Margin Analysis",icon:IC.stats},
    {id:"settings",label:"Settings",icon:IC.cog},
  ];

  return<div style={{display:"flex",height:"100vh",overflow:"hidden",background:C.bg}}>
    <style>{GCSS}</style>
    <Toast/>
    {overduePOs.length>0&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:10000,background:"#dc2626",color:"#fff",padding:"8px 16px",display:"flex",alignItems:"center",gap:10,fontSize:12,fontWeight:600,boxShadow:"0 2px 8px rgba(220,38,38,.4)"}}>
      <Ico d={IC.warn} size={14} color="#fff"/>
      <span>⚠ {overduePOs.length} PO OVERDUE — item belum terkirim melewati tanggal delivery!</span>
      <button onClick={()=>setView("po")} style={{marginLeft:"auto",background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.4)",borderRadius:5,color:"#fff",padding:"3px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Lihat PO</button>
    </div>}
    {/* SIDEBAR */}
    <div id="sb" style={{width:sideCollapsed?52:220,flexShrink:0,background:"#0f172a",display:"flex",flexDirection:"column",transition:"width .2s",overflow:"hidden"}}>
      <div style={{padding:"14px 12px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:8}}>
        {!sideCollapsed&&<div><div style={{fontSize:12,fontWeight:800,color:"#f8fafc",letterSpacing:".02em"}}>PO MANAGER</div><div style={{fontSize:9,color:"#475569",marginTop:1}}>v6.6</div></div>}
        <button onClick={()=>setSideCollapsed(v=>!v)} style={{background:"transparent",border:"1px solid #1e293b",borderRadius:5,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#64748b",flexShrink:0,marginLeft:"auto"}}><Ico d={sideCollapsed?IC.chevR:IC.chevL} size={11}/></button>
      </div>
      <nav style={{flex:1,padding:"8px 6px",overflowY:"auto"}}>
        {NAV.map(n=>{const active=view===n.id;return<button key={n.id} onClick={()=>setView(n.id)} title={n.label} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 10px",borderRadius:7,border:"none",background:active?"#1e40af":"transparent",color:active?"#fff":"#94a3b8",cursor:"pointer",fontWeight:active?700:500,fontSize:12,transition:"background .12s",marginBottom:2,textAlign:"left",whiteSpace:"nowrap",overflow:"hidden"}}>
          <Ico d={n.icon} size={16} color={active?"#fff":"#64748b"}/>
          {!sideCollapsed&&<span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis"}}>{n.label}</span>}
        </button>;})}
      </nav>
      {!sideCollapsed&&<div style={{padding:"10px 12px",borderTop:"1px solid #1e293b",flexShrink:0}}>
        <div style={{fontSize:9,color:"#475569",fontWeight:600}}>{VENDOR_NAME}</div>
        <div style={{fontSize:9,color:"#334155",marginTop:1}}>{pos.length} PO · {items.length} item · {suppliers.filter(s=>!s.deletedAt).length} supplier</div>
      </div>}
    </div>
    {/* MAIN */}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
      <div id="tb" style={{height:48,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 20px",gap:12,flexShrink:0,...SH}}>
        <h1 style={{margin:0,fontSize:14,fontWeight:700,color:C.text,flex:1}}>{NAV.find(n=>n.id===view)?.label}</h1>
        <span style={{fontSize:11,color:C.t3}}>{new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span>
      </div>
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minWidth:0}}>
        {view==="dashboard"&&<Dashboard pos={pos} items={items} dos={dos} suppliers={suppliers} settings={settings} onJump={handleJump}/>}
        {view==="po"&&<POList pos={pos} items={items} suppliers={suppliers} dos={dos} companies={companies} zoneTypes={zoneTypes} settings={settings} hsDB={hsDB} onUpdate={handleUpdatePO} onAdd={handleAddPO} onDelete={handleDeletePO} onUpdateItem={handleUpdateItem} onDeleteItems={handleDeleteItem} onAddItem={handleAddItem} onAddSupplier={handleAddSupplier} onSaveDO={handleSaveDO} onDeleteDO={handleDeleteDO} toast={toast}/>}
        {view==="items"&&<AllItems items={items} pos={pos} suppliers={suppliers} dos={dos} zoneTypes={zoneTypes} settings={settings} hsDB={hsDB} onUpdateItem={handleUpdateItem} onDeleteItem={handleDeleteItem}/>}
        {view==="supplier"&&<SupplierPage suppliers={suppliers} items={items} pos={pos} dos={dos} onAdd={handleAddSupplier} onUpdate={handleUpdateSupplier} onArchive={handleArchiveSupplier} toast={toast}/>}
        {view==="margin"&&<MarginAnalysis items={items} pos={pos} suppliers={suppliers}/>}
        {view==="settings"&&<Settings settings={settings} companies={companies} zoneTypes={zoneTypes} hsDB={hsDB} onSaveSettings={s=>{setSettings(s);toast("✓ Settings disimpan");}} onSaveCompanies={setCompanies} onSaveZones={setZoneTypes} onSaveHsDB={setHsDB} toast={toast}/>}
      </div>
    </div>
  </div>;
}

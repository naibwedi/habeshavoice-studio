"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, AudioLines, BookOpen, Check, CheckCheck, ChevronRight, CircleHelp, CloudUpload, Copy, FileText, FolderOpen, Info, LoaderCircle, LockKeyhole, Mic, Plus, RotateCcw, Save, Search, Settings2, ShieldCheck, Sparkles, Square, Trash2, X } from "lucide-react";
import { formatTime, LANGUAGES, SAMPLES, type Language, type Transcript } from "../lib/types";

type Config = { transcriptionReady: boolean; storageReady: boolean; signedIn: boolean };
type Modal = "guide" | "settings" | "export" | "delete" | "discard" | null;
const MAX_BYTES = 25 * 1024 * 1024;
const bars = Array.from({length: 48}, (_, i) => Math.round(5 + Math.abs(Math.sin(i * 1.72) * Math.cos(i * .21)) * 42));
function Brand({ mobile = false }: { mobile?: boolean }) {
  return <a href="/" className={"brand" + (mobile ? " mobile-brand" : "")} aria-label="HabeshaVoice Studio home"><img src="/logo.png" alt="" width="38" height="38"/><span><b>habesha<span style={{color:"var(--accent)"}}>voice</span></b><small>STUDIO</small></span></a>;
}
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({error:"The server could not complete this request."}));
  if (!res.ok) throw new Error((data as {error?:string}).error || "Something went wrong. Please try again.");
  return data as T;
}
function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], {type:mime}));
  const a = document.createElement("a"); a.href = url; a.download = name; a.hidden = true; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export default function Studio() {
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"studio" | "library">("studio");
  const [capture, setCapture] = useState<"record" | "upload">("record");
  const [language, setLanguage] = useState<Language>("ti");
  const [selected, setSelected] = useState<Transcript | null>({...SAMPLES[0]});
  const [saved, setSaved] = useState<Transcript[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [recording, setRecording] = useState(false);
  const [requestingMic, setRequestingMic] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileSource, setFileSource] = useState<"recording" | "upload">("upload");
  const [fileDuration, setFileDuration] = useState(0);
  const [consent, setConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"save" | "transcribe" | "delete" | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const pending = useRef<(() => void) | null>(null);
  const stateRef = useRef({selected});
  stateRef.current = {selected};
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    api<Config>("/api/config").then(c => {if(active) setConfig(c);}).catch(() => {if(active) setConfig({transcriptionReady:false,storageReady:false,signedIn:false});});
    api<{transcripts:Transcript[]}>("/api/transcripts").then(d => {if(active) setSaved(d.transcripts);}).catch(e => {if(active) setError(e.message);});
    return () => { active = false; stream.current?.getTracks().forEach(t => t.stop()); };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (!file) {setFileUrl(""); return;}
    const url = URL.createObjectURL(file); setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now()-started.current)/1000);
      setSeconds(elapsed);
      if (elapsed >= 300 && recorder.current?.state === "recording") recorder.current.stop();
    }, 250);
    return () => clearInterval(id);
  }, [recording]);
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {if(dirty || recording){e.preventDefault();}};
    window.addEventListener("beforeunload",onUnload);
    return () => window.removeEventListener("beforeunload",onUnload);
  }, [dirty,recording]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = modalRef.current;
    const focusable = () => dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]');
    focusable()?.[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if(e.key === "Escape" && !busy) setModal(null);
      if(e.key === "Tab") {
        const nodes = focusable(); if(!nodes?.length) return;
        const first=nodes[0], last=nodes[nodes.length-1];
        if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener("keydown",handle);
    return () => {document.removeEventListener("keydown",handle);previous?.focus();};
  }, [modal,busy]);
  useEffect(() => {
    const doc = document as Document & {modelContext?: {registerTool: (tool: unknown, options?: {signal:AbortSignal}) => void | Promise<void>}};
    if(!doc.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    try { Promise.resolve(doc.modelContext.registerTool({
      name:"read_current_transcript", title:"Read current transcript",
      description:"Read the transcript currently visible in HabeshaVoice Studio without changing or saving it.",
      inputSchema:{type:"object",properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:true},
      execute(input: unknown) { if(!input || typeof input!=="object" || Object.keys(input).length) throw new Error("Expected an empty object.");
        const t=stateRef.current.selected; return t ? {title:t.title,language:t.language,text:t.text,source:t.source} : {transcript:null}; }
    },{signal:lifecycle.signal})).catch(() => {}); } catch {}
    return () => lifecycle.abort();
  }, []);
  function changeDocument(next: Transcript | null) {
    if (busy) return;
    const apply = () => {setSelected(next ? {...next} : null);setDirty(false);setShowOriginal(false);setView("studio");};
    if(dirty){pending.current=apply;setModal("discard");} else apply();
  }
  function loadSample() { changeDocument(SAMPLES.find(s => s.language===language)!); notify("Text sample opened. Edit it, save a copy, or export."); }
  async function startRecording() {
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){setError("Recording needs a supported browser over HTTPS. You can upload an audio file instead.");return;}
    setError("");setRequestingMic(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      stream.current = media;
      const mime = ["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"].find(m => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(media, mime ? {mimeType:mime} : undefined);
      recorder.current=rec;chunks.current=[];
      rec.ondataavailable=e => {if(e.data.size) chunks.current.push(e.data);};
      rec.onstop=() => {
        const duration=Math.min(300,(Date.now()-started.current)/1000);
        const type=rec.mimeType || "audio/webm";
        const ext=type.includes("mp4")?"m4a":type.includes("ogg")?"ogg":"webm";
        const result=new File(chunks.current, "Recording-"+new Date().toISOString().slice(0,10)+"."+ext,{type});
        if(result.size>MAX_BYTES) setError("This recording exceeds 25 MB. Please record a shorter clip.");
        else {setFile(result);setFileSource("recording");setFileDuration(duration);setSeconds(Math.floor(duration));setConsent(false);}
        media.getTracks().forEach(t=>t.stop());setRecording(false);
      };
      rec.onerror=() => {setError("The recording was interrupted. Please try again.");media.getTracks().forEach(t=>t.stop());setRecording(false);};
      setFile(null);setSeconds(0);started.current=Date.now();rec.start(1000);setRecording(true);
    } catch(e) {setError(e instanceof DOMException && e.name==="NotAllowedError" ? "Microphone access was denied. Allow it in your browser settings, or upload a recording." : "The microphone could not be opened. Check that it is connected and try again.");}
    finally {setRequestingMic(false);}
  }
  async function chooseFile(f?: File) {
    if(!f) return;
    if(f.size===0 || f.size>MAX_BYTES){setError("Choose a non-empty audio file smaller than 25 MB.");return;}
    if(!/\.(mp3|wav|m4a|mp4|webm|ogg|flac)$/i.test(f.name)){setError("Supported formats: MP3, WAV, M4A, MP4, WebM, OGG and FLAC.");return;}
    setError("");setConsent(false);
    const url=URL.createObjectURL(f);
    const audio=new Audio();
    audio.preload="metadata";
    audio.onloadedmetadata=() => {
      URL.revokeObjectURL(url);
      if(Number.isFinite(audio.duration) && audio.duration>300.5){setError("Choose a recording of five minutes or less.");return;}
      setFile(f);setFileSource("upload");setFileDuration(Number.isFinite(audio.duration)?audio.duration:0);
    };
    audio.onerror=() => {URL.revokeObjectURL(url);setFile(f);setFileSource("upload");setFileDuration(0);};
    audio.src=url;
  }
  async function transcribe() {
    if(!file || !consent) return;
    if(!config?.transcriptionReady){setModal("settings");return;}
    if(dirty){pending.current=() => {setDirty(false);void submitTranscription();};setModal("discard");return;}
    await submitTranscription();
  }
  async function submitTranscription() {
    if(!file) return;
    setBusy("transcribe");setError("");
    try {
      const form=new FormData();form.append("audio",file);form.append("language",language);form.append("source",fileSource);form.append("consent","true");
      const data=await api<{transcript:Transcript}>("/api/transcribe",{method:"POST",body:form});
      setSelected(data.transcript);setSaved(old=>[data.transcript,...old]);setDirty(false);setShowOriginal(false);setFile(null);setSeconds(0);setConsent(false);
      notify("Transcript ready. Review it against the recording.");
    } catch(e){setError((e as Error).message);} finally{setBusy(null);}
  }
  async function save() {
    if(!selected || !selected.title.trim()) {setError("Give your transcript a title before saving.");return;}
    setBusy("save");setError("");
    try {
      const isNew=selected.id.startsWith("sample-");
      const d=await api<{transcript:Transcript}>(isNew?"/api/transcripts":"/api/transcripts/"+selected.id,{method:isNew?"POST":"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(isNew?{title:selected.title,text:selected.text,language:selected.language,sampleId:selected.id}:{title:selected.title,text:selected.text})});
      setSelected(d.transcript);setSaved(old=>[d.transcript,...old.filter(t=>t.id!==d.transcript.id)]);setDirty(false);notify(isNew?"Your sample copy is saved to the library.":"Changes saved.");
    }catch(e){setError((e as Error).message);}finally{setBusy(null);}
  }
  async function remove() {
    if(!selected) return;
    setBusy("delete");
    try {
      await api("/api/transcripts/"+selected.id,{method:"DELETE"});
      setSaved(old=>old.filter(t=>t.id!==selected.id));setSelected(null);setDirty(false);setModal(null);notify("Transcript and its recording deleted.");
    } catch(e){setError((e as Error).message);}finally{setBusy(null);}
  }
  async function copy() {
    if(!selected) return;
    try {await navigator.clipboard.writeText(selected.text);notify("Transcript copied.");}catch{setError("Clipboard access is unavailable. Select the transcript text and copy it manually.");}
  }
  function exportText(format:"txt"|"md") {
    if(!selected) return;
    const filename=(selected.title.replace(/[^\p{L}\p{N}\s_-]/gu,"").trim()||"transcript").slice(0,90);
    const content=format==="md"?"# "+selected.title+"\n\nLanguage: "+LANGUAGES[selected.language].name+"\n\n"+selected.text:selected.text;
    downloadFile(filename+"."+format,content,format==="md"?"text/markdown;charset=utf-8":"text/plain;charset=utf-8");
    setModal(null);notify("Transcript exported.");
  }
  const recent=[...saved.slice(0,3),...SAMPLES].slice(0,3);
  const filtered=saved.filter(t=>(t.title+" "+t.text+" "+LANGUAGES[t.language].name).toLowerCase().includes(search.toLowerCase()));
  const wordCount=selected?.text.trim().split(/\s+/).filter(Boolean).length||0;
  const row=(t:Transcript) => <button key={t.id} className={"session-row"+(selected?.id===t.id?" selected":"")} onClick={()=>changeDocument(t)}><span className="session-icon">{t.source==="demo"?<FileText size={17}/>:<AudioLines size={17}/>}</span><span><b>{t.title}</b><small>{LANGUAGES[t.language].name}<span>·</span>{t.source==="demo"?"Text sample":formatTime(t.duration)}<span>·</span>{t.id.startsWith("sample-")?"Explore":new Date(t.createdAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</small></span><ChevronRight size={16}/></button>;
  return <div className="shell" inert={!hydrated} aria-busy={!hydrated}>
    <aside className="sidebar"><Brand/><div><div className="nav-label">Your workspace</div><nav className="nav" aria-label="Main navigation"><button className={view==="studio"?"active":""} onClick={()=>setView("studio")}><AudioLines size={18}/>Studio</button><button className={view==="library"?"active":""} onClick={()=>setView("library")}><FolderOpen size={18}/>My library<span className="count">{saved.length}</span></button><button onClick={()=>setModal("guide")}><BookOpen size={18}/>Quick guide</button></nav></div><div className="sidebar-bottom"><div className="language-note"><p className="native" lang="ti">ሀ ለ ሐ</p><p>Two languages.<br/>A world of stories.<br/>A space for your voice.</p></div><nav className="nav" aria-label="Workspace settings"><button onClick={()=>setModal("settings")}><Settings2 size={17}/>Studio settings</button></nav><div className="profile"><span className="avatar"><Mic size={16}/></span><span><b>Personal workspace</b><small>Private by design</small></span></div></div></aside>
    <div className="content"><header className="topbar"><div className="breadcrumb">Workspace<ChevronRight size={12}/><strong>{view==="studio"?"Speech studio":"My library"}</strong></div><Brand mobile/><div className="top-actions"><button className={"badge"+(!config?.transcriptionReady?" amber":"")} onClick={()=>setModal("settings")}>{config?.transcriptionReady?<AudioLines size={12}/>:<Sparkles size={12}/>} {config?.transcriptionReady?"Speech engine connected":"Demo workspace"}</button><button className="icon-button" aria-label="Open quick guide" onClick={()=>setModal("guide")}><CircleHelp size={17}/></button></div></header>
    <main className="main"><div className="intro"><div><p className="eyebrow">Tigrinya & Amharic · ትግርኛ & አማርኛ</p><h1>{view==="studio"?"Your voice. In your words.":"A home for your words."}</h1><p>{view==="studio"?"Record a thought. Capture a conversation. Make it yours.":"Your saved transcripts, ready for the next chapter."}</p></div><button className="text-button" onClick={()=>changeDocument(null)}><Plus size={16}/>New session</button></div>
    {error&&<div className="alert" role="alert"><Info size={17}/><span>{error}</span><button aria-label="Dismiss error" onClick={()=>setError("")}><X size={16}/></button></div>}
    {view==="library"?<><label className="searchbar"><Search size={18}/><input aria-label="Search transcripts" placeholder="Search your transcripts…" value={search} onChange={e=>setSearch(e.target.value)}/></label><section className="panel library-list">{filtered.length?filtered.map(row):<div className="empty"><FolderOpen size={32}/><h3>{search?"No matches yet":"Your library starts here"}</h3><p>{search?"Try another title, word, or language.":"Save a sample or transcribe your first recording to keep your words here."}</p><button className="button" onClick={()=>{setView("studio");loadSample();}}>Explore a sample<ArrowRight size={15}/></button></div>}</section></>:
    <div className="workspace"><div className="left-column">
      <section className="panel capture-panel" aria-label="Create a transcript"><div className="tabs" role="tablist" aria-label="Audio source"><button role="tab" aria-selected={capture==="record"} className={capture==="record"?"active":""} disabled={recording||!!busy} onClick={()=>setCapture("record")}><Mic size={16}/>Record audio</button><button role="tab" aria-selected={capture==="upload"} className={capture==="upload"?"active":""} disabled={recording||!!busy} onClick={()=>setCapture("upload")}><CloudUpload size={17}/>Upload a file</button></div>
      <div className="capture-body"><span className="field-label" id="language-label">What language are you speaking?</span><div className="language-picker" role="group" aria-labelledby="language-label">{(["ti","am"] as Language[]).map(l=><button key={l} className={language===l?"selected":""} aria-pressed={language===l} disabled={recording||!!busy} onClick={()=>setLanguage(l)}><span>{LANGUAGES[l].name}</span><span className="native" lang={l}>{LANGUAGES[l].native}</span></button>)}</div>
      {capture==="record"?<div className={"capture-stage"+(recording?" recording":"")}><div className="timer" aria-label="Recording duration">{formatTime(seconds)}</div><div className={"waveform"+(recording?" live":"")} aria-hidden="true">{bars.map((h,i)=><i key={i} style={{height:h,animationDelay:(i*.04)+"s"}}/>)}</div><p>{recording?"Recording your voice…":file?"Your recording is ready to review":"A quiet moment. A clear voice."}</p></div>:<button className={"upload-zone"+(dragging?" dragging":"")} onClick={()=>fileInput.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);void chooseFile(e.dataTransfer.files[0]);}} disabled={!!busy}><CloudUpload size={30}/><strong>{file?file.name:"Drop your audio here"}</strong><span>{file?(file.size/1024/1024).toFixed(1)+" MB · Click to replace":"or browse files on your device"}</span><span>MP3, WAV, M4A, WebM, OGG, FLAC · 25 MB max</span></button>}
      <input ref={fileInput} className="visually-hidden" type="file" accept=".mp3,.wav,.m4a,.mp4,.webm,.ogg,.flac,audio/*" aria-label="Choose an audio file" onChange={e=>{void chooseFile(e.target.files?.[0]);e.target.value="";}}/>
      {fileUrl&&!recording&&<audio className="form-audio" controls src={fileUrl} aria-label="Review your audio before uploading"/>}
      {file&&!recording?<><label className="privacy-toggle"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I have permission to process this recording. Upload it for transcription and save it in my private library.</label><button className="record-control" disabled={!consent||!!busy} onClick={()=>void transcribe()}>{busy==="transcribe"?<LoaderCircle size={18} className="loading-spin"/>:<AudioLines size={18}/>} {busy==="transcribe"?"Transcribing your audio…":"Transcribe "+LANGUAGES[language].name}</button><button className="discard" disabled={!!busy} onClick={()=>{setFile(null);setSeconds(0);setConsent(false);}}>Discard audio{fileDuration>0?" · "+formatTime(fileDuration):""}</button></>:capture==="record"?<button className="record-control" disabled={requestingMic||!!busy} onClick={()=>recording?recorder.current?.stop():void startRecording()}>{requestingMic?<LoaderCircle size={18} className="loading-spin"/>:recording?<Square size={16} fill="currentColor"/>:<Mic size={18}/>} {requestingMic?"Opening microphone…":recording?"Stop recording":"Start recording"}</button>:null}
      <p className="capture-foot"><LockKeyhole size={12}/>{recording?"Stops automatically at 5 minutes":"Audio stays on your device until you transcribe"}</p></div>
      <div className="sample-callout"><Sparkles size={19}/><div><b>Take the studio for a spin</b><p>Explore an editable {LANGUAGES[language].name} sample.</p></div><button className="icon-button" onClick={loadSample} aria-label={"Open "+LANGUAGES[language].name+" demo sample"}><ArrowRight size={17}/></button></div></section>
      <section className="panel sessions"><div className="panel-head"><h2 className="panel-title">Recent sessions</h2><button className="text-button" onClick={()=>setView("library")}>View library<ArrowRight size={13}/></button></div><div className="session-list">{recent.map(row)}</div></section>
    </div>
    <section className="panel transcript-panel" aria-label="Transcript editor"><div className="panel-head"><h2 className="panel-title"><FileText size={17}/>Your transcript</h2><div className="transcript-tools"><button className="icon-button" aria-label="Copy transcript" disabled={!selected} onClick={()=>void copy()}><Copy size={15}/></button><button className="icon-button" aria-label="Export transcript" disabled={!selected} onClick={()=>setModal("export")}><ArrowDownToLine size={16}/></button>{selected&&!selected.id.startsWith("sample-")&&<button className="icon-button" aria-label="Delete transcript" onClick={()=>setModal("delete")}><Trash2 size={15}/></button>}</div></div>
    {selected?<><div className="document"><div className="document-meta"><span className="badge">{LANGUAGES[selected.language].native}</span><span>{selected.source==="demo"?"TEXT SAMPLE":formatTime(selected.duration)+" AUDIO"}</span></div><input className="document-title" aria-label="Transcript title" disabled={!!busy} maxLength={120} value={selected.title} onChange={e=>{setSelected({...selected,title:e.target.value});setDirty(true);}}/><p className="document-subtitle">{selected.source==="demo"?"A small introduction. A familiar language. Make these words your own.":"Listen back, check the details, and make your final edits."}</p>
    {selected.hasAudio&&<audio controls src={"/api/transcripts/"+selected.id+"/audio"} aria-label="Play original recording"/>}
    <label className="visually-hidden" htmlFor="transcript">Transcript text</label><textarea id="transcript" disabled={!!busy} lang={selected.language} spellCheck={false} readOnly={showOriginal} value={showOriginal?selected.original:selected.text} onChange={e=>{setSelected({...selected,text:e.target.value});setDirty(true);}} maxLength={50000}/><div className="print-content" lang={selected.language}>{selected.text}</div>
    <div className="doc-hint"><span style={{display:"flex",gap:6,alignItems:"center"}}>{showOriginal?<LockKeyhole size={12}/>:<CheckCheck size={13}/>} {showOriginal?"Original text · Read only":"Click the text to edit"}</span><button className="text-button" style={{fontSize:12,marginLeft:"auto"}} onClick={()=>setShowOriginal(!showOriginal)}><RotateCcw size={12}/>{showOriginal?"Back to edits":"View original"}</button></div>
    {selected.source==="demo"&&<div className="demo-note"><Info size={15}/><span>This is illustrative text, not an AI transcription. No audio is attached. Try editing and exporting, or save your own copy.</span></div>}
    </div><div className="doc-bottom"><span>{wordCount} words · {dirty?"Unsaved changes":selected.id.startsWith("sample-")?"Ready to explore":"Saved to library"}</span><button className="button" disabled={!!busy||(!dirty&&!selected.id.startsWith("sample-"))} onClick={()=>void save()}>{busy==="save"?<LoaderCircle size={15} className="loading-spin"/>:<Save size={15}/>} {selected.id.startsWith("sample-")?"Save a copy":"Save changes"}</button></div></>:<div className="empty" style={{flex:1}}><AudioLines size={39} strokeWidth={1}/><h3>Every story starts with a voice.</h3><p>Record or upload a short clip. Your words will have a home right here.</p><button className="button" onClick={loadSample}><Sparkles size={15}/>Explore a sample</button></div>}</section></div>}
    <footer className="footer"><span><ShieldCheck size={13}/>Your words belong to you.</span><span>Made for the way we speak. &nbsp; በቋንቋችን · ብቋንቋና</span></footer></main></div>
    {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setModal(null);}}><div ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{{guide:"A little guide to the studio",settings:"Your studio",export:"Take your words with you",delete:"Delete this session?",discard:"You have unsaved edits"}[modal]}</h2><button className="icon-button" aria-label="Close dialog" disabled={!!busy} onClick={()=>setModal(null)}><X size={17}/></button></div>
    {modal==="guide"&&<><h3>01 · Bring your voice</h3><p>Choose Tigrinya or Amharic. Record up to five minutes, or upload an audio file. Use headphones and a quiet room for clearer speech.</p><h3>02 · Make it accurate</h3><p>Review the transcript while listening to your recording. Names, numbers, regional speech, and mixed languages deserve an extra check. Your original transcript stays available.</p><h3>03 · Make it useful</h3><p>Save your edits in the library. Copy your words, download a text or Markdown file, or print to PDF.</p><div className="demo-note"><Info size={16}/><span>Text samples let you try editing and exports immediately. Real transcription requires a connected speech engine.</span></div></>}
    {modal==="settings"&&<><div className="status-row"><span>Languages</span><b>Tigrinya & Amharic</b></div><div className="status-row"><span>Speech engine</span><span className="badge amber">{config?.transcriptionReady?"Connected":"Not connected"}</span></div><div className="status-row"><span>Private library</span><span className="badge">{config?.storageReady&&config.signedIn?"Available":"Unavailable"}</span></div><h3>{config?.transcriptionReady?"Ready for your voice":"Demo ready. Bring your speech engine."}</h3><p>{config?.transcriptionReady?"You can transcribe recordings up to five minutes. Accuracy varies; review each transcript before relying on it.":"You can record, preview audio, edit text samples, save copies, and export. To transcribe real speech, the workspace owner must connect the inference service included in the repository."}</p><h3>Keep the studio close</h3><p>Use your browser’s Install app or Add to Home Screen option to open HabeshaVoice as its own app. Transcription and your private library need an internet connection.</p><h3>Your recordings, your choice</h3><p>Audio uploads only when you choose Transcribe. Saved recordings and transcripts stay in your private library until you delete the session. Recordings are not used to train models by this app.</p></>}
    {modal==="export"&&<><p>Export the current edited transcript in {selected?LANGUAGES[selected.language].name:"your language"}.</p><div style={{display:"grid",gap:10}}><button className="button" onClick={()=>exportText("txt")}><FileText size={17}/>Plain text (.txt)</button><button className="button" onClick={()=>exportText("md")}><FileText size={17}/>Markdown (.md)</button><button className="button" onClick={()=>{setModal(null);setTimeout(()=>window.print(),100);}}><ArrowDownToLine size={17}/>Print / Save as PDF</button></div></>}
    {modal==="delete"&&<><p>This permanently deletes <strong>{selected?.title}</strong> and its saved audio from your library. Export anything you want to keep first.</p><button className="button danger" disabled={!!busy} onClick={()=>void remove()}>{busy?<LoaderCircle className="loading-spin" size={16}/>:<Trash2 size={16}/>}Delete session</button></>}
    {modal==="discard"&&<><p>Your changes have not been saved. You can keep editing, or discard these changes and continue.</p><div style={{display:"flex",gap:10}}><button className="button" onClick={()=>setModal(null)}>Keep editing</button><button className="button danger" onClick={()=>{setModal(null);pending.current?.();pending.current=null;}}>Discard changes</button></div></>}
    </div></div>}
  </div>;
}





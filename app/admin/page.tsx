"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const giorni = [
  { label: 'Lunedì', value: 1 }, { label: 'Martedì', value: 2 },
  { label: 'Mercoledì', value: 3 }, { label: 'Giovedì', value: 4 }, { label: 'Venerdì', value: 5 },
];
const aule = [
  { id: 1, nome: 'Aula 1' }, { id: 2, nome: 'Aula 2' }, { id: 3, nome: 'Aula 3' }, { id: 4, nome: 'Aula 4' },
  { id: 5, nome: 'Aula 5' }, { id: 6, nome: 'Aula 6' }, { id: 7, nome: 'Aula 7' }, { id: 8, nome: 'Aula 8' },
  { id: 9, nome: 'Aula 9' }, { id: 10, nome: 'Aula 10' }, { id: 11, nome: 'Aula 11' },
];

export default function PannelloAdmin() {
  const [schedaAttiva, setSchedaAttiva] = useState<'orari' | 'media'>('orari');
  const [caricamento, setCaricamento] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  // Dati Globali per Anteprima
  const [assegnazioni, setAssegnazioni] = useState<Record<string, any>>({});
  
  // Stati Form Calendario
  const [aula, setAula] = useState(1);
  const [giorno, setGiorno] = useState(1);
  const [docente, setDocente] = useState('');
  const [nota, setNota] = useState('');
  const [abilitaDocente2, setAbilitaDocente2] = useState(false);
  const [docente2, setDocente2] = useState('');
  const [nota2, setNota2] = useState('');

  // Stati Media
  const [impostazioni, setImpostazioni] = useState({
    musica_url: '', attiva_musica: false,
    video_url: '', durata_video: 10, durata_tabellone: 15, attiva_rotazione: false
  });

  // Caricamento Dati e Real-Time
  useEffect(() => {
    const fetchDati = async () => {
      const [resOrari, resMedia] = await Promise.all([
        supabase.from('assegnazioni_aule').select('*'),
        supabase.from('impostazioni_tv').select('*').eq('id', 1).single()
      ]);
      if (resOrari.data) {
        const mappa: any = {};
        resOrari.data.forEach((item: any) => { mappa[`${item.aula_id}-${item.giorno_settimana - 1}`] = item; });
        setAssegnazioni(mappa);
      }
      if (resMedia.data) setImpostazioni(resMedia.data);
    };

    fetchDati();

    const channel = supabase.channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assegnazioni_aule' }, fetchDati)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impostazioni_tv' }, fetchDati)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Quando clicchi su una cella o cambi i selettori, auto-compila i campi
  useEffect(() => {
    const info = assegnazioni[`${aula}-${giorno - 1}`];
    if (info) {
      setDocente(info.docente || ''); setNota(info.nota || '');
      if (info.docente_2) {
        setAbilitaDocente2(true); setDocente2(info.docente_2); setNota2(info.nota_2 || '');
      } else {
        setAbilitaDocente2(false); setDocente2(''); setNota2('');
      }
    } else {
      setDocente(''); setNota(''); setAbilitaDocente2(false); setDocente2(''); setNota2('');
    }
  }, [aula, giorno, assegnazioni]);

  const selezionaCella = (idAula: number, idGiorno: number) => {
    setSchedaAttiva('orari');
    setAula(idAula);
    setGiorno(idGiorno + 1);
  };

  const handleSalvaCalendario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true); setMessaggio(null);
    const { error } = await supabase.from('assegnazioni_aule').upsert({ 
      aula_id: aula, giorno_settimana: giorno, 
      docente: docente.trim().toUpperCase(), nota: nota.trim(),
      docente_2: abilitaDocente2 ? docente2.trim().toUpperCase() : null, nota_2: abilitaDocente2 ? nota2.trim() : null,
    }, { onConflict: 'aula_id,giorno_settimana' });
    setCaricamento(false);
    if (!error) setMessaggio(`✅ Salvato Aula ${aula} (${giorni[giorno-1].label})`);
  };

  const handleCancellaLezione = async () => {
    setCaricamento(true); setMessaggio(null);
    const { error } = await supabase.from('assegnazioni_aule').delete().eq('aula_id', aula).eq('giorno_settimana', giorno);
    setCaricamento(false);
    if (!error) setMessaggio(`🗑️ Aula ${aula} liberata.`);
  };

  const handleSalvaMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true); setMessaggio(null);
    const { error } = await supabase.from('impostazioni_tv').update(impostazioni).eq('id', 1);
    setCaricamento(false);
    if (!error) setMessaggio('✅ Impostazioni TV salvate!');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* PANNELLO SINISTRO: ANTEPRIMA CALENDARIO INTERATTIVA */}
      <div className="hidden lg:flex flex-1 flex-col p-6 bg-slate-100/50 border-r border-slate-200 overflow-auto">
        <div className="mb-4">
          <h2 className="text-2xl font-black text-slate-900">Anteprima TV Interattiva</h2>
          <p className="text-sm text-slate-500 font-medium">Clicca direttamente su una cella del calendario per modificarla.</p>
        </div>
        
        {/* Griglia Calendario Miniatura */}
        <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-xl p-2 grid grid-cols-6 grid-rows-12 gap-1 min-h-150">
          <div className="bg-slate-800 text-white rounded-lg flex items-center justify-center font-bold text-xs uppercase">AULE</div>
          {giorni.map((g) => <div key={g.label} className="bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs uppercase">{g.label}</div>)}
          
          {aule.map((a) => (
            <React.Fragment key={a.id}>
              <div className="bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center font-black text-sm text-slate-700 uppercase">
                {a.nome}
              </div>
              {giorni.map((_, idxGiorno) => {
                const isSelezionata = aula === a.id && giorno === idxGiorno + 1 && schedaAttiva === 'orari';
                const info = assegnazioni[`${a.id}-${idxGiorno}`];
                
                return (
                  <div 
                    key={`${a.id}-${idxGiorno}`} 
                    onClick={() => selezionaCella(a.id, idxGiorno)}
                    className={`cursor-pointer rounded-lg border-2 flex flex-col items-center justify-center p-0.5 transition-all overflow-hidden text-center
                      ${isSelezionata ? 'border-indigo-500 ring-4 ring-indigo-100 bg-indigo-50' : 'border-slate-100 hover:border-indigo-300 bg-white'}`}
                  >
                    {info?.docente ? (
                      <>
                        <span className="font-bold text-[10px] md:text-xs text-slate-900 uppercase truncate w-full">{info.docente}</span>
                        {info?.docente_2 && <span className="font-bold text-[10px] md:text-xs text-indigo-700 uppercase border-t border-slate-200 w-full mt-0.5 pt-0.5 truncate">{info.docente_2}</span>}
                      </>
                    ) : (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* PANNELLO DESTRO: CONTROLLI */}
      <div className="w-full lg:w-112.5 flex flex-col h-full bg-white shadow-2xl z-10">
        
        {/* Menu Schede */}
        <div className="flex p-4 border-b border-slate-100 bg-slate-50">
          <button onClick={() => setSchedaAttiva('orari')} className={`flex-1 py-3 text-sm font-bold rounded-l-xl border border-r-0 transition-colors ${schedaAttiva === 'orari' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
            📅 Gestione Orari
          </button>
          <button onClick={() => setSchedaAttiva('media')} className={`flex-1 py-3 text-sm font-bold rounded-r-xl border transition-colors ${schedaAttiva === 'media' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
            🎬 Media TV
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {messaggio && <div className="mb-6 p-4 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm text-center border border-emerald-200">{messaggio}</div>}

          {/* SCHEDA 1: ORARI */}
          {schedaAttiva === 'orari' && (
            <form onSubmit={handleSalvaCalendario} className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Modifica Cella</h2>
                <p className="text-sm text-slate-500 font-medium">Seleziona i campi o clicca sulla tabella.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Giorno</label>
                  <select value={giorno} onChange={e => setGiorno(Number(e.target.value))} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 outline-none">
                    {giorni.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Aula</label>
                  <select value={aula} onChange={e => setAula(Number(e.target.value))} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 outline-none">
                    {aule.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider">Insegnante 1 (Principale)</label>
                <input type="text" required placeholder="Es. DE FALCO" value={docente} onChange={e => setDocente(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-black uppercase outline-none focus:border-indigo-500 focus:bg-white"/>
                <input type="text" placeholder="Nota / Materia (Opzionale)" value={nota} onChange={e => setNota(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm outline-none focus:border-indigo-500 focus:bg-white"/>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-bold text-slate-700">Aggiungi 2° Docente (Turno)?</span>
                <button type="button" onClick={() => setAbilitaDocente2(!abilitaDocente2)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${abilitaDocente2 ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>{abilitaDocente2 ? 'SI' : 'NO'}</button>
              </div>

              {abilitaDocente2 && (
                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm space-y-3">
                  <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider">Insegnante 2 (Compresenza)</label>
                  <input type="text" required placeholder="Es. LORIO" value={docente2} onChange={e => setDocente2(e.target.value)} className="w-full p-3 rounded-xl bg-white border border-indigo-200 text-slate-900 font-black uppercase outline-none focus:border-indigo-500"/>
                  <input type="text" placeholder="Nota / Materia (Opzionale)" value={nota2} onChange={e => setNota2(e.target.value)} className="w-full p-3 rounded-xl bg-white border border-indigo-200 text-slate-600 text-sm outline-none focus:border-indigo-500"/>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" disabled={caricamento} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]">
                  SALVA NEL TABELLONE TV
                </button>
                <button type="button" onClick={handleCancellaLezione} disabled={caricamento} className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold py-3 rounded-xl transition-all">
                  Svuota questa cella
                </button>
              </div>
            </form>
          )}

          {/* SCHEDA 2: MEDIA TV */}
          {schedaAttiva === 'media' && (
            <form onSubmit={handleSalvaMedia} className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Impostazioni Display TV</h2>
                <p className="text-sm text-slate-500 font-medium">Gestisci audio e video per il display.</p>
              </div>
              
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Musica di Sottofondo</h2>
                  <button type="button" onClick={() => setImpostazioni({...impostazioni, attiva_musica: !impostazioni.attiva_musica})} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${impostazioni.attiva_musica ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>{impostazioni.attiva_musica ? 'ON' : 'OFF'}</button>
                </div>
                {/* CAMPO AGGIORNATO PER IL SUPPORTO A YOUTUBE */}
                <input type="text" placeholder="Link YouTube o file .mp3" value={impostazioni.musica_url} onChange={e => setImpostazioni({...impostazioni, musica_url: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-emerald-500"/>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                 <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Alternanza Video Promo</h2>
                  <button type="button" onClick={() => setImpostazioni({...impostazioni, attiva_rotazione: !impostazioni.attiva_rotazione})} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${impostazioni.attiva_rotazione ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-500'}`}>{impostazioni.attiva_rotazione ? 'ON' : 'OFF'}</button>
                </div>
                {/* CAMPO AGGIORNATO PER IL SUPPORTO A YOUTUBE */}
                <input type="text" placeholder="Link YouTube (es. Live) o file .mp4" value={impostazioni.video_url} onChange={e => setImpostazioni({...impostazioni, video_url: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-sky-500"/>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Secondi Video</label>
                    <input type="number" min="5" value={impostazioni.durata_video} onChange={e => setImpostazioni({...impostazioni, durata_video: Number(e.target.value)})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-center outline-none focus:border-sky-500"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Secondi Calendario</label>
                    <input type="number" min="5" value={impostazioni.durata_tabellone} onChange={e => setImpostazioni({...impostazioni, durata_tabellone: Number(e.target.value)})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-center outline-none focus:border-sky-500"/>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={caricamento} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98]">
                SALVA IMPOSTAZIONI TV
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
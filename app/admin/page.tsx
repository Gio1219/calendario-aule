"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const giorni = [
  { label: 'Lunedì', value: 1 }, { label: 'Martedì', value: 2 },
  { label: 'Mercoledì', value: 3 }, { label: 'Giovedì', value: 4 }, { label: 'Venerdì', value: 5 },
];
const aule = Array.from({ length: 11 }, (_, i) => i + 1);

export default function PannelloAdmin() {
  const [schedaAttiva, setSchedaAttiva] = useState<'orari' | 'media'>('orari');
  const [caricamento, setCaricamento] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  // Stati Calendario
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

  useEffect(() => {
    // Carica impostazioni media all'avvio
    const fetchMedia = async () => {
      const { data } = await supabase.from('impostazioni_tv').select('*').eq('id', 1).single();
      if (data) setImpostazioni(data);
    };
    fetchMedia();
  }, []);

  const handleSalvaCalendario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true); setMessaggio(null);
    const { error } = await supabase.from('assegnazioni_aule').upsert({ 
      aula_id: aula, giorno_settimana: giorno, 
      docente: docente.trim().toUpperCase(), nota: nota.trim(),
      docente_2: abilitaDocente2 ? docente2.trim().toUpperCase() : null, nota_2: abilitaDocente2 ? nota2.trim() : null,
    }, { onConflict: 'aula_id,giorno_settimana' });
    setCaricamento(false);
    if (!error) {
      setMessaggio(`✅ Tabellone aggiornato: Aula ${aula}`);
      setDocente(''); setNota(''); setDocente2(''); setNota2(''); setAbilitaDocente2(false);
    }
  };

  const handleCancellaLezione = async () => {
    setCaricamento(true); setMessaggio(null);
    const { error } = await supabase.from('assegnazioni_aule').delete().eq('aula_id', aula).eq('giorno_settimana', giorno);
    setCaricamento(false);
    if (!error) {
      setMessaggio(`🗑️ Aula ${aula} liberata.`);
      setDocente(''); setNota(''); setDocente2(''); setNota2('');
    }
  };

  const handleSalvaMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true); setMessaggio(null);
    const { error } = await supabase.from('impostazioni_tv').update(impostazioni).eq('id', 1);
    setCaricamento(false);
    if (!error) setMessaggio('✅ Impostazioni TV e Media salvate con successo!');
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-slate-100 flex flex-col items-center justify-center">
      
      {/* Menu Schede */}
      <div className="flex space-x-2 mb-6 bg-slate-800 p-2 rounded-2xl border border-slate-700 shadow-xl">
        <button onClick={() => setSchedaAttiva('orari')} className={`px-6 py-3 rounded-xl font-bold transition-all ${schedaAttiva === 'orari' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
          📅 Gestione Orari
        </button>
        <button onClick={() => setSchedaAttiva('media')} className={`px-6 py-3 rounded-xl font-bold transition-all ${schedaAttiva === 'media' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
          🎬 Media TV
        </button>
      </div>

      <div className="w-full max-w-2xl bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
        {messaggio && <div className="mb-6 p-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm text-center">{messaggio}</div>}

        {/* SCHEDA 1: ORARI */}
        {schedaAttiva === 'orari' && (
          <form onSubmit={handleSalvaCalendario} className="space-y-5">
            <h1 className="text-2xl font-black text-white mb-6">Calendario Aule</h1>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Giorno</label>
                <select value={giorno} onChange={e => setGiorno(Number(e.target.value))} className="w-full p-3 rounded-xl bg-slate-900 text-white border border-slate-700 focus:border-indigo-500 outline-none">
                  {giorni.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Aula</label>
                <select value={aula} onChange={e => setAula(Number(e.target.value))} className="w-full p-3 rounded-xl bg-slate-900 text-white border border-slate-700 focus:border-indigo-500 outline-none">
                  {aule.map(a => <option key={a} value={a}>Aula {a}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/80 space-y-3">
              <input type="text" required placeholder="Docente Principale (Es. DE FALCO)" value={docente} onChange={e => setDocente(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 text-white font-bold uppercase border border-slate-700 outline-none focus:border-indigo-500"/>
              <input type="text" placeholder="Nota / Materia (Opzionale)" value={nota} onChange={e => setNota(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 text-slate-300 text-sm border border-slate-700 outline-none focus:border-indigo-500"/>
            </div>

            <div className="flex justify-between items-center py-2 border-t border-slate-700/50">
              <span className="text-sm font-bold text-slate-300">Aggiungi 2° Docente / Compresenza?</span>
              <button type="button" onClick={() => setAbilitaDocente2(!abilitaDocente2)} className={`px-4 py-2 rounded-xl text-xs font-bold ${abilitaDocente2 ? 'bg-indigo-600' : 'bg-slate-700'}`}>{abilitaDocente2 ? 'SI' : 'NO'}</button>
            </div>

            {abilitaDocente2 && (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                <input type="text" required placeholder="2° Docente (Es. LORIO)" value={docente2} onChange={e => setDocente2(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 text-white font-bold uppercase border border-slate-700 outline-none focus:border-indigo-500"/>
                <input type="text" placeholder="Nota / Materia 2 (Opzionale)" value={nota2} onChange={e => setNota2(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 text-slate-300 text-sm border border-slate-700 outline-none focus:border-indigo-500"/>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={caricamento} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl">SALVA ORARIO</button>
              <button type="button" onClick={handleCancellaLezione} disabled={caricamento} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-4 rounded-2xl">SVUOTA</button>
            </div>
          </form>
        )}

        {/* SCHEDA 2: MEDIA TV */}
        {schedaAttiva === 'media' && (
          <form onSubmit={handleSalvaMedia} className="space-y-6">
            <h1 className="text-2xl font-black text-white mb-2">Impostazioni Display TV</h1>
            
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/80 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-emerald-400">Musica di Sottofondo</h2>
                <button type="button" onClick={() => setImpostazioni({...impostazioni, attiva_musica: !impostazioni.attiva_musica})} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${impostazioni.attiva_musica ? 'bg-emerald-600' : 'bg-slate-700'}`}>{impostazioni.attiva_musica ? 'ON' : 'OFF'}</button>
              </div>
              <input type="text" placeholder="Link file Audio (.mp3)" value={impostazioni.musica_url} onChange={e => setImpostazioni({...impostazioni, musica_url: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-700 outline-none focus:border-emerald-500"/>
              <p className="text-xs text-slate-500">Usa un link diretto a un file audio mp3 o wav.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/80 space-y-4">
               <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-sky-400">Alternanza Video Promo</h2>
                <button type="button" onClick={() => setImpostazioni({...impostazioni, attiva_rotazione: !impostazioni.attiva_rotazione})} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${impostazioni.attiva_rotazione ? 'bg-sky-600' : 'bg-slate-700'}`}>{impostazioni.attiva_rotazione ? 'ON' : 'OFF'}</button>
              </div>
              <input type="text" placeholder="Link file Video (.mp4)" value={impostazioni.video_url} onChange={e => setImpostazioni({...impostazioni, video_url: e.target.value})} className="w-full p-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-700 outline-none focus:border-sky-500"/>
              
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Durata Video (secondi)</label>
                  <input type="number" min="5" value={impostazioni.durata_video} onChange={e => setImpostazioni({...impostazioni, durata_video: Number(e.target.value)})} className="w-full p-3 rounded-xl bg-slate-900 text-white font-bold border border-slate-700 text-center outline-none focus:border-sky-500"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Durata Tabellone (secondi)</label>
                  <input type="number" min="5" value={impostazioni.durata_tabellone} onChange={e => setImpostazioni({...impostazioni, durata_tabellone: Number(e.target.value)})} className="w-full p-3 rounded-xl bg-slate-900 text-white font-bold border border-slate-700 text-center outline-none focus:border-sky-500"/>
                </div>
              </div>
            </div>

            <button type="submit" disabled={caricamento} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl">SALVA MEDIA TV</button>
          </form>
        )}
      </div>
    </div>
  );
}
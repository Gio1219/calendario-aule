"use client";
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const giorni = [
  { label: 'Lunedì', value: 1 },
  { label: 'Martedì', value: 2 },
  { label: 'Mercoledì', value: 3 },
  { label: 'Giovedì', value: 4 },
  { label: 'Venerdì', value: 5 },
];

const aule = Array.from({ length: 11 }, (_, i) => i + 1);

export default function GestioneCalendario() {
  const [aula, setAula] = useState<number>(1);
  const [giorno, setGiorno] = useState<number>(1);
  
  // Docente 1
  const [docente, setDocente] = useState<string>('');
  const [nota, setNota] = useState<string>('');
  
  // Docente 2 (Opzionale)
  const [abilitaDocente2, setAbilitaDocente2] = useState<boolean>(false);
  const [docente2, setDocente2] = useState<string>('');
  const [nota2, setNota2] = useState<string>('');

  const [caricamento, setCaricamento] = useState<boolean>(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const handleSalva = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true);
    setMessaggio(null);

    const dataPayload = {
      aula_id: aula,
      giorno_settimana: giorno,
      docente: docente.trim().toUpperCase(),
      nota: nota.trim(),
      docente_2: abilitaDocente2 ? docente2.trim().toUpperCase() : null,
      nota_2: abilitaDocente2 ? nota2.trim() : null,
    };

    const { error } = await supabase
      .from('assegnazioni_aule')
      .upsert(dataPayload, { onConflict: 'aula_id,giorno_settimana' });

    setCaricamento(false);

    if (error) {
      setMessaggio(`Errore: ${error.message}`);
    } else {
      setMessaggio(`✅ Tabellone TV aggiornato per Aula ${aula}!`);
      setDocente('');
      setNota('');
      setDocente2('');
      setNota2('');
      setAbilitaDocente2(false);
    }
  };

  const handleCancella = async () => {
    setCaricamento(true);
    setMessaggio(null);

    const { error } = await supabase
      .from('assegnazioni_aule')
      .delete()
      .eq('aula_id', aula)
      .eq('giorno_settimana', giorno);

    setCaricamento(false);

    if (error) {
      setMessaggio(`Errore cancellazione: ${error.message}`);
    } else {
      setMessaggio(`🗑️ Aula ${aula} liberata per il giorno selezionato.`);
      setDocente('');
      setNota('');
      setDocente2('');
      setNota2('');
      setAbilitaDocente2(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 font-sans text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
        <h1 className="text-3xl font-black text-white mb-1">Admin Calendario Aule</h1>
        <p className="text-slate-400 text-sm mb-6">Aggiungi 1 o 2 insegnanti per aula. La TV si aggiornerà in automatico.</p>

        {messaggio && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm">
            {messaggio}
          </div>
        )}

        <form onSubmit={handleSalva} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Giorno</label>
              <select 
                value={giorno} 
                onChange={(e) => setGiorno(Number(e.target.value))}
                className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {giorni.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Aula</label>
              <select 
                value={aula} 
                onChange={(e) => setAula(Number(e.target.value))}
                className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {aule.map(a => (
                  <option key={a} value={a}>Aula {a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Docente 1 */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/80 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Insegnante 1 (o Unico)</h2>
            <input 
              type="text"
              required
              placeholder="Es. DE FALCO"
              value={docente}
              onChange={(e) => setDocente(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 font-bold text-white uppercase outline-none focus:border-indigo-500"
            />
            <input 
              type="text"
              placeholder="Nota / Materia in piccolo (opzionale)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-300 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Switch per aggiungere il 2° Insegnante */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold text-slate-300">Aggiungi 2° Insegnante nella stessa aula?</span>
            <button 
              type="button"
              onClick={() => setAbilitaDocente2(!abilitaDocente2)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${abilitaDocente2 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {abilitaDocente2 ? 'SI (Attivo)' : 'NO'}
            </button>
          </div>

          {/* Docente 2 (Visibile solo se attivo) */}
          {abilitaDocente2 && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3 animate-in fade-in">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Insegnante 2 (Turno / Compresenza)</h2>
              <input 
                type="text"
                required={abilitaDocente2}
                placeholder="Es. LORIO"
                value={docente2}
                onChange={(e) => setDocente2(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 font-bold text-white uppercase outline-none focus:border-indigo-500"
              />
              <input 
                type="text"
                placeholder="Nota / Materia in piccolo (opzionale)"
                value={nota2}
                onChange={(e) => setNota2(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-300 outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="pt-2 space-y-3">
            <button 
              type="submit" 
              disabled={caricamento}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {caricamento ? 'Salvataggio...' : 'AGGIORNA TABELLONE TV'}
            </button>

            <button 
              type="button"
              onClick={handleCancella}
              disabled={caricamento}
              className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold py-3 rounded-2xl border border-rose-800/50 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
            >
              CANCELLA LEZIONE / LIBERA AULA
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
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
  const [docente, setDocente] = useState<string>('');
  const [nota, setNota] = useState<string>('');
  const [caricamento, setCaricamento] = useState<boolean>(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  // Salva o aggiorna aula
  const handleSalva = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true);
    setMessaggio(null);

    const { error } = await supabase
      .from('assegnazioni_aule')
      .upsert(
        { 
          aula_id: aula, 
          giorno_settimana: giorno, 
          docente: docente.trim().toUpperCase(),
          nota: nota.trim()
        }, 
        { onConflict: 'aula_id,giorno_settimana' }
      );

    setCaricamento(false);

    if (error) {
      setMessaggio(`Errore: ${error.message}`);
    } else {
      setMessaggio(`✅ Tabellone TV aggiornato: Aula ${aula} (${giorni.find(g => g.value === giorno)?.label}) -> ${docente.toUpperCase()}`);
      setDocente('');
      setNota('');
    }
  };

  // Cancella/Svuota lo slot selezionato
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
      setMessaggio(`Errore nella cancellazione: ${error.message}`);
    } else {
      setMessaggio(`🗑️ Aula ${aula} liberata per il giorno selezionato.`);
      setDocente('');
      setNota('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Pannello Admin TV</h1>
        <p className="text-slate-500 mb-6 font-medium">Gestisci orari, note/artisti e libera le aule se sbagli.</p>

        {messaggio && (
          <div className="mb-6 p-4 rounded-xl bg-slate-900 text-white font-semibold text-sm animate-in fade-in">
            {messaggio}
          </div>
        )}

        <form onSubmit={handleSalva} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Seleziona Giorno</label>
              <select 
                value={giorno} 
                onChange={(e) => setGiorno(Number(e.target.value))}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {giorni.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Seleziona Aula</label>
              <select 
                value={aula} 
                onChange={(e) => setAula(Number(e.target.value))}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {aule.map(a => (
                  <option key={a} value={a}>Aula {a}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nome Docente / Corso</label>
            <input 
              type="text"
              required
              placeholder="Es. CARFORA"
              value={docente}
              onChange={(e) => setDocente(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nota in Piccolo / Artista (Opzionale)</label>
            <input 
              type="text"
              placeholder="Es. Masterclass Pino Daniele / Serena Brancale"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="pt-2 space-y-3">
            <button 
              type="submit" 
              disabled={caricamento}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {caricamento ? 'Aggiornamento...' : 'AGGIORNA TABELLONE TV'}
            </button>

            <button 
              type="button"
              onClick={handleCancella}
              disabled={caricamento}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3 rounded-xl border border-rose-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              CANCELLA LEZIONE / LIBERA AULA
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
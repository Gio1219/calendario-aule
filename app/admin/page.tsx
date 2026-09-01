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
  const [schedaAttiva, setSchedaAttiva] = useState<'orari' | 'media' | 'sabato'>('orari');
  const [caricamento, setCaricamento] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const [assegnazioni, setAssegnazioni] = useState<Record<string, any>>({});
  const [fasceSpeciali, setFasceSpeciali] = useState<any[]>([]);
  
  const [aula, setAula] = useState(1);
  const [giorno, setGiorno] = useState(1);
  const [docente, setDocente] = useState('');
  const [nota, setNota] = useState('');
  
  // Flag e gestione fasce orarie multiple
  const [usaSpeciale, setUsaSpeciale] = useState(false);
  const [oraInizioFascia, setOraInizioFascia] = useState('15:00');
  const [oraFineFascia, setOraFineFascia] = useState('17:00');
  const [docenteFascia, setDocenteFascia] = useState('');
  const [notaFascia, setNotaFascia] = useState('');

  const [dataSabato, setDataSabato] = useState('');
  const [aulaSabato, setAulaSabato] = useState(1);
  const [docenteSabato, setDocenteSabato] = useState('');
  const [notaSabato, setNotaSabato] = useState('');

  const [impostazioni, setImpostazioni] = useState({
    musica_url: '', 
    attiva_musica: false,
    video_url: '', 
    durata_video: 10, 
    durata_tabellone: 15, 
    attiva_rotazione: false,
    stato_riproduzione: 'play'
  });

  const fetchData = async () => {
    try {
      const [resOrari, resSpeciali, resMedia] = await Promise.all([
        supabase.from('assegnazioni_aule').select('*'),
        supabase.from('dettagli_orario_speciale').select('*'),
        supabase.from('impostazioni_tv').select('*').eq('id', 1).single()
      ]);
      
      if (resOrari.data) {
        const mappa: any = {};
        resOrari.data.forEach((item: any) => { 
          mappa[`${item.aula_id}-${item.giorno_settimana - 1}`] = item; 
        });
        setAssegnazioni(mappa);
      }
      if (resSpeciali.data) {
        setFasceSpeciali(resSpeciali.data);
      }
      if (resMedia.data) {
        setImpostazioni({
          musica_url: resMedia.data.musica_url || '',
          attiva_musica: Boolean(resMedia.data.attiva_musica),
          video_url: resMedia.data.video_url || '',
          durata_video: resMedia.data.durata_video ?? 10,
          durata_tabellone: resMedia.data.durata_tabellone ?? 15,
          attiva_rotazione: Boolean(resMedia.data.attiva_rotazione),
          stato_riproduzione: resMedia.data.stato_riproduzione || 'play'
        });
      }
    } catch (err) {}
  };

  useEffect(() => {
    let isMounted = true;
    fetchData();

    const channel = supabase.channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assegnazioni_aule' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dettagli_orario_speciale' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impostazioni_tv' }, fetchData)
      .subscribe();

    return () => { 
      isMounted = false;
      supabase.removeChannel(channel); 
    };
  }, []);

  useEffect(() => {
    const info = assegnazioni[`${aula}-${giorno - 1}`];
    if (info) {
      setDocente(info.docente || ''); 
      setNota(info.nota || '');
      setUsaSpeciale(Boolean(info.usa_orario_speciale));
    } else {
      setDocente(''); 
      setNota(''); 
      setUsaSpeciale(false);
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
      aula_id: aula, 
      giorno_settimana: giorno, 
      docente: docente.trim().toUpperCase(), 
      nota: nota.trim(),
      usa_orario_speciale: usaSpeciale
    }, { onConflict: 'aula_id,giorno_settimana' });
    setCaricamento(false);
    if (!error) setMessaggio(`✅ Salvato Aula ${aula} (${giorni[giorno-1].label})`);
  };

  const handleAggiungiFasciaSpeciale = async () => {
    if (!docenteFascia) return;
    setCaricamento(true);
    const { error } = await supabase.from('dettagli_orario_speciale').insert({
      aula_id: aula,
      giorno_settimana: giorno,
      ora_inizio: oraInizioFascia,
      ora_fine: oraFineFascia,
      docente: docenteFascia.trim().toUpperCase(),
      nota: notaFascia.trim()
    });
    setCaricamento(false);
    if (!error) {
      setMessaggio('⏰ Fascia oraria aggiunta con successo!');
      setDocenteFascia('');
      setNotaFascia('');
      fetchData();
    }
  };

  const handleEliminaFasciaSpeciale = async (id: number) => {
    setCaricamento(true);
    const { error } = await supabase.from('dettagli_orario_speciale').delete().eq('id', id);
    setCaricamento(false);
    if (!error) {
      setMessaggio('🗑️ Fascia rimossa.');
      fetchData();
    }
  };

  const handleCancellaLezione = async () => {
    setCaricamento(true); setMessaggio(null);
    await supabase.from('dettagli_orario_speciale').delete().eq('aula_id', aula).eq('giorno_settimana', giorno);
    const { error } = await supabase.from('assegnazioni_aule').delete().eq('aula_id', aula).eq('giorno_settimana', giorno);
    setCaricamento(false);
    if (!error) setMessaggio(`🗑️ Aula ${aula} completamente svuotata.`);
  };

  const handleSalvaMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaricamento(true); setMessaggio(null);
    const { error } = await supabase.from('impostazioni_tv').update(impostazioni).eq('id', 1);
    setCaricamento(false);
    if (!error) setMessaggio('✅ Impostazioni TV salvate!');
  };

  const cambiaStatoAudio = async (nuovoStato: 'play' | 'pause') => {
    const aggiornato = { ...impostazioni, stato_riproduzione: nuovoStato };
    setImpostazioni(aggiornato);
    await supabase.from('impostazioni_tv').update({ stato_riproduzione: nuovoStato }).eq('id', 1);
    setMessaggio(nuovoStato === 'play' ? '▶️ Audio avviato in TV' : '⏸️ Audio messo in pausa in TV');
  };

  const handleSalvaSabato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataSabato) {
      setMessaggio('⚠️ Seleziona una data per il Sabato');
      return;
    }
    setCaricamento(true); setMessaggio(null);
    const { error } = await supabase.from('assegnazioni_aule').upsert({ 
      aula_id: aulaSabato, 
      giorno_settimana: 6, 
      docente: docenteSabato.trim().toUpperCase(), 
      nota: `Sabato ${dataSabato} - ${notaSabato.trim()}`,
    }, { onConflict: 'aula_id,giorno_settimana' });
    
    setCaricamento(false);
    if (!error) setMessaggio(`✅ Sabato (${dataSabato}) aggiunto per Aula ${aulaSabato}!`);
  };

  const fasceCorrentiAula = fasceSpeciali.filter(f => f.aula_id === aula && f.giorno_settimana === giorno);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* ANTEPRIMA A SINISTRA */}
      <div className="hidden lg:flex flex-1 flex-col p-6 bg-slate-100/50 border-r border-slate-200 overflow-auto">
        <div className="mb-4">
          <h2 className="text-2xl font-black text-slate-900">Anteprima TV Interattiva</h2>
          <p className="text-sm text-slate-500 font-medium">Clicca direttamente su una cella del calendario per modificarla.</p>
        </div>
        
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
                      <span className="font-bold text-[10px] text-slate-900 uppercase truncate w-full">
                        {info.usa_orario_speciale ? '⏰ [Speciale]' : info.docente}
                      </span>
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

      {/* PANNELLO DESTRO */}
      <div className="w-full lg:w-112.5 flex flex-col h-full bg-white shadow-2xl z-10 overflow-auto">
        
        <div className="flex p-2 border-b border-slate-100 bg-slate-50 gap-1 shrink-0">
          <button onClick={() => setSchedaAttiva('orari')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-colors ${schedaAttiva === 'orari' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            📅 Orari
          </button>
          <button onClick={() => setSchedaAttiva('sabato')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-colors ${schedaAttiva === 'sabato' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            🗓️ Sabato
          </button>
          <button onClick={() => setSchedaAttiva('media')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-colors ${schedaAttiva === 'media' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            🎬 Media
          </button>
        </div>

        <div className="flex-1 p-6">
          {messaggio && <div className="mb-6 p-4 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm text-center border border-emerald-200">{messaggio}</div>}

          {schedaAttiva === 'orari' && (
            <form onSubmit={handleSalvaCalendario} className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">Modifica Cella</h2>
                <p className="text-sm text-slate-500 font-medium">Gestisci orario standard o attiva le fasce orarie multiple.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Giorno</label>
                  <select value={giorno} onChange={e => setGiorno(Number(e.target.value))} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs outline-none">
                    {giorni.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Aula</label>
                  <select value={aula} onChange={e => setAula(Number(e.target.value))} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs outline-none">
                    {aule.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider">Insegnante Standard (se spento il flag)</label>
                <input type="text" placeholder="Es. CAPORASO" value={docente} onChange={e => setDocente(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-black uppercase outline-none focus:border-indigo-500"/>
                <input type="text" placeholder="Nota (Opzionale)" value={nota} onChange={e => setNota(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm outline-none focus:border-indigo-500"/>
              </div>

              {/* FLAG ORARIO SPECIALE CON FASCE MULTIPLE */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-indigo-950 uppercase">Attiva Orario a Fasce (Es. Natale / Solfeggio)?</span>
                  <button type="button" onClick={() => setUsaSpeciale(!usaSpeciale)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${usaSpeciale ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {usaSpeciale ? 'ATTIVO (SI)' : 'DISATTIVO (NO)'}
                  </button>
                </div>

                {usaSpeciale && (
                  <div className="space-y-3 pt-2 border-t border-indigo-100">
                    <p className="text-[11px] font-bold text-indigo-700">Aggiungi i blocchi orari per questa giornata:</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Inizio</label>
                        <input type="time" value={oraInizioFascia} onChange={e => setOraInizioFascia(e.target.value)} className="w-full p-2 rounded-lg bg-white border border-indigo-200 text-xs font-bold"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Fine</label>
                        <input type="time" value={oraFineFascia} onChange={e => setOraFineFascia(e.target.value)} className="w-full p-2 rounded-lg bg-white border border-indigo-200 text-xs font-bold"/>
                      </div>
                    </div>

                    <input type="text" placeholder="Docente o Attività (es. NATALE o SOLFEGGIO)" value={docenteFascia} onChange={e => setDocenteFascia(e.target.value)} className="w-full p-2.5 rounded-lg bg-white border border-indigo-200 text-slate-900 font-bold text-xs uppercase"/>
                    <input type="text" placeholder="Nota (Opzionale)" value={notaFascia} onChange={e => setNotaFascia(e.target.value)} className="w-full p-2.5 rounded-lg bg-white border border-indigo-200 text-slate-600 text-xs"/>

                    <button type="button" onClick={handleAggiungiFasciaSpeciale} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg shadow-sm">
                      + Aggiungi Fascia Oraria
                    </button>

                    {/* Lista fasce inserite per questa cella */}
                    <div className="space-y-1.5 pt-2">
                      {fasceCorrentiAula.map((f) => (
                        <div key={f.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-indigo-100 text-xs">
                          <div>
                            <span className="font-bold text-indigo-600">{f.ora_inizio} - {f.ora_fine}:</span> <span className="font-black uppercase">{f.docente}</span>
                          </div>
                          <button type="button" onClick={() => handleEliminaFasciaSpeciale(f.id)} className="text-rose-600 font-bold hover:underline px-1">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button type="submit" disabled={caricamento} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]">
                  SALVA NEL TABELLONE
                </button>
                <button type="button" onClick={handleCancellaLezione} disabled={caricamento} className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold py-2.5 rounded-xl transition-all text-xs">
                  Svuota questa cella
                </button>
              </div>
            </form>
          )}

          {schedaAttiva === 'sabato' && (
            <form onSubmit={handleSalvaSabato} className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">Sabato Straordinario</h2>
                <p className="text-sm text-slate-500 font-medium">Seleziona data e aula.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Data Sabato</label>
                  <input type="date" required value={dataSabato} onChange={e => setDataSabato(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Aula</label>
                  <select value={aulaSabato} onChange={e => setAulaSabato(Number(e.target.value))} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none">
                    {aule.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider">Docente Sabato</label>
                  <input type="text" required placeholder="Es. ROSSI" value={docenteSabato} onChange={e => setDocenteSabato(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-black uppercase outline-none"/>
                  <input type="text" placeholder="Orari / Nota" value={notaSabato} onChange={e => setNotaSabato(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm outline-none"/>
                </div>
              </div>
              <button type="submit" disabled={caricamento} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-200">
                AGGIUNGI SABATO 🗓️
              </button>
            </form>
          )}

          {schedaAttiva === 'media' && (
            <form onSubmit={handleSalvaMedia} className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Impostazioni TV</h2>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-800">Musica di Sottofondo</span>
                  <button type="button" onClick={() => setImpostazioni({...impostazioni, attiva_musica: !impostazioni.attiva_musica})} className={`px-3 py-1 rounded-lg text-xs font-bold ${impostazioni.attiva_musica ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{impostazioni.attiva_musica ? 'ON' : 'OFF'}</button>
                </div>
                <input type="text" placeholder="Link YouTube" value={impostazioni.musica_url} onChange={e => setImpostazioni({...impostazioni, musica_url: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none"/>
                <div className="flex gap-2">
                  <button type="button" onClick={() => cambiaStatoAudio('play')} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs">▶️ PLAY</button>
                  <button type="button" onClick={() => cambiaStatoAudio('pause')} className="flex-1 bg-rose-600 text-white font-bold py-2 rounded-xl text-xs">⏸️ PAUSA</button>
                </div>
              </div>
              <button type="submit" disabled={caricamento} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl">
                SALVA IMPOSTAZIONI
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
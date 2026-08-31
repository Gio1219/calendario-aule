"use client";
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';

// (Manteniamo i dati statici delle aule puliti)
const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const aule = [
  { id: 1, nome: 'Aula 1', artista: 'P. Daniele', tag: 'bg-amber-400' },
  { id: 2, nome: 'Aula 2', artista: 'C. Orff', tag: 'bg-sky-400' },
  { id: 3, nome: 'Aula 3', artista: 'F. Chopin', tag: 'bg-teal-400' },
  { id: 4, nome: 'Aula 4', artista: 'N. Paganini', tag: 'bg-cyan-400' },
  { id: 5, nome: 'Aula 5', artista: 'D. Krall', tag: 'bg-emerald-400' },
  { id: 6, nome: 'Aula 6', artista: 'R. Charles', tag: 'bg-green-400' },
  { id: 7, nome: 'Aula 7', artista: 'A. Toscanini', tag: 'bg-fuchsia-400' },
  { id: 8, nome: 'Aula 8', artista: 'J. Hendrix', tag: 'bg-orange-400' },
  { id: 9, nome: 'Aula 9', artista: 'M. Davis', tag: 'bg-lime-400' },
  { id: 10, nome: 'Aula 10', artista: 'J. Bonham', tag: 'bg-yellow-400' },
  { id: 11, nome: 'Aula 11', artista: 'Beatles', tag: 'bg-pink-400' },
];

export default function TabelloneTV() {
  const [assegnazioni, setAssegnazioni] = useState<Record<string, any>>({});
  const [impostazioni, setImpostazioni] = useState<any>({});
  const [vistaCorrente, setVistaCorrente] = useState<'tabellone' | 'video'>('tabellone');
  
  // Per i browser che bloccano l'audio in automatico, servirà un primo click (invisibile) sulla TV
  const [audioIniziato, setAudioIniziato] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // 1. Carica Calendario e Impostazioni
    const fetchDati = async () => {
      const [resOrari, resMedia] = await Promise.all([
        supabase.from('assegnazioni_aule').select('*'),
        supabase.from('impostazioni_tv').select('*').eq('id', 1).single()
      ]);
      
      if (resOrari.data) {
        const mappa: any = {};
        resOrari.data.forEach((item: any) => {
          mappa[`${item.aula_id}-${item.giorno_settimana - 1}`] = item;
        });
        setAssegnazioni(mappa);
      }
      if (resMedia.data) setImpostazioni(resMedia.data);
    };

    fetchDati();

    // 2. Iscrizione RealTime a ENTRAMBE le tabelle
    const channel = supabase.channel('tv-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assegnazioni_aule' }, fetchDati)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impostazioni_tv' }, fetchDati)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 3. Gestione del Timer (Rotazione Tabellone <-> Video)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (impostazioni.attiva_rotazione && impostazioni.video_url) {
      if (vistaCorrente === 'tabellone') {
        // Mostra Tabellone, poi passa a Video
        timer = setTimeout(() => setVistaCorrente('video'), (impostazioni.durata_tabellone || 15) * 1000);
      } else {
        // Mostra Video, poi passa a Tabellone
        timer = setTimeout(() => setVistaCorrente('tabellone'), (impostazioni.durata_video || 10) * 1000);
      }
    } else {
      setVistaCorrente('tabellone');
    }

    return () => clearTimeout(timer);
  }, [vistaCorrente, impostazioni]);

  // Gestione Audio Policy del Browser (Necessita di interazione)
  const avviaAudio = () => {
    if (audioRef.current && impostazioni.attiva_musica) {
      audioRef.current.play().catch(e => console.log("Autoplay bloccato", e));
      setAudioIniziato(true);
    }
  };

  return (
    <main 
      onClick={avviaAudio} // Clicca ovunque sulla TV per sbloccare l'audio la prima volta
      className="h-screen w-screen bg-slate-900 overflow-hidden font-sans select-none relative"
    >
      {/* PLAYER AUDIO INVISIBILE */}
      {impostazioni.attiva_musica && impostazioni.musica_url && (
        <audio ref={audioRef} src={impostazioni.musica_url} loop autoPlay hidden />
      )}
      
      {/* Bottone sblocco audio per TV */}
      {!audioIniziato && impostazioni.attiva_musica && (
        <div className="absolute z-50 bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-xl text-xs font-bold animate-bounce cursor-pointer">
          👆 Tocca lo schermo per attivare la musica
        </div>
      )}

      {/* VISTA 1: IL VIDEO PROMOZIONALE */}
      <div className={`absolute inset-0 transition-opacity duration-1000 z-10 ${vistaCorrente === 'video' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
         {impostazioni.video_url && (
           <video 
             src={impostazioni.video_url} 
             autoPlay loop muted // Silenzioso perché abbiamo già la musica di sottofondo
             className="w-full h-full object-cover"
           />
         )}
      </div>

      {/* VISTA 2: IL TABELLONE ORARI */}
      <div className={`absolute inset-0 bg-slate-200 p-2 md:p-3.5 flex flex-col transition-opacity duration-1000 z-20 ${vistaCorrente === 'tabellone' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="w-full h-full bg-slate-100 border border-slate-300/80 rounded-2xl p-1.5 shadow-xl grid grid-cols-6 grid-rows-12 gap-1 overflow-hidden">
          
          <div className="bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg md:text-xl tracking-widest uppercase shadow-md">
            AULE
          </div>
          {giorni.map((giorno) => (
            <div key={giorno} className="bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg md:text-xl uppercase tracking-wider shadow-md border border-indigo-500">
              {giorno}
            </div>
          ))}

          {aule.map((aula) => (
            <React.Fragment key={aula.id}>
              
              <div className="bg-white border-2 border-slate-200 rounded-xl flex items-center px-2 py-0.5 space-x-3 shadow-sm overflow-hidden">
                <div className={`w-3.5 h-10 rounded-lg shrink-0 ${aula.tag} shadow-sm`} />
                <div className="flex flex-col min-w-0 justify-center">
                  <span className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tight leading-none truncate">{aula.nome}</span>
                  <span className="font-extrabold text-[10px] md:text-xs text-indigo-600 uppercase leading-none truncate mt-1">{aula.artista}</span>
                </div>
              </div>

              {giorni.map((_, indexGiorno) => {
                const info = assegnazioni[`${aula.id}-${indexGiorno}`];
                const haDoppio = Boolean(info?.docente_2);

                return (
                  <div key={`${aula.id}-${indexGiorno}`} className="bg-white border-2 border-slate-200 rounded-xl flex flex-col overflow-hidden p-0.5 justify-center shadow-sm">
                    {info?.docente || info?.docente_2 ? (
                      haDoppio ? (
                        <div className="flex flex-col h-full w-full justify-between gap-0.5">
                          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center px-1 overflow-hidden">
                            <span className="text-slate-900 font-black text-xs md:text-sm uppercase tracking-wide truncate w-full text-center">{info.docente || '—'}</span>
                            {info.nota && <span className="text-indigo-600 font-extrabold text-[9px] truncate w-full text-center mt-0.5">{info.nota}</span>}
                          </div>
                          <div className="flex-1 bg-indigo-50/70 border border-indigo-200 rounded-lg flex flex-col items-center justify-center px-1 overflow-hidden">
                            <span className="text-indigo-950 font-black text-xs md:text-sm uppercase tracking-wide truncate w-full text-center">{info.docente_2}</span>
                            {info.nota_2 && <span className="text-indigo-600 font-extrabold text-[9px] truncate w-full text-center mt-0.5">{info.nota_2}</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full bg-slate-50/60 rounded-lg flex flex-col items-center justify-center px-1 py-0.5 overflow-hidden">
                          <span className="text-slate-950 font-black text-base md:text-lg uppercase tracking-wide truncate w-full text-center">{info.docente}</span>
                          {info.nota && <span className="text-indigo-600 font-black text-[10px] md:text-xs truncate w-full text-center mt-0.5">{info.nota}</span>}
                        </div>
                      )
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-slate-300 font-normal text-xs">—</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </main>
  );
}
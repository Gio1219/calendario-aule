"use client";
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';

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

const getYouTubeId = (url: string) => {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=))([^"&?\/\s]{11})/);
  return match ? match[1] : '';
};

const getYouTubeEmbedUrl = (url: string, isLive: boolean = false) => {
  const videoId = getYouTubeId(url);
  if (!videoId) return url;
  if (isLive) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  }
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`;
};

export default function TabelloneTV() {
  const [assegnazioni, setAssegnazioni] = useState<Record<string, any>>({});
  const [impostazioni, setImpostazioni] = useState<any>({});
  const [vistaCorrente, setVistaCorrente] = useState<'tabellone' | 'video'>('tabellone');
  const [avviato, setAvviato] = useState(false);
  
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchDati = async () => {
      try {
        const [resOrari, resMedia] = await Promise.all([
          supabase.from('assegnazioni_aule').select('*'),
          supabase.from('impostazioni_tv').select('*').eq('id', 1).single()
        ]);
        
        if (!isMounted) return;
        
        if (resOrari.data) {
          const mappa: any = {};
          resOrari.data.forEach((item: any) => { mappa[`${item.aula_id}-${item.giorno_settimana - 1}`] = item; });
          setAssegnazioni(mappa);
        }
        if (resMedia.data) {
          setImpostazioni(resMedia.data);
          if (resMedia.data.stato_riproduzione === 'play') {
            setAvviato(true);
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    };

    fetchDati();

    const channel = supabase.channel('tv-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assegnazioni_aule' }, () => fetchDati())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impostazioni_tv' }, (payload: any) => {
        if (payload.new) {
          setImpostazioni(payload.new);
          if (payload.new.stato_riproduzione === 'play') {
            setAvviato(true);
            comandaPlayer('playVideo');
          } else if (payload.new.stato_riproduzione === 'pause') {
            comandaPlayer('pauseVideo');
          }
        }
      })
      .subscribe();

    return () => { 
      isMounted = false; 
      supabase.removeChannel(channel); 
    };
  }, []);

  const comandaPlayer = (comando: 'playVideo' | 'pauseVideo') => {
    if (playerRef.current && playerRef.current.contentWindow) {
      playerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: comando, args: [] }),
        '*'
      );
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (impostazioni.attiva_rotazione && impostazioni.video_url) {
      if (vistaCorrente === 'tabellone') {
        timer = setTimeout(() => setVistaCorrente('video'), (impostazioni.durata_tabellone || 15) * 1000);
      } else {
        timer = setTimeout(() => setVistaCorrente('tabellone'), (impostazioni.durata_video || 10) * 1000);
      }
    } else {
      setVistaCorrente('tabellone');
    }
    return () => clearTimeout(timer);
  }, [vistaCorrente, impostazioni]);

  const handleAvviaTV = () => {
    setAvviato(true);
    comandaPlayer('playVideo');
  };

  const videoIdMusica = getYouTubeId(impostazioni.musica_url);

  return (
    <main className="h-screen w-screen bg-slate-900 overflow-hidden font-sans select-none relative">
      
      {/* 🎵 LETTORE AUDIO INVISIBILE IN BACKGROUND */}
      {impostazioni.attiva_musica && videoIdMusica && avviato && impostazioni.stato_riproduzione === 'play' && (
        <div className="absolute top-[-9999px] left-[-9999px] w-px h-px opacity-0 pointer-events-none overflow-hidden">
          <iframe 
            ref={playerRef}
            src={`https://www.youtube.com/embed/${videoIdMusica}?autoplay=1&enablejsapi=1&controls=0`}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}

      {/* SCHERMATA DI AVVIO OBBLIGATORIO (Sblocco telecomando Fire TV) */}
      {!avviato && (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-indigo-600 border border-indigo-400 p-10 rounded-3xl shadow-2xl max-w-lg flex flex-col items-center space-y-6">
            <span className="text-5xl">🚀</span>
            <h2 className="text-3xl font-black text-white tracking-tight">Avvia il Display TV</h2>
            <p className="text-sm text-indigo-100 font-medium leading-relaxed">
              Premi il tasto centrale del telecomando per avviare il tabellone a schermo intero e attivare l'audio in background.
            </p>
            <button 
              onClick={handleAvviaTV}
              className="w-full bg-white hover:bg-slate-100 text-indigo-950 font-black py-5 px-8 rounded-2xl shadow-xl transition-all active:scale-95 text-xl cursor-pointer"
            >
              AVVIA TV 🚀
            </button>
          </div>
        </div>
      )}

      {/* VISTA 1: VIDEO PROMOZIONALE */}
      <div className={`absolute inset-0 transition-opacity duration-1000 z-10 ${vistaCorrente === 'video' ? 'opacity-100' : 'opacity-0 pointer-events-none bg-black'}`}>
        {impostazioni.video_url && (
          <iframe 
            src={getYouTubeEmbedUrl(impostazioni.video_url, false)}
            className="w-full h-full border-0 pointer-events-none"
            allow="autoplay; encrypted-media"
          />
        )}
      </div>

      {/* VISTA 2: TABELLONE ORARI */}
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
                <div className={`w-3.5 h-12 rounded-lg shrink-0 ${aula.tag} shadow-sm`} />
                <div className="flex flex-col min-w-0 justify-center">
                  <span className="font-black text-2xl md:text-3xl text-slate-900 uppercase tracking-tight leading-none truncate mt-1">
                    {aula.nome}
                  </span>
                  <span className="font-extrabold text-[10px] md:text-xs text-indigo-600 uppercase leading-none truncate mt-0.5 mb-1">
                    {aula.artista}
                  </span>
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
                            <span className="text-slate-900 font-black text-base md:text-lg lg:text-xl uppercase tracking-tight truncate w-full text-center leading-none mt-0.5">{info.docente || '—'}</span>
                            {info.nota && <span className="text-indigo-600 font-extrabold text-[9px] md:text-[10px] truncate w-full text-center mt-0.5 leading-none">{info.nota}</span>}
                          </div>
                          <div className="flex-1 bg-indigo-50/70 border border-indigo-200 rounded-lg flex flex-col items-center justify-center px-1 overflow-hidden">
                            <span className="text-indigo-950 font-black text-base md:text-lg lg:text-xl uppercase tracking-tight truncate w-full text-center leading-none mt-0.5">{info.docente_2}</span>
                            {info.nota_2 && <span className="text-indigo-600 font-extrabold text-[9px] md:text-[10px] truncate w-full text-center mt-0.5 leading-none">{info.nota_2}</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full bg-slate-50/60 rounded-lg flex flex-col items-center justify-center px-1 py-0.5 overflow-hidden">
                          <span className="text-slate-950 font-black text-xl md:text-2xl lg:text-3xl uppercase tracking-wide truncate w-full text-center">{info.docente}</span>
                          {info.nota && <span className="text-indigo-600 font-black text-[10px] md:text-xs truncate w-full text-center mt-0.5">{info.nota}</span>}
                        </div>
                      )
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-slate-300 font-normal text-xs md:text-sm">—</span>
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
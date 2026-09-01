"use client";
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';

const aule = [
  { id: 1, nome: 'Aula 1', artista: 'P. Daniele', tag: 'bg-red-500' },
  { id: 2, nome: 'Aula 2', artista: 'C. Orff', tag: 'bg-sky-400' },
  { id: 3, nome: 'Aula 3', artista: 'F. Chopin', tag: 'bg-amber-400' },
  { id: 4, nome: 'Aula 4', artista: 'N. Paganini', tag: 'bg-violet-500' },
  { id: 5, nome: 'Aula 5', artista: 'D. Krall', tag: 'bg-emerald-500' },
  { id: 6, nome: 'Aula 6', artista: 'R. Charles', tag: 'bg-orange-500' },
  { id: 7, nome: 'Aula 7', artista: 'A. Toscanini', tag: 'bg-indigo-500' },
  { id: 8, nome: 'Aula 8', artista: 'J. Hendrix', tag: 'bg-lime-400' },
  { id: 9, nome: 'Aula 9', artista: 'M. Davis', tag: 'bg-fuchsia-500' },
  { id: 10, nome: 'Aula 10', artista: 'J. Bonham', tag: 'bg-teal-400' },
  { id: 11, nome: 'Aula 11', artista: 'Beatles', tag: 'bg-rose-500' },
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

export default function TabelloneTVGiornaliero() {
  const [assegnazioni, setAssegnazioni] = useState<Record<string, any>>({});
  const [fasceSpeciali, setFasceSpeciali] = useState<any[]>([]);
  const [impostazioni, setImpostazioni] = useState<any>({});
  const [vistaCorrente, setVistaCorrente] = useState<'tabellone' | 'video'>('tabellone');
  const [oraCorrente, setOraCorrente] = useState(new Date());

  // Aggiorna l'orologio ogni 30 secondi per gestire i cambi automatici di fascia
  useEffect(() => {
    const timer = setInterval(() => setOraCorrente(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  
  const dataOggi = new Date();
  const indiceGiornoJS = dataOggi.getDay();
  const giornoIndexDB = indiceGiornoJS === 0 ? 1 : indiceGiornoJS; 
  const nomeGiornoCorrente = dataOggi.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchDati = async () => {
      try {
        const [resOrari, resSpeciali, resMedia] = await Promise.all([
          supabase.from('assegnazioni_aule').select('*'),
          supabase.from('dettagli_orario_speciale').select('*'),
          supabase.from('impostazioni_tv').select('*').eq('id', 1).single()
        ]);
        
        if (!isMounted) return;
        
        if (resOrari.data) {
          const mappa: any = {};
          resOrari.data.forEach((item: any) => { 
            mappa[`${item.aula_id}-${item.giorno_settimana}`] = item; 
          });
          setAssegnazioni(mappa);
        }
        if (resSpeciali.data) {
          setFasceSpeciali(resSpeciali.data);
        }
        if (resMedia.data) {
          setImpostazioni(resMedia.data);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    };

    fetchDati();

    const channel = supabase.channel('tv-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assegnazioni_aule' }, () => fetchDati())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dettagli_orario_speciale' }, () => fetchDati())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impostazioni_tv' }, (payload: any) => {
        if (payload.new) {
          setImpostazioni(payload.new);
          if (payload.new.stato_riproduzione === 'play') {
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

  const attivaAudioManuale = () => {
    comandaPlayer('playVideo');
  };

  const videoIdMusica = getYouTubeId(impostazioni.musica_url);

  const renderCardAula = (aula: typeof aule[0]) => {
    const info = assegnazioni[`${aula.id}-${giornoIndexDB}`];
    const oraAttualeStr = oraCorrente.toTimeString().slice(0, 5); // Es. "16:50"

    // Se il flag dell'orario speciale è attivo, cerchiamo la fascia oraria corrispondente all'ora attuale
    let docenteDaMostrare = info?.docente;
    let notaDaMostrare = info?.nota;

    if (info?.usa_orario_speciale) {
      const fasciaTrovata = fasceSpeciali.find((f) => {
        return f.aula_id === aula.id && f.giorno_settimana === giornoIndexDB && oraAttualeStr >= f.ora_inizio && oraAttualeStr <= f.ora_fine;
      });

      if (fasciaTrovata) {
        docenteDaMostrare = fasciaTrovata.docente;
        notaDaMostrare = `${fasciaTrovata.ora_inizio} - ${fasciaTrovata.ora_fine} ${fasciaTrovata.nota ? `(${fasciaTrovata.nota})` : ''}`;
      } else {
        docenteDaMostrare = null; // Libera se in quel momento non c'è nessuna fascia attiva
      }
    }

    return (
      <div key={aula.id} className="bg-white border-2 border-slate-200 rounded-xl p-2 flex items-center space-x-3 shadow-sm overflow-hidden flex-1">
        <div className={`w-3 h-full rounded-lg shrink-0 ${aula.tag} shadow-sm`} />
        
        <div className="flex flex-col min-w-0 justify-center flex-1">
          <div className="flex items-baseline justify-between mb-0.5">
            <span className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tight truncate">
              {aula.nome}
            </span>
            <span className="font-black text-[10px] text-indigo-600 uppercase tracking-wide truncate ml-2 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {aula.artista}
            </span>
          </div>

          <div>
            {docenteDaMostrare ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center justify-between">
                <span className="text-slate-950 font-black text-base md:text-lg uppercase tracking-wide truncate">
                  {docenteDaMostrare}
                </span>
                <span className="text-indigo-600 font-bold text-[11px] truncate ml-2">
                  {notaDaMostrare}
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 flex items-center justify-center">
                <span className="text-emerald-700 font-black text-[11px] uppercase tracking-wider">
                  🟢 AULA ATTUALMENTE LIBERA
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="h-screen w-screen bg-slate-900 overflow-hidden font-sans select-none relative">
      
      {impostazioni.attiva_musica && videoIdMusica && impostazioni.stato_riproduzione === 'play' && (
        <div className="absolute top-[-9999px] left-[-9999px] w-px h-px opacity-0 pointer-events-none overflow-hidden">
          <iframe 
            ref={playerRef}
            src={`https://www.youtube.com/embed/${videoIdMusica}?autoplay=1&enablejsapi=1&controls=0`}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}

      <div className={`absolute inset-0 transition-opacity duration-1000 z-10 ${vistaCorrente === 'video' ? 'opacity-100' : 'opacity-0 pointer-events-none bg-black'}`}>
        {impostazioni.video_url && (
          <iframe 
            src={getYouTubeEmbedUrl(impostazioni.video_url, false)}
            className="w-full h-full border-0 pointer-events-none"
            allow="autoplay; encrypted-media"
          />
        )}
      </div>

      <div className={`absolute inset-0 bg-slate-200 p-2 md:p-3 flex flex-col transition-opacity duration-1000 z-20 ${vistaCorrente === 'tabellone' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        <div className="w-full h-full bg-slate-100 border border-slate-300/80 rounded-2xl p-2 shadow-2xl flex flex-col overflow-hidden">
          
          <div className="bg-indigo-600 text-white rounded-xl py-2 px-5 mb-2 flex items-center justify-between shadow-md border border-indigo-500 shrink-0">
            <span className="font-black text-xl md:text-2xl uppercase tracking-wider">
              {nomeGiornoCorrente}
            </span>
            
            <div className="flex items-center gap-2.5">
              <button 
                onClick={attivaAudioManuale}
                className="bg-indigo-500/50 hover:bg-indigo-400 text-white text-xs font-bold px-3.5 py-1 rounded-lg border border-indigo-400 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                title="Premi per sbloccare l'audio"
              >
                <span>🎵</span> Sblocca audio
              </button>

              <span className="text-xs font-bold bg-indigo-700 px-3.5 py-1 rounded-lg uppercase tracking-widest">
                Nuova Accademia Toscanini
              </span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden items-stretch">
            <div className="flex flex-col gap-1.5 h-full">
              {aule.slice(0, 6).map((aula) => renderCardAula(aula))}
            </div>

            <div className="flex flex-col gap-1.5 h-full">
              {aule.slice(6, 11).map((aula) => renderCardAula(aula))}
            </div>
          </div>

        </div>
      </div>

    </main>
  );
}
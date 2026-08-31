"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

const aule = [
  { id: 1, nome: 'Aula 1', artista: 'P. Daniele', tag: 'bg-amber-500 text-slate-950 ring-amber-300' },
  { id: 2, nome: 'Aula 2', artista: 'C. Orff', tag: 'bg-sky-500 text-slate-950 ring-sky-300' },
  { id: 3, nome: 'Aula 3', artista: 'F. Chopin', tag: 'bg-teal-500 text-slate-950 ring-teal-300' },
  { id: 4, nome: 'Aula 4', artista: 'N. Paganini', tag: 'bg-cyan-500 text-slate-950 ring-cyan-300' },
  { id: 5, nome: 'Aula 5', artista: 'D. Krall', tag: 'bg-emerald-500 text-slate-950 ring-emerald-300' },
  { id: 6, nome: 'Aula 6', artista: 'R. Charles', tag: 'bg-green-500 text-slate-950 ring-green-300' },
  { id: 7, nome: 'Aula 7', artista: 'A. Toscanini', tag: 'bg-fuchsia-500 text-slate-950 ring-fuchsia-300' },
  { id: 8, nome: 'Aula 8', artista: 'J. Hendrix', tag: 'bg-orange-500 text-slate-950 ring-orange-300' },
  { id: 9, nome: 'Aula 9', artista: 'M. Davis', tag: 'bg-lime-500 text-slate-950 ring-lime-300' },
  { id: 10, nome: 'Aula 10', artista: 'J. Bonham', tag: 'bg-yellow-500 text-slate-950 ring-yellow-300' },
  { id: 11, nome: 'Aula 11', artista: 'Beatles', tag: 'bg-pink-500 text-slate-950 ring-pink-300' },
];

type ItemData = { 
  docente: string; 
  nota?: string;
  docente_2?: string;
  nota_2?: string;
};
type Assegnazioni = Record<string, ItemData>;

export default function TabelloneTV() {
  const [assegnazioni, setAssegnazioni] = useState<Assegnazioni>({});

  useEffect(() => {
    const fetchAssegnazioni = async () => {
      const { data, error } = await supabase.from('assegnazioni_aule').select('*');
      if (!error && data) {
        const mappa: Assegnazioni = {};
        data.forEach((item: { aula_id: number; giorno_settimana: number; docente: string; nota?: string; docente_2?: string; nota_2?: string }) => {
          mappa[`${item.aula_id}-${item.giorno_settimana - 1}`] = {
            docente: item.docente,
            nota: item.nota,
            docente_2: item.docente_2,
            nota_2: item.nota_2
          };
        });
        setAssegnazioni(mappa);
      }
    };

    fetchAssegnazioni();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assegnazioni_aule' },
        () => {
          fetchAssegnazioni();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    // Sfondo Scuro con Safe-Area (Overscan TV 32-42")
    <main className="h-screen w-screen bg-slate-950 p-2 md:p-4 flex flex-col overflow-hidden font-sans select-none antialiased">
      
      {/* Contenitore Tabellone TV */}
      <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl grid grid-cols-6 grid-rows-12 gap-1 overflow-hidden">
        
        {/* Intestazione Titolo AULE */}
        <div className="bg-linear-to-br from-slate-800 to-slate-900 border border-slate-700/60 rounded-xl flex items-center justify-center font-black text-lg md:text-xl text-indigo-400 tracking-widest uppercase shadow-md">
          AULE
        </div>

        {/* Intestazione Giorni Infrasettimanali */}
        {giorni.map((giorno) => (
          <div
            key={giorno}
            className="bg-linear-to-r from-indigo-600 to-indigo-700 text-white rounded-xl flex items-center justify-center font-black text-lg md:text-xl uppercase tracking-wider shadow-lg border border-indigo-500/30"
          >
            {giorno}
          </div>
        ))}

        {/* Righe Aule e Celle */}
        {aule.map((aula) => (
          <React.Fragment key={aula.id}>
            
            {/* Badge Aula Fissa */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl flex items-center px-2 py-0.5 space-x-2 shadow-sm overflow-hidden">
              <div className={`w-2.5 h-8 rounded-lg shrink-0 ${aula.tag.split(' ')[0]} shadow-sm`} />
              <div className="flex flex-col min-w-0 justify-center">
                <span className="font-black text-sm md:text-base text-slate-100 uppercase tracking-tight leading-tight truncate">
                  {aula.nome}
                </span>
                <span className="font-bold text-[10px] text-indigo-400 uppercase leading-none truncate mt-0.5">
                  {aula.artista}
                </span>
              </div>
            </div>

            {/* 5 Celle dei giorni per la TV (Supporto Cella Singola o Doppia) */}
            {giorni.map((_, indexGiorno) => {
              const info = assegnazioni[`${aula.id}-${indexGiorno}`];
              const haDoppio = Boolean(info?.docente_2);

              return (
                <div
                  key={`${aula.id}-${indexGiorno}`}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-xl flex flex-col overflow-hidden p-0.5 justify-center shadow-inner"
                >
                  {info?.docente || info?.docente_2 ? (
                    haDoppio ? (
                      /* Layout a 2 Insegnanti nella stessa aula */
                      <div className="flex flex-col h-full w-full justify-between gap-0.5">
                        {/* Turno 1 */}
                        <div className="flex-1 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center px-1 leading-none overflow-hidden">
                          <span className="text-slate-950 font-black text-xs md:text-sm uppercase tracking-wide truncate w-full text-center">
                            {info.docente || '—'}
                          </span>
                          {info.nota && (
                            <span className="text-indigo-600 font-bold text-[9px] truncate w-full text-center leading-none mt-0.5">
                              {info.nota}
                            </span>
                          )}
                        </div>
                        {/* Turno 2 */}
                        <div className="flex-1 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-col items-center justify-center px-1 leading-none overflow-hidden">
                          <span className="text-indigo-950 font-black text-xs md:text-sm uppercase tracking-wide truncate w-full text-center">
                            {info.docente_2}
                          </span>
                          {info.nota_2 && (
                            <span className="text-indigo-600 font-bold text-[9px] truncate w-full text-center leading-none mt-0.5">
                              {info.nota_2}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Layout a Insegnante Singolo (Intera Giornata) */
                      <div className="h-full w-full bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center px-1 py-0.5 shadow-sm overflow-hidden">
                        <span className="text-slate-950 font-black text-base md:text-lg uppercase tracking-wide truncate w-full text-center leading-tight">
                          {info.docente}
                        </span>
                        {info.nota && (
                          <span className="text-indigo-600 font-extrabold text-[10px] md:text-xs truncate w-full text-center leading-none mt-0.5">
                            {info.nota}
                          </span>
                        )}
                      </div>
                    )
                  ) : (
                    /* Cella Vuota */
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-slate-600 font-normal text-xs">—</span>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </main>
  );
}
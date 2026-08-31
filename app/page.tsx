"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

const aule = [
  { id: 1, nome: 'Aula 1', artista: 'P. Daniele', tag: 'bg-amber-400 text-amber-950 border-amber-300' },
  { id: 2, nome: 'Aula 2', artista: 'C. Orff', tag: 'bg-sky-400 text-sky-950 border-sky-300' },
  { id: 3, nome: 'Aula 3', artista: 'F. Chopin', tag: 'bg-teal-400 text-teal-950 border-teal-300' },
  { id: 4, nome: 'Aula 4', artista: 'N. Paganini', tag: 'bg-cyan-400 text-cyan-950 border-cyan-300' },
  { id: 5, nome: 'Aula 5', artista: 'D. Krall', tag: 'bg-emerald-400 text-emerald-950 border-emerald-300' },
  { id: 6, nome: 'Aula 6', artista: 'R. Charles', tag: 'bg-green-400 text-green-950 border-green-300' },
  { id: 7, nome: 'Aula 7', artista: 'A. Toscanini', tag: 'bg-fuchsia-400 text-fuchsia-950 border-fuchsia-300' },
  { id: 8, nome: 'Aula 8', artista: 'J. Hendrix', tag: 'bg-orange-400 text-orange-950 border-orange-300' },
  { id: 9, nome: 'Aula 9', artista: 'M. Davis', tag: 'bg-lime-400 text-lime-950 border-lime-300' },
  { id: 10, nome: 'Aula 10', artista: 'J. Bonham', tag: 'bg-yellow-400 text-yellow-950 border-yellow-300' },
  { id: 11, nome: 'Aula 11', artista: 'Beatles', tag: 'bg-pink-400 text-pink-950 border-pink-300' },
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
    <main className="h-screen w-screen bg-slate-200 p-2 md:p-3.5 flex flex-col overflow-hidden font-sans select-none antialiased">
      <div className="w-full h-full bg-slate-100 border border-slate-300/80 rounded-2xl p-1.5 shadow-xl grid grid-cols-6 grid-rows-12 gap-1 overflow-hidden">
        
        {/* Header Colonne */}
        <div className="bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg md:text-xl tracking-widest uppercase shadow-md border border-slate-800">
          AULE
        </div>
        {giorni.map((giorno) => (
          <div key={giorno} className="bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg md:text-xl uppercase tracking-wider shadow-md border border-indigo-500">
            {giorno}
          </div>
        ))}

        {/* Righe Aule */}
        {aule.map((aula) => (
          <React.Fragment key={aula.id}>
            
            {/* BADGE AULA FISSA - NOME INGRANDITO */}
            <div className="bg-white border-2 border-slate-200 rounded-xl flex items-center px-2 py-0.5 space-x-3 shadow-sm overflow-hidden">
              <div className={`w-3.5 h-10 rounded-lg shrink-0 ${aula.tag.split(' ')[0]} shadow-sm border border-black/10`} />
              <div className="flex flex-col min-w-0 justify-center">
                {/* Nome aula molto più grande */}
                <span className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tight leading-none truncate">
                  {aula.nome}
                </span>
                {/* Artista invariato */}
                <span className="font-extrabold text-[10px] md:text-xs text-indigo-600 uppercase leading-none truncate mt-1">
                  {aula.artista}
                </span>
              </div>
            </div>

            {/* 5 Celle dei giorni */}
            {giorni.map((_, indexGiorno) => {
              const info = assegnazioni[`${aula.id}-${indexGiorno}`];
              const haDoppio = Boolean(info?.docente_2);

              return (
                <div key={`${aula.id}-${indexGiorno}`} className="bg-white border-2 border-slate-200 rounded-xl flex flex-col overflow-hidden p-0.5 justify-center shadow-sm">
                  {info?.docente || info?.docente_2 ? (
                    haDoppio ? (
                      <div className="flex flex-col h-full w-full justify-between gap-0.5">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center px-1 leading-none overflow-hidden">
                          <span className="text-slate-900 font-black text-xs md:text-sm uppercase tracking-wide truncate w-full text-center">{info.docente || '—'}</span>
                          {info.nota && <span className="text-indigo-600 font-extrabold text-[9px] truncate w-full text-center leading-none mt-0.5">{info.nota}</span>}
                        </div>
                        <div className="flex-1 bg-indigo-50/70 border border-indigo-200 rounded-lg flex flex-col items-center justify-center px-1 leading-none overflow-hidden">
                          <span className="text-indigo-950 font-black text-xs md:text-sm uppercase tracking-wide truncate w-full text-center">{info.docente_2}</span>
                          {info.nota_2 && <span className="text-indigo-600 font-extrabold text-[9px] truncate w-full text-center leading-none mt-0.5">{info.nota_2}</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full w-full bg-slate-50/60 rounded-lg flex flex-col items-center justify-center px-1 py-0.5 overflow-hidden">
                        <span className="text-slate-950 font-black text-base md:text-lg uppercase tracking-wide truncate w-full text-center leading-tight">{info.docente}</span>
                        {info.nota && <span className="text-indigo-600 font-black text-[10px] md:text-xs truncate w-full text-center leading-none mt-0.5">{info.nota}</span>}
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
    </main>
  );
}
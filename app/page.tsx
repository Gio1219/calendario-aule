"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

const aule = [
  { id: 1, nome: 'Aula 1', artista: 'P. Daniele', color: 'bg-amber-100 text-amber-950 border-amber-300' },
  { id: 2, nome: 'Aula 2', artista: 'C. Orff', color: 'bg-sky-100 text-sky-950 border-sky-300' },
  { id: 3, nome: 'Aula 3', artista: 'F. Chopin', color: 'bg-teal-100 text-teal-950 border-teal-300' },
  { id: 4, nome: 'Aula 4', artista: 'N. Paganini', color: 'bg-cyan-100 text-cyan-950 border-cyan-300' },
  { id: 5, nome: 'Aula 5', artista: 'D. Krall', color: 'bg-emerald-100 text-emerald-950 border-emerald-300' },
  { id: 6, nome: 'Aula 6', artista: 'R. Charles', color: 'bg-green-100 text-green-950 border-green-300' },
  { id: 7, nome: 'Aula 7', artista: 'A. Toscanini', color: 'bg-fuchsia-100 text-fuchsia-950 border-fuchsia-300' },
  { id: 8, nome: 'Aula 8', artista: 'J. Hendrix', color: 'bg-orange-100 text-orange-950 border-orange-300' },
  { id: 9, nome: 'Aula 9', artista: 'M. Davis', color: 'bg-lime-100 text-lime-950 border-lime-300' },
  { id: 10, nome: 'Aula 10', artista: 'J. Bonham', color: 'bg-yellow-100 text-yellow-950 border-yellow-300' },
  { id: 11, nome: 'Aula 11', artista: 'Beatles', color: 'bg-pink-100 text-pink-950 border-pink-300' },
];

type ItemData = { docente: string; nota?: string };
type Assegnazioni = Record<string, ItemData>;

export default function TabelloneTV() {
  const [assegnazioni, setAssegnazioni] = useState<Assegnazioni>({});

  useEffect(() => {
    const fetchAssegnazioni = async () => {
      const { data, error } = await supabase.from('assegnazioni_aule').select('*');
      if (!error && data) {
        const mappa: Assegnazioni = {};
        data.forEach((item: { aula_id: number; giorno_settimana: number; docente: string; nota?: string }) => {
          mappa[`${item.aula_id}-${item.giorno_settimana - 1}`] = {
            docente: item.docente,
            nota: item.nota
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
    // Sfondo esterno scuro per la safe area anti-overscan
    <main className="h-screen w-screen bg-slate-900 p-3 md:p-5 flex flex-col justify-center items-center overflow-hidden font-sans select-none">
      
      {/* Contenitore interno griglia con bordi arrotondati e ombra */}
      <div className="w-full h-full bg-slate-100 p-2 rounded-2xl shadow-2xl grid grid-cols-6 grid-rows-12 gap-1.5 overflow-hidden">
        
        {/* Intestazione AULE */}
        <div className="bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-lg tracking-wider uppercase border border-slate-800">
          AULE
        </div>

        {/* Intestazione Giorni */}
        {giorni.map((giorno) => (
          <div
            key={giorno}
            className="bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-lg uppercase tracking-wider shadow-sm"
          >
            {giorno}
          </div>
        ))}

        {/* Righe Aule e Celle */}
        {aule.map((aula) => (
          <React.Fragment key={aula.id}>
            {/* Colonna Aula Fissa */}
            <div
              className={`${aula.color} rounded-lg flex flex-col items-center justify-center px-1 border-2 shadow-sm text-center leading-none overflow-hidden`}
            >
              <span className="font-black text-base tracking-tight uppercase leading-none">{aula.nome}</span>
              <span className="font-bold text-[11px] opacity-80 uppercase mt-0.5 leading-none">{aula.artista}</span>
            </div>

            {/* 5 Celle dei giorni */}
            {giorni.map((_, indexGiorno) => {
              const info = assegnazioni[`${aula.id}-${indexGiorno}`];
              return (
                <div
                  key={`${aula.id}-${indexGiorno}`}
                  className="bg-white border-2 border-slate-200 rounded-lg flex flex-col items-center justify-center px-1 text-center shadow-sm overflow-hidden"
                >
                  {info?.docente ? (
                    <>
                      <span className="text-indigo-950 font-black tracking-wide text-base md:text-lg uppercase leading-tight truncate w-full">
                        {info.docente}
                      </span>
                      {info.nota && (
                        <span className="text-indigo-600 font-bold text-[11px] tracking-normal leading-tight truncate w-full mt-0.5">
                          {info.nota}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-300 text-sm font-normal">—</span>
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
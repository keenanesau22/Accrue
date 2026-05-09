import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Symptom, Challenge, Tool } from '../types';
import { fetchChallengesForSymptom, fetchToolsForSymptom } from '../services/supabaseService';

interface SymptomLibraryProps {
  filter: 'symptoms' | 'challenges' | 'tools';
}

const SymptomLibrary: React.FC<SymptomLibraryProps> = ({ filter }) => {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [selectedSymptom, setSelectedSymptom] = useState<Symptom | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    const fetchSymptoms = async () => {
      const { data, error } = await supabase
        .from('symptoms')
        .select('*');
      
      if (error) {
        console.error("Error fetching symptoms:", error);
      } else {
        setSymptoms(data || []);
      }
    };

    fetchSymptoms();
  }, []);

  useEffect(() => {
    if (selectedSymptom) {
      const loadRelatedData = async () => {
        const challengesData = await fetchChallengesForSymptom(selectedSymptom.id);
        const toolsData = await fetchToolsForSymptom(selectedSymptom.id);
        setChallenges(challengesData as Challenge[]);
        setTools(toolsData as Tool[]);
      };
      loadRelatedData();
    }
  }, [selectedSymptom]);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold capitalize">{filter} Library</h2>
      <div className="grid grid-cols-1 gap-4">
        {filter === 'symptoms' && symptoms.map(symptom => (
          <button key={symptom.id} onClick={() => setSelectedSymptom(symptom)} className="p-4 bg-white rounded-lg shadow border">
            <h3 className="font-bold">{symptom.name}</h3>
            <p className="text-sm text-gray-600">{symptom.description}</p>
          </button>
        ))}
        {filter === 'challenges' && <p>Challenges list...</p>}
        {filter === 'tools' && <p>Tools list...</p>}
      </div>
      {selectedSymptom && filter === 'symptoms' && (
        <div className="p-6 bg-gray-50 rounded-lg space-y-4">
          <h3 className="text-xl font-bold">{selectedSymptom.name}</h3>
          <p>{selectedSymptom.description}</p>
          <h4 className="font-bold">Challenges</h4>
          <ul>
            {challenges.map(c => <li key={c.id}>{c.title}</li>)}
          </ul>
          <h4 className="font-bold">Tools</h4>
          <ul>
            {tools.map(t => <li key={t.id}>{t.title}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SymptomLibrary;

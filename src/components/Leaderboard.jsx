// components/Leaderboard.jsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Leaderboard({ yearLevel, curriculum }) {
  const [leaders, setLeaders] = useState([]);
  
  useEffect(() => {
    const fetchLeaders = async () => {
      const { data } = await supabase
        .from('scholars')
        .select('codename, xp, year_level, curriculum')
        .eq('year_level', yearLevel)
        .eq('curriculum', curriculum)
        .order('xp', { ascending: false })
        .limit(10);
      
      setLeaders(data || []);
    };
    
    fetchLeaders();
  }, [yearLevel, curriculum]);
  
  return (
    <div className="bg-white rounded-3xl p-6">
      <h3 className="font-black text-xl mb-4">🏆 Top Cadets</h3>
      
      {leaders.map((leader, idx) => (
        <div key={idx} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <span className="font-black text-lg">#{idx + 1}</span>
            <span className="font-bold">{leader.codename}</span>
          </div>
          <span className="text-indigo-600 font-bold">{leader.xp} XP</span>
        </div>
      ))}
    </div>
  );
}
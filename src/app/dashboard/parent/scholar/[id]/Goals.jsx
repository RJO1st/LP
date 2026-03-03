import React, { useState } from 'react';

export default function Goals({ scholarId, goals = [], onAdd, onToggleAchieved }) {
  const [goalType, setGoalType] = useState('proficiency');
  const [target, setTarget] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({ scholar_id: scholarId, goal_type: goalType, target_value: parseInt(target) });
    setTarget('');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h3 className="text-lg font-black mb-4">Weekly Goals</h3>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <select value={goalType} onChange={e => setGoalType(e.target.value)} className="p-2 border rounded">
          <option value="proficiency">Improve topic %</option>
          <option value="quests">Complete quests</option>
          <option value="time">Minutes studied</option>
        </select>
        <input
          type="number"
          placeholder="Target"
          value={target}
          onChange={e => setTarget(e.target.value)}
          className="p-2 border rounded w-24"
          min="1"
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          Add Goal
        </button>
      </form>
      <ul className="space-y-2">
        {goals.map(goal => (
          <li key={goal.id} className={`p-3 rounded-lg border ${goal.achieved ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">{goal.goal_type}: {goal.target_value}</span>
                <span className="text-xs text-slate-400 ml-2">created {new Date(goal.created_at).toLocaleDateString()}</span>
              </div>
              {goal.achieved ? (
                <span className="text-green-600">✓ Achieved</span>
              ) : (
                <button
                  onClick={() => onToggleAchieved(goal.id, true)}
                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                >
                  Mark achieved
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
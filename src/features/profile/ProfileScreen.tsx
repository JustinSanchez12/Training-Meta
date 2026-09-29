import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';
import { ModalOverlay } from '@/components/ModalOverlay';
import { useWorkoutSession } from '@/features/workout/sessionContext';
import { WeightGoalSchema, type Gender, type WeightGoal } from '@/lib/game/schema';
import { getOverallLevel, getTotalLevel } from '@/lib/game/xp';

const AVATARS: Record<Gender, string> = { male: '🧙‍♂️', female: '🧙‍♀️', unspecified: '🧙' };
const GENDER_LABELS: Record<Gender, string> = { male: 'Male', female: 'Female', unspecified: 'Prefer not to say' };
const GOAL_LABELS: Record<WeightGoal, string> = { lose: 'Lose', gain: 'Gain', maintain: 'Maintain' };

export function ProfileScreen() {
  const { save, setWeightGoal, resetCharacter } = usePlayer();
  const { finishing } = useWorkoutSession();
  const navigate = useNavigate();
  const [goalError, setGoalError] = useState<string | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  if (!save) return <Navigate to="/" replace />;
  const { player, stats, dailyStreak, workoutLog } = save;

  async function changeGoal(value: string) {
    const parsed = WeightGoalSchema.safeParse(value);
    if (!parsed.success) return;
    setSavingGoal(true);
    setGoalError(null);
    try {
      await setWeightGoal(parsed.data);
    } catch (error) {
      console.error('[Profile] Failed to save weight goal', error);
      setGoalError("Couldn't save your goal. Try again.");
    } finally {
      setSavingGoal(false);
    }
  }

  async function confirmReset() {
    setResetting(true);
    setResetError(null);
    try {
      await resetCharacter();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('[Profile] Failed to reset character', error);
      setResetError("Couldn't reset your character. Try again.");
      setResetting(false);
    }
  }

  const memberSince = new Date(player.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="screen active">
      <div className="screen-header">
        <Link to="/hub" className="back-btn">
          ← Hub
        </Link>
        <h2>👤 Profile</h2>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar" aria-hidden="true">
            {AVATARS[player.gender]}
          </div>
          <p className="profile-name">{player.name}</p>
          <div className="profile-title">Level {getOverallLevel(stats)} Adventurer</div>
        </div>

        <dl className="profile-stats">
          <ProfileRow label="Total Level" value={getTotalLevel(stats)} />
          <ProfileRow label="Gender" value={GENDER_LABELS[player.gender]} />
          <ProfileRow label="Age" value={player.age} />
          <ProfileRow label="Starting Weight" value={`${player.startWeight} ${player.weightUnit}`} />
          <ProfileRow label="Current Weight" value={`${player.currentWeight} ${player.weightUnit}`} />
          <ProfileRow label="Member Since" value={memberSince} />
          <ProfileRow label="Daily Streak" value={`🔥 ${dailyStreak}`} />
          <ProfileRow label="Workouts Logged" value={workoutLog.length} />
        </dl>

        <fieldset className="goal-fieldset" disabled={savingGoal || finishing}>
          <legend className="goal-legend">Weight Goal</legend>
          <div className="goal-options">
            {WeightGoalSchema.options.map((goal) => (
              <label key={goal} className={`goal-option${player.weightGoal === goal ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="weight-goal"
                  value={goal}
                  checked={player.weightGoal === goal}
                  onChange={(e) => changeGoal(e.target.value)}
                />
                {GOAL_LABELS[goal]}
              </label>
            ))}
          </div>
          {finishing && <p className="form-note">Saving your workout… you can change this in a moment.</p>}
          {goalError && (
            <p className="form-error" role="alert">
              {goalError}
            </p>
          )}
        </fieldset>

        <div className="profile-actions">
          <button type="button" className="btn-danger" onClick={() => setConfirmOpen(true)}>
            Reset Character
          </button>
        </div>
      </div>

      {confirmOpen && (
        <ModalOverlay
          title="Reset character?"
          titleId="reset-title"
          actionLabel={resetting ? 'Resetting…' : 'Reset'}
          cancelLabel="Cancel"
          danger
          actionDisabled={resetting || finishing}
          onAction={confirmReset}
          onClose={() => {
            if (resetting) return;
            setConfirmOpen(false);
            setResetError(null);
          }}
        >
          <p className="overlay-note">All progress will be lost. This can't be undone.</p>
          {finishing && <p className="form-note">A workout is being saved. Try again in a moment.</p>}
          {resetError && (
            <p className="form-error" role="alert">
              {resetError}
            </p>
          )}
        </ModalOverlay>
      )}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="profile-stat-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

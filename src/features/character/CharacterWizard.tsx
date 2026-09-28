import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';
import { CharacterCreatedOverlay } from './CharacterCreatedOverlay';
import type { Gender, WeightUnit } from '@/lib/game/schema';
import { CharacterFormSchema, STEP_FIELDS } from './schema';

const GENDER_OPTIONS = [
  { value: 'male', icon: '🧙‍♂️', label: 'Male' },
  { value: 'female', icon: '🧙‍♀️', label: 'Female' },
  { value: 'unspecified', icon: '🧙', label: 'Prefer Not to Say' },
] as const;

interface FormState {
  name: string;
  gender: Gender | '';
  age: string;
  weight: string;
  weightUnit: WeightUnit;
}

const INITIAL_FORM: FormState = { name: '', gender: '', age: '', weight: '', weightUnit: 'lbs' };

export function CharacterWizard() {
  const { save, createCharacter } = usePlayer();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Checked once on arrival: the save we create below must not trigger this redirect before the overlay shows.
  const [hadCharacterOnArrival] = useState(() => save !== null);

  if (hadCharacterOnArrival) return <Navigate to="/hub" replace />;

  const totalSteps = STEP_FIELDS.length;
  const isLastStep = step === totalSteps - 1;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = CharacterFormSchema.safeParse(form);
    const stepFields: readonly string[] = STEP_FIELDS[step] ?? [];
    const stepIssue = result.error?.issues.find((issue) => stepFields.includes(String(issue.path[0])));
    if (stepIssue) {
      setError(stepIssue.message);
      return;
    }

    if (!isLastStep) {
      setStep(step + 1);
      return;
    }

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please check your details.');
      return;
    }

    setSubmitting(true);
    try {
      await createCharacter(result.data);
      setCreatedName(result.data.name);
    } catch (err) {
      console.error('[CharCreate] Failed to save character', err);
      setError('Could not save your character. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen active">
      <div className="creation-container">
        <h1 className="creation-title">⚔️ Create Your Character</h1>
        <p className="creation-subtitle">
          Step {step + 1} of {totalSteps}
        </p>

        <form className="creation-step active" onSubmit={handleSubmit} noValidate>
          {step === 0 && (
            <>
              <label className="step-label" htmlFor="input-name">
                What is your name, adventurer?
              </label>
              <input
                id="input-name"
                className="input-field"
                type="text"
                placeholder="Enter your name"
                maxLength={20}
                autoComplete="off"
                autoFocus
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </>
          )}

          {step === 1 && (
            <fieldset className="gender-fieldset">
              <legend className="step-label">Choose your identity</legend>
              <div className="gender-selector">
                {GENDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`gender-btn${form.gender === option.value ? ' selected' : ''}`}
                    aria-pressed={form.gender === option.value}
                    onClick={() => update('gender', option.value)}
                  >
                    <span className="gender-icon" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <>
              <label className="step-label" htmlFor="input-age">
                How old are you?
              </label>
              <input
                id="input-age"
                className="input-field"
                type="number"
                placeholder="Enter your age"
                min={1}
                max={120}
                inputMode="numeric"
                autoFocus
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
              />
            </>
          )}

          {step === 3 && (
            <>
              <label className="step-label" htmlFor="input-weight">
                Starting weight
              </label>
              <div className="weight-input-group">
                <input
                  id="input-weight"
                  className="input-field"
                  type="number"
                  placeholder="Enter weight"
                  min={1}
                  step={0.1}
                  inputMode="decimal"
                  autoFocus
                  value={form.weight}
                  onChange={(e) => update('weight', e.target.value)}
                />
                <select
                  className="input-select"
                  aria-label="Weight unit"
                  value={form.weightUnit}
                  onChange={(e) => update('weightUnit', e.target.value === 'kg' ? 'kg' : 'lbs')}
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className={`btn-primary${isLastStep ? ' btn-create' : ''}`} disabled={submitting}>
            {isLastStep ? '⚔️ Create Character' : 'Continue →'}
          </button>
        </form>
      </div>

      {createdName && <CharacterCreatedOverlay name={createdName} onEnterHub={() => navigate('/hub')} />}
    </div>
  );
}

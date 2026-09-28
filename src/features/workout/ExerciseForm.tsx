import { useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { EXERCISE_INPUT_SCHEMAS, type ExerciseInput } from '@/lib/game/exercise';
import { StatKeySchema } from '@/lib/game/schema';
import { STAT_DEFINITIONS, type StatKey } from '@/lib/game/stats';
import { buildExerciseEntry } from '@/lib/game/workout';
import { getExerciseFields } from './fields';
import { useWorkoutSession } from './sessionContext';

/** /workout/:stat: the URL param is validated with Zod; anything that isn't a stat goes back to /workout. */
export function ExerciseForm() {
  const parsed = StatKeySchema.safeParse(useParams().stat);
  if (!parsed.success) return <Navigate to="/workout" replace />;
  // Keyed so switching stats resets the form state.
  return <ExerciseFormFields key={parsed.data} stat={parsed.data} />;
}

function ExerciseFormFields({ stat }: { stat: StatKey }) {
  const { save, addEntry } = useWorkoutSession();
  const navigate = useNavigate();
  const def = STAT_DEFINITIONS[stat];
  const unit = save.player.weightUnit;
  const fields = getExerciseFields(def.xpType, unit);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const [errorSummary, setErrorSummary] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = EXERCISE_INPUT_SCHEMAS[def.xpType].safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        fieldErrors[field] ??= issue.message;
      }
      // Render the errors (aria-invalid + aria-describedby) before moving focus, so the field's error is
      // read on focus. Clearing the summary first makes the live region re-announce on repeat submits.
      flushSync(() => {
        setErrors(fieldErrors);
        setErrorSummary('');
      });
      const count = Object.keys(fieldErrors).length;
      setErrorSummary(count === 1 ? '1 field needs fixing.' : `${count} fields need fixing.`);
      const firstInvalid = fields.find((field) => fieldErrors[field.id]);
      if (firstInvalid) inputs.current.get(firstInvalid.id)?.focus();
      return;
    }

    const input: ExerciseInput = result.data;
    addEntry(buildExerciseEntry(stat, input, { previousWeight: save.player.currentWeight, weightUnit: unit }));
    navigate('/workout');
  }

  return (
    <div className="screen active">
      <div className="exercise-form-wrapper">
        <div className="exercise-form-header">
          <button type="button" className="back-btn" onClick={() => navigate('/workout')}>
            ← Back
          </button>
          <h2 className="exercise-form-title">
            {def.icon} {def.name}
          </h2>
        </div>
        <div className="exercise-form-info">
          <span className="xp-rule">{def.xpDescription}</span>
        </div>

        <form className="exercise-form-fields" onSubmit={handleSubmit} noValidate>
          {fields.map((field, index) => {
            const id = `field-${field.id}`;
            const errorId = `${id}-error`;
            const error = errors[field.id];
            return (
              <div key={field.id} className="form-group">
                <label htmlFor={id}>
                  {field.label}
                  {field.optional && <span className="optional-label"> (optional)</span>}
                </label>
                <input
                  ref={(el) => {
                    if (el) inputs.current.set(field.id, el);
                    else inputs.current.delete(field.id);
                  }}
                  id={id}
                  name={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  step={field.step}
                  inputMode={field.type === 'number' ? 'decimal' : undefined}
                  autoFocus={index === 0}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  value={values[field.id] ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    setValues((prev) => ({ ...prev, [field.id]: value }));
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next[field.id];
                      return next;
                    });
                  }}
                />
                {error && (
                  <p id={errorId} className="form-error">
                    {error}
                  </p>
                )}
              </div>
            );
          })}
          {/* Covers pressing Enter in an already-focused invalid field, where moving focus announces nothing. */}
          <p className="visually-hidden" role="status" aria-live="polite">
            {errorSummary}
          </p>
          <button type="submit" className="btn-primary btn-log">
            ⚔️ Log Exercise
          </button>
        </form>
      </div>
    </div>
  );
}

import { ModalOverlay } from '@/components/ModalOverlay';
import type { LevelUp } from '@/lib/game/workout';

interface LevelUpOverlayProps {
  levelUps: readonly LevelUp[];
  onClose(): void;
}

export function LevelUpOverlay({ levelUps, onClose }: LevelUpOverlayProps) {
  return (
    <ModalOverlay title="⚔️ LEVEL UP! ⚔️" titleId="level-up-title" actionLabel="Continue" onClose={onClose}>
      <ul className="levelup-list">
        {levelUps.map((levelUp) => (
          <li key={levelUp.stat} className="levelup-item">
            <span className="levelup-icon" aria-hidden="true">
              {levelUp.icon}
            </span>
            <span className="levelup-name">{levelUp.name}</span>
            <span className="levelup-levels">
              <span aria-hidden="true">
                {levelUp.previousLevel} → {levelUp.newLevel}
              </span>
              <span className="visually-hidden">
                level {levelUp.previousLevel} to level {levelUp.newLevel}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </ModalOverlay>
  );
}

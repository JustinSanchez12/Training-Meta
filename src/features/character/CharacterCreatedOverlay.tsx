import { ModalOverlay } from '@/components/ModalOverlay';

interface CharacterCreatedOverlayProps {
  name: string;
  onEnterHub(): void;
}

export function CharacterCreatedOverlay({ name, onEnterHub }: CharacterCreatedOverlayProps) {
  return (
    <ModalOverlay
      title="⚔️ CHARACTER CREATED ⚔️"
      titleId="character-created-title"
      actionLabel="Enter the Hub"
      onClose={onEnterHub}
    >
      <div className="levelup-item">
        <span className="levelup-icon" aria-hidden="true">
          🎉
        </span>
        <span className="levelup-name">Welcome, {name}!</span>
        <span className="levelup-levels">All stats: Level 1</span>
      </div>
      <p className="overlay-note">Your adventure begins now.</p>
    </ModalOverlay>
  );
}

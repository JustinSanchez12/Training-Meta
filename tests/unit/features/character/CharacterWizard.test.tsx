import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerProvider } from '@/app/PlayerProvider';
import { CharacterWizard } from '@/features/character/CharacterWizard';
import { HubScreen } from '@/features/hub/HubScreen';
import type { SaveRepository } from '@/lib/storage';
import { legacySave } from '../../fixtures/saves';
import { LocationProbe, WaitForLoad } from '../../helpers/TestHarness';
import { createMemoryRepository } from '../../helpers/memoryRepository';

function renderWizard(repository: SaveRepository, hub: ReactNode = <h1>Hub stub</h1>) {
  const user = userEvent.setup();
  render(
    <PlayerProvider repository={repository}>
      <MemoryRouter initialEntries={['/create']}>
        <WaitForLoad>
          <Routes>
            <Route path="/create" element={<CharacterWizard />} />
            <Route path="/hub" element={hub} />
          </Routes>
          <LocationProbe />
        </WaitForLoad>
      </MemoryRouter>
    </PlayerProvider>,
  );
  return user;
}

const continueButton = () => screen.getByRole('button', { name: /continue/i });

async function completeSteps(user: ReturnType<typeof userEvent.setup>, name = 'Aragorn') {
  await user.type(await screen.findByLabelText(/what is your name/i), name);
  await user.click(continueButton());
  await user.click(await screen.findByRole('button', { name: /female/i }));
  await user.click(continueButton());
  await user.type(await screen.findByLabelText(/how old are you/i), '30');
  await user.click(continueButton());
  await user.type(await screen.findByLabelText(/starting weight/i), '65.5');
  await user.selectOptions(screen.getByLabelText(/weight unit/i), 'kg');
}

describe('CharacterWizard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts on step 1 of 4', async () => {
    renderWizard(createMemoryRepository());
    expect(await screen.findByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create your character/i })).toBeInTheDocument();
  });

  it('does not advance past an empty name and shows an error', async () => {
    const user = renderWizard(createMemoryRepository());
    await screen.findByText('Step 1 of 4');
    await user.click(continueButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your name.');
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('does not advance past a whitespace-only name', async () => {
    const user = renderWizard(createMemoryRepository());
    await user.type(await screen.findByLabelText(/what is your name/i), '   ');
    await user.click(continueButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your name.');
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('clears the error when the input changes', async () => {
    const user = renderWizard(createMemoryRepository());
    await screen.findByText('Step 1 of 4');
    await user.click(continueButton());
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/what is your name/i), 'A');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('requires a gender on step 2', async () => {
    const user = renderWizard(createMemoryRepository());
    await user.type(await screen.findByLabelText(/what is your name/i), 'Aragorn');
    await user.click(continueButton());
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    await user.click(continueButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Please select a gender.');
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();

    const male = screen.getByRole('button', { name: 'Male', pressed: false });
    await user.click(male);
    expect(male).toHaveAttribute('aria-pressed', 'true');
  });

  it('rejects an out-of-range age on step 3', async () => {
    const user = renderWizard(createMemoryRepository());
    await user.type(await screen.findByLabelText(/what is your name/i), 'Aragorn');
    await user.click(continueButton());
    await user.click(screen.getByRole('button', { name: /prefer not to say/i }));
    await user.click(continueButton());
    await user.type(screen.getByLabelText(/how old are you/i), '121');
    await user.click(continueButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid age.');
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
  });

  it('rejects a zero weight on the last step without saving', async () => {
    const repo = createMemoryRepository();
    const user = renderWizard(repo);
    await user.type(await screen.findByLabelText(/what is your name/i), 'Aragorn');
    await user.click(continueButton());
    await user.click(screen.getByRole('button', { name: /female/i }));
    await user.click(continueButton());
    await user.type(screen.getByLabelText(/how old are you/i), '30');
    await user.click(continueButton());
    await user.type(screen.getByLabelText(/starting weight/i), '0');
    await user.click(screen.getByRole('button', { name: /create character/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid weight.');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('saves the character and shows the CHARACTER CREATED overlay without redirecting', async () => {
    const repo = createMemoryRepository();
    const user = renderWizard(repo);
    await completeSteps(user, '  Aragorn  ');
    await user.click(screen.getByRole('button', { name: /create character/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('CHARACTER CREATED');
    expect(dialog).toHaveTextContent('Welcome, Aragorn!');
    // Regression: the new save must not trigger the "already has a character" redirect.
    expect(screen.getByTestId('location')).toHaveTextContent('/create');
    expect(screen.queryByRole('heading', { name: 'Hub stub' })).not.toBeInTheDocument();

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0]?.[0];
    expect(saved?.player).toMatchObject({
      name: 'Aragorn',
      gender: 'female',
      age: 30,
      startWeight: 65.5,
      currentWeight: 65.5,
      weightUnit: 'kg',
      isNewPlayer: false,
    });
  });

  it('goes to the Hub when "Enter the Hub" is clicked', async () => {
    const user = renderWizard(createMemoryRepository());
    await completeSteps(user);
    await user.click(screen.getByRole('button', { name: /create character/i }));
    await user.click(await screen.findByRole('button', { name: /enter the hub/i }));
    expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/hub');
  });

  it('the overlay is a modal dialog that focuses "Enter the Hub" and traps Tab', async () => {
    const user = renderWizard(createMemoryRepository());
    await completeSteps(user);
    await user.click(screen.getByRole('button', { name: /create character/i }));
    const dialog = await screen.findByRole('dialog', { name: '⚔️ CHARACTER CREATED ⚔️' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const enter = screen.getByRole('button', { name: /enter the hub/i });
    expect(enter).toHaveFocus();
    await user.tab();
    expect(enter).toHaveFocus();
    await user.tab({ shift: true });
    expect(enter).toHaveFocus();
  });

  it('goes to the Hub when Escape is pressed on the overlay', async () => {
    const user = renderWizard(createMemoryRepository());
    await completeSteps(user);
    await user.click(screen.getByRole('button', { name: /create character/i }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/hub');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
  });

  describe('focus after leaving the overlay for the real Hub', () => {
    async function createAndOpenOverlay() {
      const user = renderWizard(createMemoryRepository(), <HubScreen />);
      await completeSteps(user);
      await user.click(screen.getByRole('button', { name: /create character/i }));
      await screen.findByRole('dialog', { name: '⚔️ CHARACTER CREATED ⚔️' });
      return user;
    }

    it('"Enter the Hub" lands focus on the Hub h1, not <body>', async () => {
      const user = await createAndOpenOverlay();
      await user.click(screen.getByRole('button', { name: /enter the hub/i }));
      const heading = await screen.findByRole('heading', { level: 1, name: 'Aragorn' });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(document.body).not.toHaveFocus();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    });

    it('Escape lands focus on the Hub h1, not <body>', async () => {
      const user = await createAndOpenOverlay();
      await user.keyboard('{Escape}');
      const heading = await screen.findByRole('heading', { level: 1, name: 'Aragorn' });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(screen.getByTestId('location')).toHaveTextContent('/hub');
    });
  });

  it('shows an error and no overlay when saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const repo = createMemoryRepository();
    repo.save.mockRejectedValueOnce(new Error('quota exceeded'));
    const user = renderWizard(repo);
    await completeSteps(user);
    await user.click(screen.getByRole('button', { name: /create character/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your character. Please try again.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /create character/i })).toBeEnabled());
  });

  it('redirects to the Hub when a character already exists on arrival', async () => {
    renderWizard(createMemoryRepository(legacySave()));
    expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
  });
});

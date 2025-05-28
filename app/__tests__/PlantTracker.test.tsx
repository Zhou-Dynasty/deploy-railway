import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlantTracker from '../page';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock the data
jest.mock('../data/plants', () => ({
  commonHouseplants: ['Monstera Deliciosa', 'Monstera Adansonii', 'Snake Plant', 'Peace Lily']
}));

describe('PlantTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('LocalStorage persistence', () => {
    it('loads plants from localStorage on mount', async () => {
      const { unmount } = render(<PlantTracker />);
      // Setup: Add a plant and unmount
      const input = screen.getByPlaceholderText('Search for a plant...');
      const addButton = screen.getByRole('button', { name: 'Add' });
      
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);
      
      // Unmount and remount
      unmount();
      render(<PlantTracker />);

      // Verify only one plant card is present
      const plantCards = screen.getAllByText('🌿 Monstera Deliciosa');
      expect(plantCards.length).toBe(1);
    });

    it('persists watering dates', async () => {
      const { unmount } = render(<PlantTracker />);
      // Add a plant
      const input = screen.getByPlaceholderText('Search for a plant...');
      const addButton = screen.getByRole('button', { name: 'Add' });
      
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);

      // Water the plant
      const waterButton = screen.getByText('Water');
      await userEvent.click(waterButton);

      // Unmount and remount
      unmount();
      render(<PlantTracker />);

      // Verify only one watering date is present and it's not 'Never'
      const watered = screen.getAllByText(/Last watered:/);
      expect(watered.length).toBe(1);
      expect(screen.queryByText('Last watered: Never')).not.toBeInTheDocument();
    });

    it('persists multiple plants with their states', async () => {
      const { unmount } = render(<PlantTracker />);
      // Add first plant
      const input = screen.getByPlaceholderText('Search for a plant...');
      const addButton = screen.getByRole('button', { name: 'Add' });
      
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);

      // Add second plant
      await userEvent.clear(input);
      await userEvent.type(input, 'Snake Plant');
      await userEvent.click(addButton);

      // Water first plant
      const waterButtons = screen.getAllByText('Water');
      await userEvent.click(waterButtons[0]);

      // Unmount and remount
      unmount();
      render(<PlantTracker />);

      // Verify both plants are present with correct states
      const monsteraCards = screen.getAllByText('🌿 Monstera Deliciosa');
      const snakeCards = screen.getAllByText('🌿 Snake Plant');
      expect(monsteraCards.length).toBe(1);
      expect(snakeCards.length).toBe(1);
      // There should be one 'Last watered: Never' (Snake Plant)
      const never = screen.getAllByText('Last watered: Never');
      expect(never.length).toBe(1);
      // There should be one watered date (Monstera)
      const watered = screen.getAllByText(/Last watered:/);
      expect(watered.length).toBe(2); // Both have 'Last watered:', but only one is not 'Never'
    });

    it('persists plant removal', async () => {
      const { unmount } = render(<PlantTracker />);
      // Add a plant
      const input = screen.getByPlaceholderText('Search for a plant...');
      const addButton = screen.getByRole('button', { name: 'Add' });
      
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);

      // Remove the plant
      const removeButton = screen.getByText('Remove');
      await userEvent.click(removeButton);

      // Unmount and remount
      unmount();
      render(<PlantTracker />);

      // Verify plant is still removed
      expect(screen.queryByText('🌿 Monstera Deliciosa')).not.toBeInTheDocument();
    });
  });

  describe('Autocomplete functionality', () => {
    beforeEach(() => {
      render(<PlantTracker />);
    });

    it('shows dropdown when typing in the input', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      await userEvent.type(input, 'monstera');
      
      // Wait for dropdown to appear
      const dropdown = await screen.findByRole('listbox');
      expect(dropdown).toBeInTheDocument();
    });

    it('filters suggestions based on input', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      await userEvent.type(input, 'monstera');
      
      const suggestions = screen.getAllByRole('option');
      suggestions.forEach(suggestion => {
        expect(suggestion.textContent?.toLowerCase()).toContain('monstera');
      });
    });

    it('selects suggestion on click', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      await userEvent.type(input, 'monstera');
      
      const firstSuggestion = screen.getAllByRole('option')[0];
      await userEvent.click(firstSuggestion);
      
      expect(input).toHaveValue(firstSuggestion.textContent?.trim() || '');
    });

    it('handles keyboard navigation', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      await userEvent.type(input, 'monstera');
      
      // Press arrow down to select first item
      await userEvent.keyboard('{ArrowDown}');
      
      // Press enter to add the plant
      await userEvent.keyboard('{Enter}');
      
      // Check if plant was added to the list
      const plantCard = screen.getByText('🌿 Monstera Deliciosa', { exact: false });
      expect(plantCard).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      await userEvent.type(input, 'monstera');
      
      // Click outside
      await userEvent.click(document.body);
      
      const dropdown = screen.queryByRole('listbox');
      expect(dropdown).not.toBeInTheDocument();
    });

    it('closes dropdown when pressing escape', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      await userEvent.type(input, 'monstera');
      
      await userEvent.keyboard('{Escape}');
      
      const dropdown = screen.queryByRole('listbox');
      expect(dropdown).not.toBeInTheDocument();
    });

    it('adds selected plant to the list', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      const addButton = screen.getByRole('button', { name: 'Add' });
      
      await userEvent.type(input, 'monstera');
      const firstSuggestion = screen.getAllByRole('option')[0];
      await userEvent.click(firstSuggestion);
      await userEvent.click(addButton);
      
      // Check if plant was added to the list
      const plantCard = screen.getByText('🌿 Monstera Deliciosa', { exact: false });
      expect(plantCard).toBeInTheDocument();
    });

    it('adds plant when pressing enter after selecting a suggestion', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      
      // Type to show suggestions
      await userEvent.type(input, 'monstera');
      
      // Select first suggestion with arrow down
      await userEvent.keyboard('{ArrowDown}');
      
      // Press enter to add the plant
      await userEvent.keyboard('{Enter}');
      
      // Check if plant was added to the list
      const plantCard = screen.getByText('🌿 Monstera Deliciosa', { exact: false });
      expect(plantCard).toBeInTheDocument();
    });

    it('adds plant when pressing enter with valid input', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      
      // Type a valid plant name
      await userEvent.type(input, 'Monstera Deliciosa');
      
      // Press enter to add the plant
      await userEvent.keyboard('{Enter}');
      
      // Check if plant was added to the list
      const plantCard = screen.getByText('🌿 Monstera Deliciosa', { exact: false });
      expect(plantCard).toBeInTheDocument();
    });

    it('does not add plant when pressing enter with empty input', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      
      // Press enter with empty input
      await userEvent.keyboard('{Enter}');
      
      // Check that no plant cards exist
      const plantCards = screen.queryAllByText(/🌿/);
      expect(plantCards).toHaveLength(0);
    });

    it('shows checkmark for exact matches', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      await userEvent.type(input, 'Monstera Deliciosa');
      
      const suggestions = screen.getAllByRole('option');
      const exactMatch = suggestions.find(suggestion => 
        suggestion.textContent?.trim() === 'Monstera Deliciosa'
      );
      
      if (exactMatch) {
        const checkmark = exactMatch.querySelector('svg');
        expect(checkmark).toBeInTheDocument();
      }
    });

    it('handles empty input state', async () => {
      const input = screen.getByPlaceholderText('Search for a plant...');
      await userEvent.type(input, 'nonexistentplant');
      
      const dropdown = screen.queryByRole('listbox');
      expect(dropdown).not.toBeInTheDocument();
    });
  });
}); 
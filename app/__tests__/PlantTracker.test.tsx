import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlantTracker from '../page';

// Mock the data
jest.mock('../data/plants', () => ({
  commonHouseplants: ['Monstera Deliciosa', 'Monstera Adansonii', 'Snake Plant', 'Peace Lily']
}));

describe('PlantTracker', () => {
  beforeEach(() => {
    render(<PlantTracker />);
  });

  describe('Autocomplete functionality', () => {
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
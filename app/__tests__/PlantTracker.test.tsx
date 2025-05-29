import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlantTracker from '../page';
import { translations } from '../translations';

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
jest.mock('../data/plants.en', () => ({
  commonHouseplants: ['Monstera Deliciosa', 'Monstera Adansonii', 'Snake Plant', 'Peace Lily']
}));
jest.mock('../data/plants.zh', () => ({
  commonHouseplants: ['Monstera Deliciosa', '龟背竹', '孔雀竹芋', '虎尾兰', '和平百合']
}));

describe('PlantTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Language switching', () => {
    it('defaults to Chinese', () => {
      render(<PlantTracker />);
      expect(screen.getByText(translations.zh.title)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(translations.zh.searchPlaceholder)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: translations.zh.addButton })).toBeInTheDocument();
    });

    it('switches between languages', async () => {
      render(<PlantTracker />);
      
      // Initially in Chinese
      expect(screen.getByText(translations.zh.title)).toBeInTheDocument();
      
      // Switch to English
      const languageButton = screen.getByRole('button', { name: 'English' });
      await userEvent.click(languageButton);
      
      // Check English translations
      expect(screen.getByText(translations.en.title)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(translations.en.searchPlaceholder)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: translations.en.addButton })).toBeInTheDocument();
      
      // Switch back to Chinese
      await userEvent.click(screen.getByRole('button', { name: '中文' }));
      
      // Check Chinese translations again
      expect(screen.getByText(translations.zh.title)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(translations.zh.searchPlaceholder)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: translations.zh.addButton })).toBeInTheDocument();
    });
  });

  describe('LocalStorage persistence', () => {
    it('loads plants from localStorage on mount', async () => {
      const { unmount } = render(<PlantTracker />);
      // Setup: Add a plant and unmount
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      
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
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);

      // Water the plant
      const waterButton = screen.getByText(translations.zh.waterButton);
      await userEvent.click(waterButton);

      // Unmount and remount
      unmount();
      render(<PlantTracker />);

      // Verify only one watering date is present and it's not 'Never'
      const watered = screen.getAllByText(new RegExp(translations.zh.lastWatered));
      expect(watered.length).toBe(1);
      expect(screen.queryByText(`${translations.zh.lastWatered} ${translations.zh.never}`)).not.toBeInTheDocument();
    });

    it('persists multiple plants with their states', async () => {
      const { unmount } = render(<PlantTracker />);
      // Add first plant
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);

      // Add second plant
      await userEvent.clear(input);
      await userEvent.type(input, 'Snake Plant');
      await userEvent.click(addButton);

      // Water first plant
      const waterButtons = screen.getAllByText(translations.zh.waterButton);
      await userEvent.click(waterButtons[0]);

      // Unmount and remount
      unmount();
      render(<PlantTracker />);

      // Verify both plants are present with correct states
      const monsteraCards = screen.getAllByText('🌿 Monstera Deliciosa');
      const snakeCards = screen.getAllByText('🌿 Snake Plant');
      expect(monsteraCards.length).toBe(1);
      expect(snakeCards.length).toBe(1);
      // There should be one 'Never' (Snake Plant)
      const never = screen.getAllByText(`${translations.zh.lastWatered} ${translations.zh.never}`);
      expect(never.length).toBe(1);
      // There should be one watered date (Monstera)
      const watered = screen.getAllByText(new RegExp(translations.zh.lastWatered));
      expect(watered.length).toBe(2); // Both have 'Last watered:', but only one is not 'Never'
    });

    it('persists plant removal', async () => {
      const { unmount } = render(<PlantTracker />);
      // Add a plant
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);

      // Remove the plant
      const removeButton = screen.getByText(translations.zh.removeButton);
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
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      await userEvent.type(input, 'monstera');
      // Click the chevron to open dropdown
      const chevron = screen.getByTestId('chevron');
      await userEvent.click(chevron);
      // Wait for dropdown to appear
      const dropdown = await screen.findByRole('listbox');
      expect(dropdown).toBeInTheDocument();
    });

    it('filters suggestions based on input', async () => {
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      await userEvent.type(input, 'monstera');
      // Click the chevron to open dropdown
      const chevron = screen.getByTestId('chevron');
      await userEvent.click(chevron);
      const suggestions = screen.getAllByRole('option');
      suggestions.forEach(suggestion => {
        expect(suggestion.textContent?.toLowerCase()).toContain('monstera');
      });
    });

    it('selects suggestion on click', async () => {
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      await userEvent.type(input, 'monstera');
      // Click the chevron to open dropdown
      const chevron = screen.getByTestId('chevron');
      await userEvent.click(chevron);
      const firstSuggestion = screen.getAllByRole('option')[0];
      await userEvent.click(firstSuggestion);
      expect(input).toHaveValue(firstSuggestion.textContent?.trim() || '');
    });

    it('handles keyboard navigation', async () => {
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      await userEvent.type(input, 'monstera');
      
      // Press arrow down to select first item
      await userEvent.keyboard('{ArrowDown}');
      
      // Press enter to add the plant
      await userEvent.keyboard('{Enter}');
      
      // Check if plant was added to the list
      const plantCard = screen.getByText('🌿 monstera', { exact: false });
      expect(plantCard).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      await userEvent.type(input, 'monstera');
      
      // Click outside
      await userEvent.click(document.body);
      
      const dropdown = screen.queryByRole('listbox');
      expect(dropdown).not.toBeInTheDocument();
    });

    it('closes dropdown when pressing escape', async () => {
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      await userEvent.type(input, 'monstera');
      
      await userEvent.keyboard('{Escape}');
      
      const dropdown = screen.queryByRole('listbox');
      expect(dropdown).not.toBeInTheDocument();
    });

    it('adds selected plant to the list', async () => {
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      await userEvent.type(input, 'monstera');
      // Click the chevron to open dropdown
      const chevron = screen.getByTestId('chevron');
      await userEvent.click(chevron);
      const firstSuggestion = screen.getAllByRole('option')[0];
      await userEvent.click(firstSuggestion);
      await userEvent.click(addButton);
      // Check if plant was added to the list
      const plantCard = screen.getByText('🌿 monstera', { exact: false });
      expect(plantCard).toBeInTheDocument();
    });

    it('adds plant when pressing enter after selecting a suggestion', async () => {
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      
      // Type to show suggestions
      await userEvent.type(input, 'monstera');
      
      // Select first suggestion with arrow down
      await userEvent.keyboard('{ArrowDown}');
      
      // Press enter to add the plant
      await userEvent.keyboard('{Enter}');
      
      // Check if plant was added to the list
      const plantCard = screen.getByText('🌿 monstera', { exact: false });
      expect(plantCard).toBeInTheDocument();
    });

    it('adds plant when pressing enter with valid input', async () => {
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      
      // Type a valid plant name
      await userEvent.type(input, 'Monstera Deliciosa');
      
      // Press enter to add the plant
      await userEvent.keyboard('{Enter}');
      
      // Check if plant was added to the list
      const plantCard = screen.getByText('🌿 Monstera Deliciosa', { exact: false });
      expect(plantCard).toBeInTheDocument();
    });

    it('does not add plant when pressing enter with empty input', async () => {
      // Press enter with empty input
      await userEvent.keyboard('{Enter}');
      
      // Check that no plant was added
      expect(screen.queryByText('🌿')).not.toBeInTheDocument();
    });
  });

  describe('Watering reminder functionality', () => {
    // Helper to mock Date globally
    let RealDate: DateConstructor;
    beforeAll(() => {
      RealDate = Date;
    });
    afterEach(() => {
      global.Date = RealDate;
      localStorage.clear();
    });

    function mockDate(isoDate: string) {
      const fixedTime = new RealDate(isoDate).getTime();
      // @ts-ignore
      global.Date = function(...args: any[]) {
        if (args.length === 0) {
          return new RealDate(fixedTime);
        }
        if (args[0] instanceof RealDate) {
          return new RealDate(args[0].getTime());
        }
        return new RealDate(...(args as ConstructorParameters<typeof Date>));
      } as unknown as DateConstructor;
    }

    it('shows "never watered" status for new plants', async () => {
      render(<PlantTracker />);
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);
      await screen.findByText(translations.zh.neverWatered);
      expect(screen.getByText(translations.zh.neverWatered)).toBeInTheDocument();
    });

    it('shows "needs watering" status when past due date', async () => {
      mockDate('2024-03-20T12:00:00Z');
      const { unmount } = render(<PlantTracker />);
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);
      await screen.findByText('🌿 Monstera Deliciosa');
      const waterButton = screen.getByText(translations.zh.waterButton);
      mockDate('2024-03-12T12:00:00Z');
      await userEvent.click(waterButton);
      mockDate('2024-03-20T12:00:00Z');
      unmount();
      render(<PlantTracker />);
      await screen.findByText(translations.zh.needsWatering);
      expect(screen.getByText(translations.zh.needsWatering)).toBeInTheDocument();
    });

    it('shows warning status when within 2 days of due date', async () => {
      mockDate('2024-03-20T12:00:00Z');
      const { unmount } = render(<PlantTracker />);
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);
      await screen.findByText('🌿 Monstera Deliciosa');
      const waterButton = screen.getByText(translations.zh.waterButton);
      mockDate('2024-03-15T12:00:00Z');
      await userEvent.click(waterButton);
      mockDate('2024-03-20T12:00:00Z');
      unmount();
      render(<PlantTracker />);
      const expectedText = `${translations.zh.daysUntilWatering} 2`;
      await screen.findByText(expectedText);
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('shows normal status when well before due date', async () => {
      mockDate('2024-03-20T12:00:00Z');
      const { unmount } = render(<PlantTracker />);
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);
      await screen.findByText('🌿 Monstera Deliciosa');
      const waterButton = screen.getByText(translations.zh.waterButton);
      mockDate('2024-03-18T12:00:00Z');
      await userEvent.click(waterButton);
      mockDate('2024-03-20T12:00:00Z');
      unmount();
      render(<PlantTracker />);
      const expectedText = `${translations.zh.daysUntilWatering} 5`;
      await screen.findByText(expectedText);
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('shows different frequencies for different plants', async () => {
      mockDate('2024-03-20T12:00:00Z');
      const { unmount } = render(<PlantTracker />);
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);
      await screen.findByText('🌿 Monstera Deliciosa');
      await userEvent.clear(input);
      await userEvent.type(input, 'Snake Plant');
      await userEvent.click(addButton);
      await screen.findByText('🌿 Snake Plant');
      const waterButtons = screen.getAllByText(translations.zh.waterButton);
      mockDate('2024-03-13T12:00:00Z');
      // Water Monstera Deliciosa
      await userEvent.click(waterButtons[0]);
      // Water Snake Plant
      await userEvent.click(waterButtons[1]);
      mockDate('2024-03-20T12:00:00Z');
      unmount();
      render(<PlantTracker />);
      // Monstera Deliciosa should show "needs watering"
      await screen.findByText(translations.zh.needsWatering);
      expect(screen.getByText(translations.zh.needsWatering)).toBeInTheDocument();
      // Snake Plant should show "7 days until next watering"
      await screen.findByText(`${translations.zh.daysUntilWatering} 7`);
      expect(screen.getByText(`${translations.zh.daysUntilWatering} 7`)).toBeInTheDocument();
    });

    it('persists watering schedule after page reload', async () => {
      mockDate('2024-03-20T12:00:00Z');
      const { unmount } = render(<PlantTracker />);
      const input = screen.getByPlaceholderText(translations.zh.searchPlaceholder);
      const addButton = screen.getByRole('button', { name: translations.zh.addButton });
      await userEvent.type(input, 'Monstera Deliciosa');
      await userEvent.click(addButton);
      await screen.findByText('🌿 Monstera Deliciosa');
      const waterButton = screen.getByText(translations.zh.waterButton);
      mockDate('2024-03-13T12:00:00Z');
      await userEvent.click(waterButton);
      mockDate('2024-03-20T12:00:00Z');
      unmount();
      render(<PlantTracker />);
      await screen.findByText(translations.zh.needsWatering);
      expect(screen.getByText(translations.zh.needsWatering)).toBeInTheDocument();
    });
  });
}); 
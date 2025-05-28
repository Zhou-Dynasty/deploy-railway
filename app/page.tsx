'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { commonHouseplants } from './data/plants';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plant {
  name: string;
  lastWatered: Date | null;
}

export default function PlantTracker() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [newPlant, setNewPlant] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load plants from localStorage on mount
  useEffect(() => {
    const savedPlants = localStorage.getItem('plants');
    if (savedPlants) {
      const parsedPlants = JSON.parse(savedPlants).map((plant: any) => ({
        ...plant,
        lastWatered: plant.lastWatered ? new Date(plant.lastWatered) : null
      }));
      setPlants(parsedPlants);
    }
  }, []);

  // Save plants to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('plants', JSON.stringify(plants));
  }, [plants]);

  // Ensure unique plant names for suggestions
  const uniqueHouseplants = Array.from(new Set(commonHouseplants));

  const filteredPlants = uniqueHouseplants.filter((plant) =>
    plant.toLowerCase().includes(newPlant.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addPlant = () => {
    if (!newPlant.trim()) return;
    setPlants([...plants, { name: newPlant, lastWatered: null }]);
    setNewPlant('');
    setOpen(false);
  };

  const waterPlant = (index: number) => {
    const updated = [...plants];
    updated[index].lastWatered = new Date();
    setPlants(updated);
  };

  const removePlant = (index: number) => {
    const updated = plants.filter((_, i) => i !== index);
    setPlants(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      if (!open) setOpen(true);
      
      const newIndex = activeIndex === null ? 0 : 
        e.key === 'ArrowDown' 
          ? (activeIndex + 1) % filteredPlants.length
          : (activeIndex - 1 + filteredPlants.length) % filteredPlants.length;
      
      setActiveIndex(newIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && activeIndex !== null && filteredPlants[activeIndex]) {
        const selectedPlant = filteredPlants[activeIndex];
        setNewPlant(selectedPlant);
        setOpen(false);
        // Add the plant immediately after selecting
        setPlants([...plants, { name: selectedPlant, lastWatered: null }]);
        setNewPlant('');
      } else if (newPlant.trim()) {
        addPlant();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 max-w-xl mx-auto w-full min-h-screen bg-background">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">🌱 Plant Watering Tracker</h1>
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <div className="relative">
            <Input
              ref={inputRef}
              className="w-full rounded-md border border-input bg-background px-3 py-3 text-base sm:text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search for a plant..."
              value={newPlant}
              onChange={(e) => {
                setNewPlant(e.target.value);
                setOpen(e.target.value.trim() !== '');
                setActiveIndex(null);
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              className="absolute right-2 top-3 sm:top-2.5 p-1"
              onClick={() => setOpen(!open)}
              data-testid="chevron"
            >
              <ChevronsUpDown className="h-5 w-5 sm:h-4 sm:w-4 opacity-50" />
            </button>
          </div>
          {open && filteredPlants.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md"
              style={{ maxHeight: '300px', overflowY: 'auto' }}
              role="listbox"
            >
              {filteredPlants.map((plant, index) => (
                <div
                  key={plant + '-' + index}
                  onClick={() => {
                    setNewPlant(plant);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={activeIndex === index}
                  data-testid={`suggestion-${plant}`}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 sm:py-1.5 text-base sm:text-sm outline-none",
                    activeIndex === index && "bg-accent text-accent-foreground"
                  )}
                >
                  <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                    {newPlant === plant && <Check className="h-4 w-4" />}
                  </span>
                  <span>{plant}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button className="w-full sm:w-auto py-3 sm:py-2 text-base sm:text-sm" onClick={addPlant}>Add</Button>
      </div>

      <div className="grid gap-4">
        {plants.map((plant, i) => (
          <Card key={i} className="rounded-xl border bg-card text-card-foreground shadow">
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <div>
                <div className="font-medium text-lg sm:text-base break-words">🌿 {plant.name}</div>
                <div className="text-sm sm:text-xs text-muted-foreground">
                  Last watered: {plant.lastWatered ? format(plant.lastWatered, 'PPPpp') : 'Never'}
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none py-3 sm:py-2 text-base sm:text-sm" onClick={() => waterPlant(i)}>Water</Button>
                <Button variant="destructive" className="flex-1 sm:flex-none py-3 sm:py-2 text-base sm:text-sm" onClick={() => removePlant(i)}>Remove</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

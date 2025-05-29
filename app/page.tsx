'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { commonHouseplants as enHouseplants } from './data/plants.en';
import { commonHouseplants as zhHouseplants } from './data/plants.zh';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWateringRecommendation, WateringInfo } from './utils/gemini';
import { translations, Language } from './translations';

interface Plant {
  name: string;
  lastWatered: Date | null;
  wateringInfo?: WateringInfo;
}

export default function PlantTracker() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [newPlant, setNewPlant] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loadingPlant, setLoadingPlant] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage || 'zh';
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

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

  // Save plants and language to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('plants', JSON.stringify(plants));
  }, [plants]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Select the correct plant list based on language
  const houseplants = language === 'zh' ? zhHouseplants : enHouseplants;

  // Ensure unique plant names for suggestions
  const uniqueHouseplants = Array.from(new Set(houseplants));

  // For displaying plant names in the current language
  const displayPlantName = (name: string) => {
    return name;
  };

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

  const addPlant = async (plantNameOverride?: string) => {
    const plantName = (plantNameOverride ?? newPlant).trim();
    if (!plantName) return;
    setLoadingPlant(plantName);
    try {
      const wateringInfo = await getWateringRecommendation(plantName, language);
      setPlants([...plants, { 
        name: plantName, 
        lastWatered: null,
        wateringInfo 
      }]);
    } catch (error) {
      setPlants([...plants, { 
        name: plantName, 
        lastWatered: null 
      }]);
    } finally {
      setLoadingPlant(null);
      setNewPlant('');
      setOpen(false);
    }
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
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      if (!open) setOpen(true);
      const newIndex = activeIndex === null ? 0 :
        e.key === "ArrowDown"
          ? (activeIndex + 1) % filteredPlants.length
          : (activeIndex - 1 + filteredPlants.length) % filteredPlants.length;
      setActiveIndex(newIndex);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex !== null && filteredPlants[activeIndex]) {
        const selectedPlant = filteredPlants[activeIndex];
        setNewPlant(selectedPlant);
        setOpen(false);
        // Add the plant immediately after selecting, using the selected suggestion
        addPlant(selectedPlant);
      } else if (newPlant.trim()) {
        addPlant();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const getDaysUntilNextWatering = (plant: Plant): number | null => {
    if (!plant.lastWatered || !plant.wateringInfo) {
      return null;
    }
    
    const lastWatered = new Date(plant.lastWatered);
    const nextWatering = new Date(lastWatered);
    nextWatering.setDate(lastWatered.getDate() + plant.wateringInfo.frequency);
    
    const today = new Date();
    const diffTime = nextWatering.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getWateringStatus = (plant: Plant): { text: string; className: string } => {
    const daysUntil = getDaysUntilNextWatering(plant);
    
    if (!plant.lastWatered) {
      return { text: t.neverWatered, className: 'text-yellow-500' };
    }
    
    if (daysUntil === null) {
      return { text: t.noSchedule, className: 'text-gray-500' };
    }
    
    if (daysUntil <= 0) {
      return { text: t.needsWatering, className: 'text-red-500' };
    }
    
    if (daysUntil <= 2) {
      return { text: t.daysUntilWatering.replace('{days}', daysUntil.toString()), className: 'text-orange-500' };
    }
    
    return { text: t.daysUntilWatering.replace('{days}', daysUntil.toString()), className: 'text-green-500' };
  };

  return (
    <div className="p-2 sm:p-4 max-w-xl mx-auto w-full min-h-screen bg-background">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-center">{t.title}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
        >
          {language === 'en' ? '中文' : 'English'}
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <div className="relative">
            <Input
              ref={inputRef}
              className="w-full rounded-md border border-input bg-background px-3 py-3 text-base sm:text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t.searchPlaceholder}
              value={newPlant}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setNewPlant(e.target.value);
                setOpen(true);
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
              aria-label="Plant suggestions"
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
        <Button 
          className="w-full sm:w-auto py-3 sm:py-2 text-base sm:text-sm" 
          onClick={() => addPlant()}
          disabled={loadingPlant !== null}
        >
          {loadingPlant ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.addingButton}
            </>
          ) : (
            t.addButton
          )}
        </Button>
      </div>

      <div className="grid gap-4">
        {plants.map((plant, i) => (
          <Card key={i} className="rounded-xl border bg-card text-card-foreground shadow">
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <div>
                <div className="font-medium text-lg sm:text-base break-words">🌿 {displayPlantName(plant.name)}</div>
                <div className="text-sm sm:text-xs text-muted-foreground">
                  {t.lastWatered} {plant.lastWatered ? format(plant.lastWatered, 'PPPpp') : t.never}
                </div>
                {plant.wateringInfo && (
                  <div className="text-sm sm:text-xs text-muted-foreground mt-1">
                    💧 {plant.wateringInfo.description}
                  </div>
                )}
                <div className={`text-sm sm:text-xs mt-1 ${getWateringStatus(plant).className}`}>
                  {getWateringStatus(plant).text}
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none py-3 sm:py-2 text-base sm:text-sm" onClick={() => waterPlant(i)}>{t.waterButton}</Button>
                <Button variant="destructive" className="flex-1 sm:flex-none py-3 sm:py-2 text-base sm:text-sm" onClick={() => removePlant(i)}>{t.removeButton}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

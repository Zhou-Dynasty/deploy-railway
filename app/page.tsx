'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface Plant {
  name: string;
  lastWatered: Date | null;
}

export default function PlantTracker() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [newPlant, setNewPlant] = useState('');

  const addPlant = () => {
    if (!newPlant.trim()) return;
    setPlants([...plants, { name: newPlant, lastWatered: null }]);
    setNewPlant('');
  };

  const waterPlant = (index: number) => {
    const updated = [...plants];
    updated[index].lastWatered = new Date();
    setPlants(updated);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🌱 Plant Watering Tracker</h1>
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Add a new plant"
          value={newPlant}
          onChange={(e) => setNewPlant(e.target.value)}
        />
        <Button onClick={addPlant}>Add</Button>
      </div>

      <div className="grid gap-4">
        {plants.map((plant, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium text-lg">🌿 {plant.name}</div>
                <div className="text-sm text-muted-foreground">
                  Last watered: {plant.lastWatered ? format(plant.lastWatered, 'PPPpp') : 'Never'}
                </div>
              </div>
              <Button variant="outline" onClick={() => waterPlant(i)}>Water</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

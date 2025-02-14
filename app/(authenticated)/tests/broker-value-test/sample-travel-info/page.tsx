'use client';

import React, { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';

const TravelInfoCollector = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [ageRange, setAgeRange] = useState("");
  const [otherAge, setOtherAge] = useState("");
  const [hotelChoice, setHotelChoice] = useState("");
  const [otherHotel, setOtherHotel] = useState("");
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [otherActivity, setOtherActivity] = useState("");

  const hotels = [
    { id: 1, name: "Grand Hotel" },
    { id: 2, name: "Seaside Resort" },
    { id: 3, name: "City Center Hotel" },
    { id: 4, name: "Boutique Inn" },
  ];

  const activities = [
    { id: "dining", label: "Dining" },
    { id: "entertainment", label: "Entertainment" },
    { id: "tours", label: "Tours" },
    { id: "indoor", label: "Indoor Activities" },
    { id: "outdoor", label: "Outdoor Activities" },
    { id: "other", label: "Other" },
  ];

  const handleActivityChange = (id) => {
    setSelectedActivities(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSubmit = () => {
    setIsOpen(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="text-2xl">Plan Your Perfect Trip</CardTitle>
              <CardDescription>Tell us about your travel plans</CardDescription>
            </div>
            {isOpen ? (
              <ChevronUp className="h-6 w-6" />
            ) : (
              <ChevronDown className="h-6 w-6" />
            )}
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent className="p-4 space-y-6">
          <div className="grid gap-4">
            {/* Travelers Information */}
            <div className="space-y-2">
              <Label htmlFor="travelers">Who is going on the trip?</Label>
              <Textarea
                id="travelers"
                placeholder="List all travelers..."
                className="resize-none h-20"
              />
            </div>

            {/* Event/Purpose */}
            <div className="space-y-2">
              <Label htmlFor="event">Event or Purpose</Label>
              <Input
                id="event"
                placeholder="e.g., Business Conference, Family Vacation..."
              />
            </div>

            {/* Age Range */}
            <div className="space-y-2">
              <Label>Age Range of Attendees</Label>
              <RadioGroup
                onValueChange={setAgeRange}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {["Under 21", "21-24", "25-30", "40's", "Over 50", "Other"].map((range) => (
                  <div key={range} className="flex items-center space-x-2">
                    <RadioGroupItem value={range} id={range} />
                    <Label htmlFor={range} className="cursor-pointer">
                      {range}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {ageRange === "Other" && (
                <Input
                  placeholder="Specify age range..."
                  value={otherAge}
                  onChange={(e) => setOtherAge(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Hotel Selection */}
            <div className="space-y-2">
              <Label>Location of Stay</Label>
              <Select value={hotelChoice} onValueChange={setHotelChoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id.toString()}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {hotelChoice === "other" && (
                <Input
                  placeholder="Enter hotel or accommodation..."
                  value={otherHotel}
                  onChange={(e) => setOtherHotel(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Activities */}
            <div className="space-y-3">
              <Label>What would you like to learn about?</Label>
              <div className="grid grid-cols-2 gap-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={activity.id}
                      checked={selectedActivities.includes(activity.id)}
                      onCheckedChange={() => handleActivityChange(activity.id)}
                    />
                    <Label htmlFor={activity.id} className="cursor-pointer">
                      {activity.label}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedActivities.includes("other") && (
                <Input
                  placeholder="What else interests you?"
                  value={otherActivity}
                  onChange={(e) => setOtherActivity(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className="w-full mt-4"
            >
              Get Personalized Recommendations
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TravelInfoCollector;
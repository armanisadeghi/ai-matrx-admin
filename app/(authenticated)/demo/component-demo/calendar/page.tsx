// File Location: '@/app/demo/calendar/page.tsx'
'use client';

import {useState, useEffect} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {MatrxCalendar} from '@/components/ui/samples';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from '@/components/ui/select';
import TextDivider from '@/components/matrx/TextDivider';

export default function DemoPage() {
    const [basicDate, setBasicDate] = useState<Date | undefined>(undefined);
    const [advancedDate, setAdvancedDate] = useState<Date | Date[] | undefined>(undefined);
    const [calendarProps, setCalendarProps] = useState({
        mode: 'single' as 'single' | 'multiple' | 'range',
        weekStartsOn: 0 as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        numberOfMonths: 1,
        showOutsideDays: true,
        showWeekNumbers: false,
        animationLevel: 'basic' as 'none' | 'basic' | 'moderate' | 'enhanced',
        showTime: false,
        is24Hour: false,
        minuteIncrement: 1,
    });

    useEffect(() => {
        setBasicDate(new Date());
        setAdvancedDate(new Date());
    }, []);

    const handleAdvancedDateChange = (newValue: Date | Date[] | undefined) => {
        setAdvancedDate(newValue);
    };

    const handleCalendarPropChange = (key: string, value: any) => {
        setCalendarProps((prevState) => ({
            ...prevState,
            [key]: value,
        }));
    };

    // State for all variations
    const [singleDate, setSingleDate] = useState<Date | undefined>(new Date());
    const [rangeDate, setRangeDate] = useState<Date[] | undefined>(undefined);
    const [multipleDates, setMultipleDates] = useState<Date[]>([]);
    const [dateWithTime, setDateWithTime] = useState<Date | undefined>(new Date());

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Demo of the MatrxCalendar Component</h1>

            <Tabs defaultValue="basic" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="basic">Basic Example</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Example</TabsTrigger>
                    <TabsTrigger value="all">All Variations</TabsTrigger>
                </TabsList>

                {/* Basic Example Tab */}
                <TabsContent value="basic">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Calendar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MatrxCalendar
                                value={basicDate}
                                onChange={(date) => setBasicDate(date as Date)}
                            />
                        </CardContent>
                    </Card>
                    {/* State Display Card */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({ basicDate: basicDate?.toISOString() }, null, 2)}</pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Advanced Example Tab */}
                <TabsContent value="advanced">
                    <div className="grid grid-cols-4 gap-4">
                        {/* Controls Card */}
                        <div className="col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Controls</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Mode</label>
                                            <Select
                                                value={calendarProps.mode}
                                                onValueChange={(value: 'single' | 'multiple' | 'range') => handleCalendarPropChange('mode', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="single">Single</SelectItem>
                                                    <SelectItem value="multiple">Multiple</SelectItem>
                                                    <SelectItem value="range">Range</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Week Starts On</label>
                                            <Select
                                                value={calendarProps.weekStartsOn.toString()}
                                                onValueChange={(value) => handleCalendarPropChange('weekStartsOn', parseInt(value))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">Sunday</SelectItem>
                                                    <SelectItem value="1">Monday</SelectItem>
                                                    <SelectItem value="2">Tuesday</SelectItem>
                                                    <SelectItem value="3">Wednesday</SelectItem>
                                                    <SelectItem value="4">Thursday</SelectItem>
                                                    <SelectItem value="5">Friday</SelectItem>
                                                    <SelectItem value="6">Saturday</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Number of Months</label>
                                            <Select
                                                value={calendarProps.numberOfMonths.toString()}
                                                onValueChange={(value) => handleCalendarPropChange('numberOfMonths', parseInt(value))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1</SelectItem>
                                                    <SelectItem value="2">2</SelectItem>
                                                    <SelectItem value="3">3</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Show Outside Days</label>
                                            <input
                                                type="checkbox"
                                                checked={calendarProps.showOutsideDays}
                                                onChange={(e) => handleCalendarPropChange('showOutsideDays', e.target.checked)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Show Week Numbers</label>
                                            <input
                                                type="checkbox"
                                                checked={calendarProps.showWeekNumbers}
                                                onChange={(e) => handleCalendarPropChange('showWeekNumbers', e.target.checked)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Animation Level</label>
                                            <Select
                                                value={calendarProps.animationLevel}
                                                onValueChange={(value: 'none' | 'basic' | 'moderate' | 'enhanced') => handleCalendarPropChange('animationLevel', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    <SelectItem value="basic">Basic</SelectItem>
                                                    <SelectItem value="moderate">Moderate</SelectItem>
                                                    <SelectItem value="enhanced">Enhanced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Show Time</label>
                                            <input
                                                type="checkbox"
                                                checked={calendarProps.showTime}
                                                onChange={(e) => handleCalendarPropChange('showTime', e.target.checked)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">24 Hour Format</label>
                                            <input
                                                type="checkbox"
                                                checked={calendarProps.is24Hour}
                                                onChange={(e) => handleCalendarPropChange('is24Hour', e.target.checked)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Minute Increment</label>
                                            <Select
                                                value={calendarProps.minuteIncrement.toString()}
                                                onValueChange={(value) => handleCalendarPropChange('minuteIncrement', parseInt(value))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1</SelectItem>
                                                    <SelectItem value="5">5</SelectItem>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="15">15</SelectItem>
                                                    <SelectItem value="30">30</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Advanced Calendar</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MatrxCalendar
                                        value={advancedDate}
                                        onChange={handleAdvancedDateChange}
                                        {...calendarProps}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* State Display Card */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({advancedDate, ...calendarProps}, null, 2)}</pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* All Variations Tab */}
                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Variations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TextDivider text="Single Date Selection"/>
                            <MatrxCalendar
                                value={singleDate}
                                onChange={(date) => setSingleDate(date as Date)}
                                mode="single"
                            />

                            <TextDivider text="Range Selection"/>
                            <MatrxCalendar
                                value={rangeDate}
                                onChange={(dates) => setRangeDate(dates as Date[])}
                                mode="range"
                            />

                            <TextDivider text="Multiple Date Selection"/>
                            <MatrxCalendar
                                value={multipleDates}
                                onChange={(dates) => setMultipleDates(dates as Date[])}
                                mode="multiple"
                            />

                            <TextDivider text="With Time Selection"/>
                            <MatrxCalendar
                                value={dateWithTime}
                                onChange={(date) => setDateWithTime(date as Date)}
                                mode="single"
                                showTime
                                is24Hour
                            />
                        </CardContent>
                    </Card>

                    {/* State Display Card */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({
                                singleDate,
                                rangeDate,
                                multipleDates,
                                dateWithTime
                            }, null, 2)}</pre>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

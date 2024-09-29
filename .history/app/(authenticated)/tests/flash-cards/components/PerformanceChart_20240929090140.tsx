import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Sector } from 'recharts';
import { ChartConfig, ChartContainer, ChartStyle, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

interface PerformanceChartProps {
    totalCorrect: number;
    totalIncorrect: number;
}

const chartConfig = {
    correct: {
        label: "Correct",
        color: "hsl(var(--success))",
    },
    incorrect: {
        label: "Incorrect",
        color: "hsl(var(--destructive))",
    },
} satisfies ChartConfig;

const PerformanceChart: React.FC<PerformanceChartProps> = ({ totalCorrect, totalIncorrect }) => {
    const [prevTotal, setPrevTotal] = useState(totalCorrect + totalIncorrect);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const newTotal = totalCorrect + totalIncorrect;
        if (newTotal !== prevTotal) {
            setShouldAnimate(true);
            setPrevTotal(newTotal);
        }
    }, [totalCorrect, totalIncorrect, prevTotal]);

    const total = totalCorrect + totalIncorrect;
    const correctPercentage = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

    const pieData = [
        { name: 'correct', value: totalCorrect, fill: chartConfig.correct.color },
        { name: 'incorrect', value: totalIncorrect, fill: chartConfig.incorrect.color },
    ];

    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
      
        return (
          <g>
            <Sector
              cx={cx}
              cy={cy}
              innerRadius={innerRadius}
              outerRadius={outerRadius + 10}
              startAngle={startAngle}
              endAngle={endAngle}
              fill={fill}
            />
            <Sector
              cx={cx}
              cy={cy}
              startAngle={startAngle}
              endAngle={endAngle}
              innerRadius={outerRadius + 12}
              outerRadius={outerRadius + 25}
              fill={fill}
            />
          </g>
        );
    };

    return (
        <Card className="w-full h-full flex flex-col hover:scale-105 transition-transform shadow-lg">
            <ChartStyle id="flashcard-pie" config={chartConfig} />
            <CardHeader>
                <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
                <motion.div 
                    className="flex justify-around mb-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{total}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Correct</p>
                        <p className={cn("text-2xl font-bold", chartConfig.correct.color)}>{totalCorrect}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Incorrect</p>
                        <p className={cn("text-2xl font-bold", chartConfig.incorrect.color)}>{totalIncorrect}</p>
                    </div>
                </motion.div>
                <ChartContainer id="flashcard-pie" config={chartConfig} className="w-full flex-grow">
                    <PieChart width={300} height={300}>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="50%"
                            outerRadius="80%"
                            paddingAngle={5}
                            animationBegin={0}
                            animationDuration={1500}
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <AnimatePresence>
                            {shouldAnimate && (
                                <motion.g
                                    key={correctPercentage}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ duration: 0.5 }}
                                    onAnimationComplete={() => setShouldAnimate(false)}
                                >
                                    <text
                                        x={150}
                                        y={150}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                    >
                                        <tspan
                                            x={150}
                                            y={150}
                                            className="fill-foreground text-3xl font-bold"
                                        >
                                            {correctPercentage}%
                                        </tspan>
                                        <tspan
                                            x={150}
                                            y={174}
                                            className="fill-foreground text-sm"
                                        >
                                            Correct
                                        </tspan>
                                    </text>
                                </motion.g>
                            )}
                        </AnimatePresence>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};

export default PerformanceChart;
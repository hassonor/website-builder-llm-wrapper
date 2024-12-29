import React, {memo} from 'react';
import {CheckCircle, Circle, Clock} from 'lucide-react';
import {Step} from '../types';

interface StepsListProps {
    steps: Step[];
    currentStep: number;
    onStepClick: (stepId: number) => void;
}

/**
 * Renders a list of steps and their statuses.
 */
function StepsListComponent({steps, currentStep, onStepClick}: StepsListProps) {
    return (
        <div className="bg-gray-900 rounded-lg shadow-lg p-4 h-full overflow-auto">
            <h2 className="text-lg font-semibold mb-4 text-gray-100">Build Steps</h2>
            <div className="space-y-4">
                {steps.map((step) => {
                    const isActive = currentStep === step.id;
                    const containerClasses = `p-1 rounded-lg cursor-pointer transition-colors ${
                        isActive ? 'bg-gray-800 border border-gray-700' : 'hover:bg-gray-800'
                    }`;

                    let Icon = Circle;
                    let iconColor = 'text-gray-600';

                    if (step.status === 'completed') {
                        Icon = CheckCircle;
                        iconColor = 'text-green-500';
                    } else if (step.status === 'in-progress') {
                        Icon = Clock;
                        iconColor = 'text-blue-400';
                    }

                    return (
                        <div
                            key={step.id}
                            className={containerClasses}
                            onClick={() => onStepClick(step.id)}
                        >
                            <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 ${iconColor}`}/>
                                <h3 className="font-medium text-gray-100">{step.title}</h3>
                            </div>
                            <p className="text-sm text-gray-400 mt-2">{step.description}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export const StepsList = memo(StepsListComponent);

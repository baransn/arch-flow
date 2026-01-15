'use client';

import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import type { ArchitectureAnalysis } from '@/lib/types';

interface DiagramViewerProps {
  analysis: ArchitectureAnalysis;
}

export default function DiagramViewer({ analysis }: DiagramViewerProps) {
  const [selectedFlow, setSelectedFlow] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const diagramRef = useRef<HTMLDivElement>(null);
  const stepsPanelRef = useRef<HTMLDivElement>(null);
  const [mermaidInitialized, setMermaidInitialized] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        primaryColor: '#3b82f6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#2563eb',
        lineColor: '#9ca3af',
        secondaryColor: '#10b981',
        tertiaryColor: '#8b5cf6',
        background: '#1f2937',
        mainBkg: '#374151',
        secondBkg: '#4b5563',
        textColor: '#f3f4f6',
        edgeLabelBackground: '#374151',
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      securityLevel: 'loose',
    });
    setMermaidInitialized(true);
  }, []);

  // Render diagram when it changes
  useEffect(() => {
    if (mermaidInitialized && diagramRef.current) {
      const renderDiagram = async () => {
        try {
          const { svg } = await mermaid.render('mermaid-diagram', analysis.diagram);
          if (diagramRef.current) {
            diagramRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Error rendering Mermaid diagram:', error);
        }
      };
      renderDiagram();
    }
  }, [analysis.diagram, mermaidInitialized]);

  // Animation logic
  useEffect(() => {
    if (!isAnimating || !analysis.flows || analysis.flows.length === 0) {
      return;
    }

    const flow = analysis.flows[selectedFlow];
    if (!flow || !flow.steps) {
      return;
    }

    let stepIndex = currentStep > 0 ? currentStep - 1 : 0;
    let timeoutId: NodeJS.Timeout;

    const animateStep = async () => {
      // Check if paused
      if (isPaused) {
        animationTimeoutRef.current = setTimeout(animateStep, 100);
        return;
      }

      if (stepIndex >= flow.steps.length) {
        setIsAnimating(false);
        setCurrentStep(0);
        return;
      }

      const step = flow.steps[stepIndex];
      setCurrentStep(stepIndex + 1);

      // Scroll active step into view
      scrollToActiveStep(stepIndex + 1);

      // Clear previous highlights before adding new ones
      clearHighlights();

      // Highlight nodes and arrows sequentially (await ensures no overlap)
      await highlightNode(step.node, step.duration, step.step);

      stepIndex++;
      timeoutId = setTimeout(animateStep, step.duration);
      animationTimeoutRef.current = timeoutId;
    };

    animateStep();

    return () => {
      clearHighlights();
      if (timeoutId) clearTimeout(timeoutId);
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    };
  }, [isAnimating, selectedFlow, analysis.flows, isPaused, currentStep]);

  const scrollToActiveStep = (stepNumber: number) => {
    const stepElement = document.getElementById(`step-${stepNumber}`);
    if (stepElement && stepsPanelRef.current) {
      stepElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  };

  const clearHighlights = () => {
    if (!diagramRef.current) return;

    // Clear all node highlights
    const nodes = diagramRef.current.querySelectorAll('.node');
    nodes.forEach((node) => {
      const shape = node.querySelector('rect') || node.querySelector('circle') || node.querySelector('polygon');
      if (shape) {
        (shape as SVGElement).setAttribute('filter', 'none');
        (shape as SVGElement).setAttribute('transform', 'scale(1)');
      }
    });

    // Clear all arrow highlights
    const arrows = diagramRef.current.querySelectorAll('.flowchart-link, .edgePath path');
    arrows.forEach((arrow) => {
      (arrow as SVGElement).style.stroke = '';
      (arrow as SVGElement).style.strokeWidth = '';
      (arrow as SVGElement).style.filter = 'none';
      (arrow as SVGElement).style.strokeDasharray = 'none';
      (arrow as SVGElement).style.strokeDashoffset = '0';
    });
  };

  const highlightArrow = (stepNumber: number, duration: number) => {
    if (!diagramRef.current) return;

    // Arrows are indexed from 0, steps from 1
    const arrowIndex = stepNumber - 1;

    // Try different selectors to find arrows
    const allPaths = diagramRef.current.querySelectorAll('.flowchart-link');
    let targetPath = allPaths[arrowIndex];

    if (!targetPath) {
      const edgePaths = diagramRef.current.querySelectorAll('.edgePath path, path.path');
      targetPath = edgePaths[arrowIndex] as SVGElement;
    }

    if (targetPath) {
      const arrow = targetPath as SVGElement;
      const originalStroke = arrow.style.stroke || arrow.getAttribute('stroke') || '#333';
      const originalStrokeWidth = arrow.style.strokeWidth || arrow.getAttribute('stroke-width') || '2';

      // Highlight the arrow
      arrow.style.stroke = '#F59E0B';
      arrow.style.strokeWidth = '4px';
      arrow.style.filter = 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))';
      arrow.style.transition = 'all 0.2s ease';

      // Animate with dashing effect
      arrow.style.strokeDasharray = '10 5';
      let offset = 0;
      const animInterval = setInterval(() => {
        offset -= 2;
        arrow.style.strokeDashoffset = `${offset}px`;
      }, 30);

      // Reset after duration
      setTimeout(() => {
        clearInterval(animInterval);
        arrow.style.stroke = originalStroke;
        arrow.style.strokeWidth = originalStrokeWidth;
        arrow.style.filter = 'none';
        arrow.style.strokeDasharray = 'none';
        arrow.style.strokeDashoffset = '0';
      }, duration);
    }
  };

  const highlightNode = (nodeName: string, duration: number, stepNumber?: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!diagramRef.current) {
        resolve();
        return;
      }

      // Highlight arrow if step number provided
      if (stepNumber !== undefined) {
        highlightArrow(stepNumber, duration);
      }

      const nodes = diagramRef.current.querySelectorAll('.node');
      let found = false;

      // Try to find the node by matching the name (case-insensitive, prioritize exact/prefix match)
      const normalizedName = nodeName.toLowerCase().trim();

      nodes.forEach((node) => {
        const label = node.querySelector('.nodeLabel');
        if (label) {
          const labelText = label.textContent?.toLowerCase().trim() || '';

          // Remove emojis and extra whitespace for better matching
          const cleanLabel = labelText.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();

          // Match if the label starts with the search term (after emoji removal)
          // This handles cases like:
          // - nodeName="Client" matches "Client React SPA"
          // - nodeName="Chat Service" matches "Chat Service Message Handling"
          // But avoids:
          // - nodeName="Chat" matching "Channels Group Chat"
          const words = normalizedName.split(/\s+/);
          const labelWords = cleanLabel.split(/\s+/);

          // Check if the first N words of the label match the search term
          const matches = words.every((word, idx) => labelWords[idx] === word);

          if (matches) {
            const shape = node.querySelector('rect') || node.querySelector('circle') || node.querySelector('polygon');
            if (shape) {
              found = true;
              // Add highlight
              (shape as SVGElement).setAttribute('filter', 'drop-shadow(0 0 20px rgba(231, 76, 60, 0.9))');
              (shape as SVGElement).setAttribute('transform', 'scale(1.1)');
              (shape as SVGElement).style.transformOrigin = 'center';
              (shape as SVGElement).style.transition = 'all 0.3s ease';

              // Remove after duration
              setTimeout(() => {
                (shape as SVGElement).setAttribute('filter', 'none');
                (shape as SVGElement).setAttribute('transform', 'scale(1)');
                resolve();
              }, duration);
            }
          }
        }
      });

      if (!found) {
        // If no match found, just resolve
        console.warn(`Node not found: ${nodeName}`);
        setTimeout(() => resolve(), duration);
      }
    });
  };

  const handleStartAnimation = () => {
    setCurrentStep(0);
    setIsPaused(false);
    setIsAnimating(true);
  };

  const handleStopAnimation = () => {
    setIsAnimating(false);
    setIsPaused(false);
    setCurrentStep(0);
    clearHighlights();
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const handlePreviousStep = async () => {
    if (!analysis.flows || analysis.flows.length === 0) return;
    const flow = analysis.flows[selectedFlow];
    if (!flow || !flow.steps) return;

    const newStep = Math.max(1, currentStep - 1);
    setCurrentStep(newStep);

    // Clear and highlight the previous step
    clearHighlights();
    const step = flow.steps[newStep - 1];
    scrollToActiveStep(newStep);
    await highlightNode(step.node, 5000, step.step); // 5 second highlight for manual control
  };

  const handleNextStep = async () => {
    if (!analysis.flows || analysis.flows.length === 0) return;
    const flow = analysis.flows[selectedFlow];
    if (!flow || !flow.steps) return;

    const newStep = Math.min(flow.steps.length, currentStep + 1);
    setCurrentStep(newStep);

    // Clear and highlight the next step
    clearHighlights();
    const step = flow.steps[newStep - 1];
    scrollToActiveStep(newStep);
    await highlightNode(step.node, 5000, step.step); // 5 second highlight for manual control
  };

  return (
    <div className="space-y-6">
      {/* Flow Selection */}
      {analysis.flows && analysis.flows.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Available Flows</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysis.flows.map((flow, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedFlow(index);
                  setIsAnimating(false);
                  setCurrentStep(0);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedFlow === index
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <h3 className="font-semibold">{flow.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {flow.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content: Diagram + Step Panel */}
      <div className="flex gap-6 min-h-[600px]">
        {/* Diagram Section (Left) */}
        <div className="flex-[2] bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Architecture Diagram</h2>
            <div className="flex gap-2">
              {/* Play/Stop Button */}
              <button
                onClick={isAnimating ? handleStopAnimation : handleStartAnimation}
                disabled={!analysis.flows || analysis.flows.length === 0}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isAnimating ? '⏹ Stop' : '▶ Play'}
              </button>

              {/* Playback Controls (only visible when animating) */}
              {isAnimating && (
                <>
                  <button
                    onClick={handlePauseToggle}
                    className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition-all"
                  >
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                  <button
                    onClick={handlePreviousStep}
                    disabled={currentStep <= 1}
                    className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ⏮ Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={!analysis.flows || currentStep >= analysis.flows[selectedFlow].steps.length}
                    className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ⏭ Forward
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mermaid Diagram */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 overflow-auto">
            <div ref={diagramRef} className="flex items-center justify-center min-h-full" />
          </div>

          {/* Status */}
          {isAnimating && analysis.flows && analysis.flows[selectedFlow] && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Animating: {analysis.flows[selectedFlow].name}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Step {currentStep} of {analysis.flows[selectedFlow].steps.length}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Step Panel (Right) */}
        {analysis.flows && analysis.flows.length > 0 && analysis.flows[selectedFlow] && (
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col overflow-hidden">
            <h2 className="text-2xl font-bold mb-4 pb-3 border-b-4 border-blue-500 flex-shrink-0">
              Flow Steps
            </h2>
            <div ref={stepsPanelRef} className="flex-1 overflow-y-auto space-y-4">
              {analysis.flows[selectedFlow].steps.map((step, index) => {
                const isActive = isAnimating && currentStep === index + 1;
                const isCompleted = currentStep > index + 1;

                return (
                  <div
                    key={index}
                    id={`step-${index + 1}`}
                    className={`p-4 rounded-lg border-l-4 transition-all duration-300 ${
                      isActive
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 shadow-lg transform translate-x-1'
                        : isCompleted
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                        : 'bg-gray-50 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white flex-shrink-0 ${
                          isActive
                            ? 'bg-yellow-500'
                            : isCompleted
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}
                      >
                        {step.step}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 dark:text-gray-100 mb-2">
                          {step.node}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {step.message}
                        </div>
                        {step.request && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 px-3 py-2 rounded text-xs font-mono mt-2">
                            📤 {step.request}
                          </div>
                        )}
                        {step.response && (
                          <div className="bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 px-3 py-2 rounded text-xs font-mono mt-2">
                            📥 {step.response}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
